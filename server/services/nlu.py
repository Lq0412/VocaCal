"""DeepSeek NLU 意图解析服务

将用户语音/文本输入解析为结构化的日历操作意图。
支持：添加、删除、查询、修改事件，以及日程摘要。
"""

import json
import logging
import re
from datetime import date

import httpx

from config import settings
from models.schemas import NLUResult

logger = logging.getLogger("nlu")

_SYSTEM_PROMPT = """你是一个日历事件解析助手。根据用户的语音输入，提取意图和事件信息，以 JSON 返回。

支持的意图：
- ADD_EVENT: 添加事件
- DELETE_EVENT: 删除事件
- QUERY_EVENT: 查询事件
- MODIFY_EVENT: 修改事件（改时间或标题）

返回格式：
{{
  "intent": "ADD_EVENT | DELETE_EVENT | QUERY_EVENT | MODIFY_EVENT",
  "title": "事件标题（简洁，如'开会''健身'）",
  "date": "YYYY-MM-DD（解析后的绝对日期）",
  "time": "HH:MM（24小时制，如 15:00）",
  "new_title": "修改后的新标题（仅 MODIFY_EVENT 时使用）",
  "new_date": "修改后的新日期（仅 MODIFY_EVENT 时使用）",
  "new_time": "修改后的新时间（仅 MODIFY_EVENT 时使用）",
  "reply": "自然语言回复（用于 TTS 播报，简洁友好）",
  "raw": "原始语音文本"
}}

规则：
1. 当前日期：{today}（{weekday}）
2. 解析相对时间：明天=后一天，后天=后两天，大后天=后三天
3. "下周X" = 下一个周X（从当前周之后算起）
4. "这周末" = 最近一个周六和周日
5. 模糊时间默认值：上午=09:00，下午=15:00，晚上=19:00，中午=12:00，早上=08:00
6. 如果用户没说时间，time 设为 null（表示全天事件）
7. 查询意图不需要 title 和 time
8. 如果用户说"今天有什么安排"或"帮我看看日程"，意图是 QUERY_EVENT
9. 如果用户说"把X改到Y"，意图是 MODIFY_EVENT
10. reply 字段必须是一句简短中文（不超过30字），用于语音播报。语气友好自然。
11. 只返回 JSON，不要输出任何其他文字。不要在 reply 里写示例或解释。"""

_WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]


def _extract_json(text: str) -> dict:
    """从模型输出中提取 JSON，兼容 markdown 代码块包裹"""
    match = re.search(r"`(?:json)?\s*(\{.*?\})\s*`", text, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    return json.loads(text.strip())


async def parse_intent(text: str) -> NLUResult:
    """将文字解析为日历意图，失败时返回 intent=None"""
    if not settings.deepseek_api_key:
        logger.warning("DEEPSEEK_API_KEY is empty, skipping NLU")
        return NLUResult(intent=None, raw=text)

    today = date.today()
    weekday = _WEEKDAYS[today.weekday()]
    prompt = _SYSTEM_PROMPT.format(today=today.isoformat(), weekday=weekday)

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{settings.deepseek_base_url}/chat/completions",
                headers={"Authorization": f"Bearer {settings.deepseek_api_key}"},
                json={
                    "model": "deepseek-v4-pro",
                    "temperature": 0.1,
                    "messages": [
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": text},
                    ],
                },
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            logger.info(f"DeepSeek response: {content!r}")

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
