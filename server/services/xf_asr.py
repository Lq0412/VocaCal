"""讯飞 ASR 语音识别 — 中英识别大模型 WebSocket"""

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

logger = logging.getLogger("xf_asr")

# 中英识别大模型（用户已开通）
_HOST = "iat.xf-yun.com"
_PATH = "/v1"
_ENDPOINT = f"wss://{_HOST}{_PATH}"

# 每帧音频大小和发送间隔
_FRAME_SIZE = 2560
_FRAME_INTERVAL = 0.01


def _build_auth_url() -> str:
    """生成带鉴权参数的 WebSocket URL"""
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


def _build_first_frame(audio_b64: str) -> str:
    """首帧：含 parameter 配置"""
    return json.dumps({
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
    })


def _build_continue_frame(audio_b64: str) -> str:
    """中间帧"""
    return json.dumps({
        "header": {"status": 1, "app_id": settings.xf_app_id},
        "payload": {
            "audio": {"audio": audio_b64, "sample_rate": 16000, "encoding": "raw"}
        },
    })


def _build_last_frame(audio_b64: str) -> str:
    """末帧"""
    return json.dumps({
        "header": {"status": 2, "app_id": settings.xf_app_id},
        "payload": {
            "audio": {"audio": audio_b64, "sample_rate": 16000, "encoding": "raw"}
        },
    })


def _parse_result(text_b64: str) -> str:
    """解析 base64 编码的识别结果 → 拼接文字"""
    decoded = json.loads(base64.b64decode(text_b64).decode("utf-8"))
    result = ""
    for ws in decoded.get("ws", []):
        for cw in ws.get("cw", []):
            result += cw["w"]
    return result


async def recognize(audio_bytes: bytes) -> str:
    """
    将音频 bytes 发送到讯飞 ASR，返回识别文字。
    音频格式：PCM 16kHz 16bit mono（WAV 格式会自动跳过 44 字节头）
    """
    # 跳过 WAV header
    if audio_bytes[:4] == b"RIFF":
        audio_bytes = audio_bytes[44:]

    url = _build_auth_url()
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    result_text = ""

    async with websockets.connect(url, ssl=ssl_context) as ws:
        offset = 0
        status = 0  # 0=首帧, 1=中间帧, 2=末帧

        while offset < len(audio_bytes):
            chunk = audio_bytes[offset : offset + _FRAME_SIZE]
            audio_b64 = base64.b64encode(chunk).decode("utf-8")
            offset += _FRAME_SIZE

            if status == 0:
                await ws.send(_build_first_frame(audio_b64))
                status = 1
            else:
                await ws.send(_build_continue_frame(audio_b64))

            # 对于已录制好的完整音频，不需要模拟实时音频流的停顿，
            # 直接全速发送可大幅降低识别延迟。
            await asyncio.sleep(0)

        # 发送末帧（空音频）
        await ws.send(_build_last_frame(""))

        # 接收所有响应
        while True:
            msg = await asyncio.wait_for(ws.recv(), timeout=10)
            data = json.loads(msg)

            code = data.get("header", {}).get("code", -1)
            if code != 0:
                raise RuntimeError(f"讯飞 ASR 错误: code={code}, msg={data}")

            payload = data.get("payload")
            if payload and "result" in payload:
                text_b64 = payload["result"]["text"]
                result_text += _parse_result(text_b64)

            if data.get("header", {}).get("status") == 2:
                break

    return result_text


class StreamingASRSession:
    """流式 ASR 会话：音频块逐帧转发讯飞，边收边识别。

    用于 WebSocket 端点：录音的同时就把 PCM 块发给讯飞，
    用户松手时 ASR 可能已经识别完毕，大幅降低延迟。
    """

    def __init__(self):
        self._ws = None
        self._first_sent = False
        self._text = ""
        self._done = asyncio.Event()

    async def start(self):
        """建立讯飞 ASR WebSocket 连接，启动后台接收协程"""
        url = _build_auth_url()
        ssl_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        self._ws = await websockets.connect(url, ssl=ssl_ctx)
        asyncio.create_task(self._recv_loop())
        logger.info("StreamingASR started")

    async def send_chunk(self, pcm: bytes):
        """发送一个 PCM 音频块到讯飞"""
        if not self._ws:
            return
        audio_b64 = base64.b64encode(pcm).decode("utf-8")
        if not self._first_sent:
            await self._ws.send(_build_first_frame(audio_b64))
            self._first_sent = True
        else:
            await self._ws.send(_build_continue_frame(audio_b64))

    async def finish(self) -> str:
        """结束音频输入，等待最终识别结果并返回完整文本"""
        if not self._ws:
            return ""
        await self._ws.send(_build_last_frame(""))
        await self._done.wait()
        await self._ws.close()
        logger.info(f"StreamingASR finished: {self._text!r}")
        return self._text

    async def _recv_loop(self):
        """后台接收讯飞返回的识别结果，累加文本"""
        try:
            while True:
                msg = await asyncio.wait_for(self._ws.recv(), timeout=15)
                data = json.loads(msg)
                code = data.get("header", {}).get("code", -1)
                if code != 0:
                    logger.error(f"ASR error: code={code}")
                    break
                payload = data.get("payload")
                if payload and "result" in payload:
                    self._text += _parse_result(payload["result"]["text"])
                if data.get("header", {}).get("status") == 2:
                    break
        except asyncio.TimeoutError:
            logger.error("ASR recv timeout")
        except Exception as e:
            logger.error(f"ASR recv error: {e}")
        finally:
            self._done.set()
