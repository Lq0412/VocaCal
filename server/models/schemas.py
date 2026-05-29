from typing import Optional

from pydantic import BaseModel


class NLUParseRequest(BaseModel):
    """纯文本 NLU 解析请求"""
    text: str


class NLUResult(BaseModel):
    """DeepSeek NLU 解析结果"""
    intent: Optional[str] = None
    title: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    raw: str = ""


class VoiceProcessResponse(BaseModel):
    """语音处理完整响应"""
    text: str = ""
    intent: Optional[str] = None
    event: Optional[NLUResult] = None
    reply_text: str = ""
    reply_audio: str = ""
