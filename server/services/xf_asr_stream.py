"""讯飞 ASR 流式语音识别 — 用于 WebSocket 实时语音管线

与 xf_asr.py 的区别：
- xf_asr.py: 接收完整音频 → 一次性发送 → 返回结果（适合 HTTP 上传）
- 本模块: 持续接收音频块 → 实时转发 → 累积结果 → 最终返回（适合 WebSocket 流式）
"""

import asyncio
import base64
import hashlib
import hmac
import json
import logging
import ssl
from datetime import datetime
from time import mktime
from urllib.parse import urlencode
from wsgiref.handlers import format_date_time

import websockets

from config import settings

logger = logging.getLogger("asr_stream")

_HOST = "iat.xf-yun.com"
_PATH = "/v1"
_ENDPOINT = f"wss://{_HOST}{_PATH}"
_FRAME_SIZE = 2560


def _build_auth_url() -> str:
    now = datetime.now()
    date = format_date_time(mktime(now.timetuple()))
    signature_origin = f"host: {_HOST}\ndate: {date}\nGET {_PATH} HTTP/1.1"
    signature_sha = hmac.new(
        settings.xf_api_secret.encode("utf-8"),
        signature_origin.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).digest()
    signature = base64.b64encode(signature_sha).decode("utf-8")
    authorization_origin = (
        f'api_key="{settings.xf_api_key}", algorithm="hmac-sha256", '
        f'headers="host date request-line", signature="{signature}"'
    )
    authorization = base64.b64encode(authorization_origin.encode("utf-8")).decode("utf-8")
    params = urlencode({"authorization": authorization, "date": date, "host": _HOST})
    return f"{_ENDPOINT}?{params}"


class StreamingASR:
    """流式 ASR 会话：持续接收音频块，实时转发讯飞，最终返回识别文本。

    Usage:
        asr = StreamingASR()
        await asr.start()
        await asr.feed(chunk1)
        await asr.feed(chunk2)
        text = await asr.finish()
    """

    def __init__(self):
        self._ws = None
        self._result_text = ""
        self._recv_task: asyncio.Task | None = None
        self._first_frame_sent = False
        self._finished = asyncio.Event()

    async def start(self):
        """建立与讯飞 ASR 的 WebSocket 连接"""
        url = _build_auth_url()
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        self._ws = await websockets.connect(url, ssl=ssl_context)
        self._recv_task = asyncio.create_task(self._receive_loop())

    async def feed(self, pcm_chunk: bytes):
        """灌入一块 PCM 音频数据（16kHz 16bit mono）"""
        if self._ws is None:
            return

        offset = 0
        while offset < len(pcm_chunk):
            frame = pcm_chunk[offset:offset + _FRAME_SIZE]
            audio_b64 = base64.b64encode(frame).decode("utf-8")
            offset += _FRAME_SIZE

            if not self._first_frame_sent:
                await self._ws.send(json.dumps({
                    "header": {"status": 0, "app_id": settings.xf_app_id},
                    "parameter": {
                        "iat": {
                            "domain": "slm",
                            "language": "zh_cn",
                            "accent": "mandarin",
                            "eos": 5000,
                            "ptt": 1,
                            "nunum": 1,
                            "result": {"encoding": "utf8", "compress": "raw", "format": "json"},
                        }
                    },
                    "payload": {
                        "audio": {"audio": audio_b64, "sample_rate": 16000, "encoding": "raw"}
                    },
                }))
                self._first_frame_sent = True
            else:
                await self._ws.send(json.dumps({
                    "header": {"status": 1, "app_id": settings.xf_app_id},
                    "payload": {
                        "audio": {"audio": audio_b64, "sample_rate": 16000, "encoding": "raw"}
                    },
                }))

    async def finish(self) -> str:
        """发送结束帧并等待最终识别结果"""
        if self._ws is None:
            return ""

        # 发送末帧
        await self._ws.send(json.dumps({
            "header": {"status": 2, "app_id": settings.xf_app_id},
            "payload": {
                "audio": {"audio": "", "sample_rate": 16000, "encoding": "raw"}
            },
        }))

        # 等待接收完毕
        try:
            await asyncio.wait_for(self._finished.wait(), timeout=10)
        except asyncio.TimeoutError:
            logger.warning("ASR stream timeout waiting for final result")

        await self._cleanup()
        return self._result_text

    async def cancel(self):
        """取消当前会话"""
        await self._cleanup()

    async def _receive_loop(self):
        """后台持续接收讯飞 ASR 返回的识别结果"""
        try:
            async for msg in self._ws:
                data = json.loads(msg)
                code = data.get("header", {}).get("code", -1)
                if code != 0:
                    logger.error(f"ASR stream error: code={code}, data={data}")
                    break

                payload = data.get("payload")
                if payload and "result" in payload:
                    text_b64 = payload["result"]["text"]
                    self._result_text += self._parse_result(text_b64)

                if data.get("header", {}).get("status") == 2:
                    break
        except Exception as e:
            logger.error(f"ASR stream recv error: {e}")
        finally:
            self._finished.set()

    @staticmethod
    def _parse_result(text_b64: str) -> str:
        decoded = json.loads(base64.b64decode(text_b64).decode("utf-8"))
        result = ""
        for ws in decoded.get("ws", []):
            for cw in ws.get("cw", []):
                result += cw["w"]
        return result

    async def _cleanup(self):
        if self._recv_task and not self._recv_task.done():
            self._recv_task.cancel()
        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass
            self._ws = None
