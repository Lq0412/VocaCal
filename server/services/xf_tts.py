"""讯飞 TTS 语音合成 — 在线语音合成 WebSocket"""

import asyncio
import base64
import hashlib
import hmac
import json
import ssl
from datetime import datetime
from time import mktime
from urllib.parse import urlencode
from wsgiref.handlers import format_date_time

import websockets

from config import settings

_HOST = "tts-api.xfyun.cn"
_PATH = "/v2/tts"
_ENDPOINT = f"wss://{_HOST}{_PATH}"


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


async def synthesize(text: str, vcn: str = "xiaoyan") -> bytes:
    """
    将文字发送到讯飞 TTS，返回 PCM 音频 bytes。
    vcn: 发音人，默认 xiaoyan（需在控制台开通）
    """
    url = _build_auth_url()
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    # 一次性发送请求
    request = json.dumps({
        "common": {"app_id": settings.xf_app_id},
        "business": {
            "aue": "raw",
            "auf": "audio/L16;rate=16000",
            "vcn": vcn,
            "speed": 50,
            "pitch": 50,
        },
        "data": {
            "status": 2,
            "text": base64.b64encode(text.encode("utf-8")).decode("utf-8"),
        },
    })

    audio_chunks = []

    async with websockets.connect(url, ssl=ssl_context) as ws:
        await ws.send(request)

        while True:
            msg = await asyncio.wait_for(ws.recv(), timeout=15)
            data = json.loads(msg)

            code = data.get("code", -1)
            if code != 0:
                raise RuntimeError(f"讯飞 TTS 错误: code={code}, message={data.get('message', '')}")

            audio_data = data.get("data")
            if audio_data and audio_data.get("audio"):
                audio_chunks.append(base64.b64decode(audio_data["audio"]))

            if audio_data and audio_data.get("status") == 2:
                break

    return b"".join(audio_chunks)
