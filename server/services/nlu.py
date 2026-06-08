"""DeepSeek NLU 意图解析服务

将用户语音/文本输入解析为结构化的日历操作意图。
支持：添加、删除、查询、修改事件，以及日程摘要。
"""

import json
import logging
import re
import time
from datetime import date

import httpx

from config import settings
from models.schemas import NLUResult

logger = logging.getLogger("nlu")

# 模块级 httpx 客户端：复用 TCP+TLS 连接，避免每次 NLU 请求都重新握手
_http_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=15)
    return _http_client

_SYSTEM_PROMPT = """日历意图解析。今天{today}({weekday})。只返回JSON。
{{"intent":"ADD_EVENT|DELETE_EVENT|QUERY_EVENT|MODIFY_EVENT","title":"简短标题","date":"YYYY-MM-DD","time":"HH:MM或null","new_title":"仅修改用","new_date":"仅修改用","new_time":"仅修改用","reply":"≤10字口语回复"}}
规则：明天/后天/大后天按日期推算；下周X=下一个周X；上午9点,下午3点,晚上7点,中午12点；没说时间time=null；查询不需title/time。reply要俏皮简短如"安排上啦！""帮你记好啦~""划掉啦！"。"""

_WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]


def _extract_json(text: str) -> dict:
    """从模型输出中提取 JSON，兼容 markdown 代码块包裹"""
    match = re.search(r"`(?:json)?\s*(\{.*?\})\s*`", text, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    return json.loads(text.strip())


async def parse_intent(text: str) -> NLUResult:
    """将文字解析为日历意图，失败时返回 intent=None"""
    # 空文本或超短噪音（如 ASR 把环境杂音误识别成一两个字）直接拦截，
    # 避免大模型凭空编造日程（如"交水电费"）。
    if not text or len(text.strip()) < 2:
        logger.info(f"text too short, skip NLU: {text!r}")
        return NLUResult(intent=None, raw=text)

    if not settings.deepseek_api_key:
        logger.warning("DEEPSEEK_API_KEY is empty, skipping NLU")
        return NLUResult(intent=None, raw=text)

    today = date.today()
    weekday = _WEEKDAYS[today.weekday()]
    prompt = _SYSTEM_PROMPT.format(today=today.isoformat(), weekday=weekday)

    try:
        t0 = time.monotonic()
        client = _get_client()
        resp = await client.post(
            f"{settings.deepseek_base_url}/chat/completions",
            headers={"Authorization": f"Bearer {settings.deepseek_api_key}"},
            json={
                "model": "deepseek-v4flash",
                "temperature": 0.0,
                "max_tokens": 150,
                "messages": [
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": text},
                ],
            },
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        logger.info(f"DeepSeek response ({time.monotonic()-t0:.1f}s): {content!r}")

        parsed = _extract_json(content)
        return NLUResult(
            intent=parsed.get("intent"),
            title=parsed.get("title"),
            date=parsed.get("date"),
            time=parsed.get("time"),
            new_title=parsed.get("new_title"),
            new_date=parsed.get("new_date"),
            new_time=parsed.get("new_time"),
            reply=parsed.get("reply"),
            raw=text,
        )
    except Exception as e:
        logger.error(f"NLU parse failed: {type(e).__name__}: {e}")
        return NLUResult(intent=None, raw=text)
