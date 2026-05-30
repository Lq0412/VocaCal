"""数据模型定义

定义 NLU 解析请求/响应和语音处理响应的数据结构。
"""

from typing import Literal, Optional

from pydantic import BaseModel


class NLUParseRequest(BaseModel):
    """纯文本 NLU 解析请求"""
    text: str


CalendarIntent = Literal["ADD_EVENT", "DELETE_EVENT", "QUERY_EVENT", "MODIFY_EVENT"]


class NLUResult(BaseModel):
    """DeepSeek NLU 解析结果"""
    intent: Optional[CalendarIntent] = None
    title: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    # 修改事件专用字段
    new_title: Optional[str] = None
    new_date: Optional[str] = None
    new_time: Optional[str] = None
    # 自然语言回复（用于 TTS 播报）
    reply: Optional[str] = None
    raw: str = ""


class VoiceProcessResponse(BaseModel):
    """语音处理完整响应"""
    text: str = ""
    intent: Optional[str] = None
    event: Optional[NLUResult] = None
    reply_text: str = ""
    reply_audio: str = ""
