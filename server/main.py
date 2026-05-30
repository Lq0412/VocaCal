import base64
import io
import struct

from fastapi import FastAPI, File, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from models.schemas import NLUParseRequest, NLUResult, VoiceProcessResponse
from services import nlu, xf_asr, xf_tts

app = FastAPI(title="VocaCal Backend", version="0.1.0")

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
    音频 → ASR 识别 → NLU 解析 → 生成回复文本 → TTS 合成 → 返回
    """
    audio_bytes = await audio.read()

    # 1. ASR 语音识别
    try:
        pcm = _audio_to_pcm(audio_bytes)
        text = await xf_asr.recognize(pcm)
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
    result = await nlu.parse_intent(text)

    # 3. 生成回复文本
    reply_text = _build_reply(result)

    # 4. TTS 语音合成
    reply_audio = ""
    try:
        audio_data = await xf_tts.synthesize(reply_text)
        reply_audio = base64.b64encode(audio_data).decode("utf-8")
    except Exception:
        pass  # TTS 失败不影响主流程，前端可以用文字显示

    return VoiceProcessResponse(
        text=text,
        intent=result.intent,
        event=result if result.intent else None,
        reply_text=reply_text,
        reply_audio=reply_audio,
    )


def _build_reply(result: NLUResult) -> str:
    """根据意图生成回复文本，优先使用 NLU 生成的自然语言回复"""
    # 优先使用 DeepSeek 生成的友好回复
    if result.reply:
        return result.reply

    if not result.intent:
        return "抱歉没理解，试试说：明天下午三点开会"

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
        if result.date:
            return f"查询{result.date}的日程"
        return "查询日程"

    if result.intent == "MODIFY_EVENT":
        parts = ["需要修改"]
        if result.title:
            parts.append(f"「{result.title}」")
        return "".join(parts)

    return "抱歉没理解，试试说：明天下午三点开会"


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
    """TTS 播放端点，返回 WAV 音频流供前端直接播放。"""
    try:
        pcm = await xf_tts.synthesize(text)
        wav = _wrap_wav_header(pcm)
        return Response(content=wav, media_type="audio/wav")
    except Exception:
        return Response(status_code=500)
