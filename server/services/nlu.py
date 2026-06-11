"""DeepSeek NLU 意图解析服务

将用户语音/文本输入解析为结构化的日历操作意图。
支持：添加、删除、查询、修改事件，以及日程摘要。
"""

import asyncio
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

_MAX_TOKENS = 512
_MAX_RETRIES = 2


def _get_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=15)
    return _http_client

_SYSTEM_PROMPT = """日历意图解析。今天{today}({weekday})。只返回JSON，不要输出其他文字。
{{"intent":"ADD_EVENT|DELETE_EVENT|QUERY_EVENT|MODIFY_EVENT","title":"简短标题","date":"YYYY-MM-DD","time":"HH:MM或null","new_title":"仅修改用","new_date":"仅修改用","new_time":"仅修改用","date_range":{{"start":"YYYY-MM-DD","end":"YYYY-MM-DD"}}或null,"events":[{{"title":"","date":"","time":null}}]或null,"reply":"≤15字口语回复"}}
规则：
- 明天/后天/大后天按日期推算；下周X=下一个周X；上午9点,下午3点,晚上7点,中午12点；没说时间time=null
- 查询单日用date；范围查询用date_range（这周=本周一至周日，下周=下周一至周日，这个月底=本月最后一天，周末=最近周六至周日），此时date=null
- 一句话多个安排必须拆成events数组，intent=ADD_EVENT。例："今晚10点洗澡然后12点开会"→events=[{{"title":"洗澡","date":"今天日期","time":"22:00"}},{{"title":"开会","date":"今天日期","time":"00:00"}}]；又如"明早健身、下午开会、晚上聚餐"同理
- 单事件时events=null，用顶层title/date/time
- reply俏皮简短如'安排上啦！'或'帮你记了两件事~'"""

_WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]


def _extract_json(text: str) -> dict:
    """从模型输出中提取 JSON，兼容 markdown 代码块包裹"""
    match = re.search(r"`(?:json)?\s*(\{.*?\})\s*`", text, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    # 兜底：从文本中提取第一个 JSON 对象（reasoning 模式可能夹带说明文字）
    brace_match = re.search(r"\{.*\}", text, re.DOTALL)
    if brace_match:
        return json.loads(brace_match.group(0))
    return json.loads(text.strip())


def _extract_message_content(message: dict) -> str:
    """从 DeepSeek message 提取可用文本，兼容 thinking/reasoning 模式 content 为空的情况"""
    content = message.get("content")
    if isinstance(content, str) and content.strip():
        return content.strip()

    for key in ("reasoning_content", "reasoning"):
        alt = message.get(key)
        if isinstance(alt, str) and alt.strip():
            json_match = re.search(r"\{.*\}", alt, re.DOTALL)
            if json_match:
                return json_match.group(0)
            return alt.strip()

    return ""


async def _call_deepseek(prompt: str, text: str) -> str:
    """调用 DeepSeek chat/completions，返回非空文本或空字符串"""
    client = _get_client()
    resp = await client.post(
        f"{settings.deepseek_base_url}/chat/completions",
        headers={"Authorization": f"Bearer {settings.deepseek_api_key}"},
        json={
            "model": "deepseek-v4-flash",
            "temperature": 0.0,
            "max_tokens": _MAX_TOKENS,
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": text},
            ],
        },
    )
    resp.raise_for_status()
    message = resp.json()["choices"][0]["message"]
    return _extract_message_content(message)


def _build_result(parsed: dict, text: str) -> NLUResult:
    """将解析后的 dict 转为 NLUResult"""
    date_range_raw = parsed.get("date_range")
    date_range = None
    if isinstance(date_range_raw, dict) and date_range_raw.get("start") and date_range_raw.get("end"):
        date_range = date_range_raw

    events_raw = parsed.get("events")
    events = None
    if isinstance(events_raw, list) and len(events_raw) > 0:
        events = [
            {"title": item.get("title"), "date": item.get("date"), "time": item.get("time")}
            for item in events_raw
            if isinstance(item, dict)
        ]

    return NLUResult(
        intent=parsed.get("intent"),
        title=parsed.get("title"),
        date=parsed.get("date"),
        time=parsed.get("time"),
        new_title=parsed.get("new_title"),
        new_date=parsed.get("new_date"),
        new_time=parsed.get("new_time"),
        date_range=date_range,
        events=events,
        reply=parsed.get("reply"),
        raw=text,
    )


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
        content = ""
        for attempt in range(_MAX_RETRIES):
            content = await _call_deepseek(prompt, text)
            if content:
                break
            if attempt < _MAX_RETRIES - 1:
                logger.warning("DeepSeek returned empty content, retrying once")
                await asyncio.sleep(0.3)

        logger.info(f"DeepSeek response ({time.monotonic()-t0:.1f}s): {content!r}")

        if not content:
            logger.warning("DeepSeek returned empty content after retry, treating as unknown intent")
            return NLUResult(intent=None, raw=text)

        parsed = _extract_json(content)
        return _build_result(parsed, text)
    except httpx.HTTPStatusError as e:
        # 打印响应体，方便定位 400/401 等错误的具体原因（如模型名错误、key 失效）
        logger.error(
            f"NLU parse failed: {e.response.status_code} {e.response.text[:300]}"
        )
        return NLUResult(intent=None, raw=text)
    except Exception as e:
        logger.error(f"NLU parse failed: {type(e).__name__}: {e}")
        return NLUResult(intent=None, raw=text)
