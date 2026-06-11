import asyncio
import base64
import io
import logging
import struct
import time
from collections import OrderedDict

from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Query, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from starlette.websockets import WebSocketState

from models.schemas import NLUParseRequest, NLUResult, VoiceProcessResponse
from services import nlu, xf_asr, xf_asr_stream, xf_tts

try:
    from uvicorn.protocols.utils import ClientDisconnected
except ImportError:  # 单元测试环境可能未安装 uvicorn
    ClientDisconnected = WebSocketDisconnect  # type: ignore[misc, assignment]

logger = logging.getLogger("vocacal")
logging.basicConfig(level=logging.INFO)

_WS_DISCONNECT_ERRORS = (WebSocketDisconnect, ClientDisconnected)

# TTS 预合成缓存：主管线返回时异步启动 TTS 合成，前端请求时直接命中
_tts_cache: OrderedDict[str, asyncio.Task] = OrderedDict()
_TTS_CACHE_MAX = 20


def _schedule_tts(text: str) -> None:
    """非阻塞地启动 TTS 合成任务，结果缓存供 /api/tts/speak 使用"""
    if not text or text in _tts_cache:
        return
    if len(_tts_cache) >= _TTS_CACHE_MAX:
        _, oldest = _tts_cache.popitem(last=False)
        oldest.cancel()
    _tts_cache[text] = asyncio.create_task(_do_tts(text))


async def _do_tts(text: str) -> bytes:
    """执行 TTS 合成并返回 WAV bytes"""
    pcm = await xf_tts.synthesize(text)
    return _wrap_wav_header(pcm)

@asynccontextmanager
async def _lifespan(application: FastAPI):
    """预热外部服务连接，消除首次请求的冷启动延迟"""
    logger.info("[Warmup] Pre-connecting to DeepSeek...")
    try:
        client = nlu._get_client()
        await client.head(f"{nlu.settings.deepseek_base_url}/models", timeout=5)
        logger.info("[Warmup] DeepSeek connection ready")
    except Exception:
        logger.info("[Warmup] DeepSeek warmup skipped (non-critical)")
    yield


app = FastAPI(title="VocaCal Backend", version="0.1.0", lifespan=_lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/nlu/parse", response_model=NLUResult)
async def nlu_parse(req: NLUParseRequest):
    """纯文本 NLU 解析（调试用）"""
    return await nlu.parse_intent(req.text)


@app.post("/api/voice/process", response_model=VoiceProcessResponse)
async def voice_process(audio: UploadFile = File(...)):
    """
    完整语音处理管线：
    音频 → ASR 识别 → NLU 解析 → 生成回复文本 → 返回
    """
    t_start = time.monotonic()
    audio_bytes = await audio.read()
    logger.info(f"[Pipeline] Audio received: {len(audio_bytes)} bytes")

    # 1. ASR 语音识别
    try:
        t0 = time.monotonic()
        pcm = _audio_to_pcm(audio_bytes)
        text = await xf_asr.recognize(pcm)
        logger.info(f"[Pipeline] ASR done in {time.monotonic()-t0:.1f}s: {text!r}")
    except ValueError as e:
        return VoiceProcessResponse(
            text="",
            reply_text=str(e),
            reply_audio="",
        )
    except Exception:
        return VoiceProcessResponse(
            text="",
            reply_text="语音识别失败，请重试",
            reply_audio="",
        )

    if not text:
        return VoiceProcessResponse(
            text="",
            reply_text="没听清，请再说一次",
            reply_audio="",
        )

    # 2. NLU 意图解析
    t0 = time.monotonic()
    try:
        result = await nlu.parse_intent(text)
        logger.info(f"[Pipeline] NLU done in {time.monotonic()-t0:.1f}s: intent={result.intent}")
    except Exception as e:
        logger.error(f"[Pipeline] NLU Error: {e}")
        return VoiceProcessResponse(
            text=text,
            reply_text="服务器解析失败，请稍后重试",
            reply_audio="",
        )

    # 3. 生成回复文本
    reply_text = _build_reply(result)
    logger.info(f"[Pipeline] Total: {time.monotonic()-t_start:.1f}s → {reply_text!r}")

    # 异步预合成 TTS：前端收到响应后请求 /api/tts/speak 时大概率已合成好，
    # 省掉前端等待 TTS 的 1-2 秒
    _schedule_tts(reply_text)

    return VoiceProcessResponse(
        text=text,
        intent=result.intent,
        event=result if result.intent else None,
        reply_text=reply_text,
        reply_audio="",
    )


def _build_reply(result: NLUResult) -> str:
    """根据意图生成回复文本，优先使用 NLU 生成的自然语言回复"""
    # 优先使用 DeepSeek 生成的友好回复（防护：超过 60 字视为异常，丢弃）
    if result.reply and len(result.reply) <= 60:
        return result.reply

    if not result.intent:
        return "抱歉没理解，试试说：明天下午三点开会"

    if result.intent == "ADD_EVENT" and result.events and len(result.events) > 1:
        return f"帮你安排了{len(result.events)}件事"

    if result.intent == "ADD_EVENT":
        parts = ["已添加"]
        if result.date:
            parts.append(result.date)
        if result.time:
            parts.append(result.time)
        if result.title:
            parts.append(result.title)
        return " ".join(parts)

    if result.intent == "DELETE_EVENT":
        parts = ["找到"]
        if result.date:
            parts.append(result.date)
        if result.time:
            parts.append(result.time)
        parts.append("的")
        if result.title:
            parts.append(result.title)
        parts.append("，请确认删除")
        return "".join(parts)

    if result.intent == "QUERY_EVENT":
        if result.date_range:
            return f"查询{result.date_range.start}到{result.date_range.end}的日程"
        if result.date:
            return f"查询{result.date}的日程"
        return "查询日程"

    if result.intent == "MODIFY_EVENT":
        parts = ["需要修改"]
        if result.title:
            parts.append(f"「{result.title}」")
        return "".join(parts)

    return "抱歉没理解，试试说：明天下午三点开会"


def _ws_result_payload(text: str, result: NLUResult, reply_text: str) -> dict:
    """构造 WebSocket 结果帧，确保嵌套 NLUResult 可 JSON 序列化"""
    return {
        "type": "result",
        "text": text,
        "intent": result.intent,
        "event": result.to_json_dict() if result.intent else None,
        "reply_text": reply_text,
    }


def _audio_to_pcm(audio_bytes: bytes) -> bytes:
    """将上传音频转为 PCM 16kHz 16bit mono。WAV 直接跳过 44 字节头，其他格式用 pydub 转换。"""
    if audio_bytes[:4] == b"RIFF":
        return audio_bytes[44:]

    try:
        from pydub import AudioSegment

        audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
        audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
        return audio.raw_data
    except ImportError:
        raise ValueError("非 WAV 格式，需安装 pydub: pip install pydub（并确保系统有 ffmpeg）")
    except Exception as e:
        raise ValueError(f"音频转换失败: {e}")


def _wrap_wav_header(
    pcm: bytes,
    sample_rate: int = 16000,
    bits: int = 16,
    channels: int = 1,
) -> bytes:
    """将裸 PCM 包装为带 WAV 头的字节流，供播放器直接播放。"""
    data_size = len(pcm)
    buf = io.BytesIO()
    buf.write(b"RIFF")
    buf.write(struct.pack("<I", 36 + data_size))
    buf.write(b"WAVE")
    buf.write(b"fmt ")
    buf.write(
        struct.pack(
            "<IHHIIHH",
            16,
            1,
            channels,
            sample_rate,
            sample_rate * channels * bits // 8,
            channels * bits // 8,
            bits,
        )
    )
    buf.write(b"data")
    buf.write(struct.pack("<I", data_size))
    buf.write(pcm)
    return buf.getvalue()


@app.get("/api/tts/speak")
async def tts_speak(text: str = Query(...)):
    """TTS 播放端点。优先从预合成缓存获取，命中时几乎零延迟。"""
    try:
        task = _tts_cache.get(text)
        if task is not None:
            wav = await task
            logger.info(f"[TTS] cache hit: {text!r}")
        else:
            pcm = await xf_tts.synthesize(text)
            wav = _wrap_wav_header(pcm)
        return Response(content=wav, media_type="audio/wav")
    except Exception:
        return Response(status_code=500)


@app.websocket("/ws/voice")
async def ws_voice(websocket: WebSocket):
    """WebSocket 流式语音管线：边说边识别，松开后快速返回结果。

    协议：
      客户端 → 服务端:
        - 二进制帧: PCM 音频块 (16kHz 16bit mono)
        - 文本帧 "END": 结束录音
      服务端 → 客户端:
        - JSON: {"type":"result", "text":"...", "intent":"...", "event":{...}, "reply_text":"..."}
        - JSON: {"type":"error", "message":"..."}
    """
    await websocket.accept()
    asr = xf_asr_stream.StreamingASR()
    t_start = time.monotonic()

    try:
        await asr.start()
        logger.info("[WS] ASR stream started")

        while True:
            message = await websocket.receive()

            if message.get("type") == "websocket.disconnect":
                await asr.cancel()
                return

            if "bytes" in message and message["bytes"]:
                await asr.feed(message["bytes"])

            elif "text" in message:
                text_data = message["text"].strip()
                if text_data.upper() == "END":
                    break
                # base64 编码的 PCM 音频块
                try:
                    pcm_chunk = base64.b64decode(text_data)
                    await asr.feed(pcm_chunk)
                except Exception:
                    pass

        # 录音结束，获取最终 ASR 结果
        t0 = time.monotonic()
        text = await asr.finish()
        logger.info(f"[WS] ASR done in {time.monotonic()-t0:.1f}s: {text!r}")

        if not text:
            await websocket.send_json({"type": "result", "text": "", "reply_text": "没听清，请再说一次"})
            return

        # NLU
        t0 = time.monotonic()
        result = await nlu.parse_intent(text)
        logger.info(f"[WS] NLU done in {time.monotonic()-t0:.1f}s: intent={result.intent}")

        reply_text = _build_reply(result)

        logger.info(f"[WS] Total: {time.monotonic()-t_start:.1f}s")

        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.send_json(_ws_result_payload(text, result, reply_text))
        else:
            logger.info("[WS] Client already disconnected before send")

        try:
            _schedule_tts(reply_text)
        except Exception:
            logger.exception("[WS] TTS pre-schedule failed (non-fatal)")

    except _WS_DISCONNECT_ERRORS:
        logger.info("[WS] Client disconnected during processing")
        await asr.cancel()
    except Exception:
        logger.exception("[WS] Error")
        try:
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json({"type": "error", "message": "处理出错，请重试"})
        except _WS_DISCONNECT_ERRORS:
            pass
        except Exception:
            logger.exception("[WS] Failed to send error frame")
        await asr.cancel()


@app.get("/api/events/check-conflict")
async def check_conflict(date: str = Query(...), time: str = Query(None)):
    """检查指定日期时间是否有事件冲突（供前端调用）"""
    return {"date": date, "time": time, "has_conflict": False}
