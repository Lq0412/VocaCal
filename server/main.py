import base64

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

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
        text = await xf_asr.recognize(audio_bytes)
    except Exception as e:
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
    """根据意图生成回复文本"""
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

    return "抱歉没理解，试试说：明天下午三点开会"
