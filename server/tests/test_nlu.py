import asyncio

import pytest
from pydantic import ValidationError

from models.schemas import NLUResult
from services import nlu


def test_extract_json_from_plain_model_output():
    result = nlu._extract_json(
        '{"intent": "ADD_EVENT", "title": "开会", "date": "2026-05-30", "time": "15:00"}'
    )

    assert result["intent"] == "ADD_EVENT"
    assert result["title"] == "开会"


def test_extract_json_from_markdown_fence():
    result = nlu._extract_json(
        """```json
{"intent": "QUERY_EVENT", "title": null, "date": "2026-05-30", "time": null}
```"""
    )

    assert result["intent"] == "QUERY_EVENT"
    assert result["date"] == "2026-05-30"


def test_extract_message_content_from_content_field():
    content = nlu._extract_message_content(
        {"content": '{"intent": "ADD_EVENT", "title": "开会"}'}
    )
    assert "ADD_EVENT" in content


def test_extract_message_content_from_reasoning_when_content_empty():
    content = nlu._extract_message_content(
        {
            "content": "",
            "reasoning_content": '分析完毕，输出 {"intent":"ADD_EVENT","title":"洗澡","events":[{"title":"洗澡","time":"22:00"},{"title":"开会","time":"00:00"}]}',
        }
    )
    assert content.startswith("{")
    assert "洗澡" in content


def test_extract_json_from_reasoning_wrapped_text():
    result = nlu._extract_json(
        '好的，结果如下 {"intent": "ADD_EVENT", "title": "洗澡", "date": "2026-06-11", "time": "22:00"}'
    )
    assert result["intent"] == "ADD_EVENT"
    assert result["title"] == "洗澡"


def test_parse_intent_retries_on_empty_content(monkeypatch):
    call_count = 0

    async def mock_call(prompt, text):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return ""
        return '{"intent":"ADD_EVENT","title":"洗澡","date":"2026-06-11","time":"22:00","reply":"安排上啦"}'

    monkeypatch.setattr(nlu.settings, "deepseek_api_key", "test-key")
    monkeypatch.setattr(nlu, "_call_deepseek", mock_call)

    result = asyncio.run(nlu.parse_intent("今晚10点洗澡"))

    assert call_count == 2
    assert result.intent == "ADD_EVENT"
    assert result.title == "洗澡"


def test_nlu_result_to_json_dict_is_json_serializable():
    import json

    from models.schemas import DateRange, ParsedEventItem

    result = NLUResult(
        intent="ADD_EVENT",
        title="洗澡",
        date="2026-06-11",
        time="22:00",
        events=[
            ParsedEventItem(title="洗澡", date="2026-06-11", time="22:00"),
            ParsedEventItem(title="开会", date="2026-06-11", time="00:00"),
        ],
        date_range=DateRange(start="2026-06-09", end="2026-06-15"),
        reply="帮你记了两件事~",
        raw="今晚10点洗澡然后12点开会",
    )
    payload = json.dumps(result.to_json_dict(), ensure_ascii=False)
    assert "洗澡" in payload
    assert "开会" in payload


def test_ws_result_payload_serializable():
    import json

    from main import _ws_result_payload
    from models.schemas import ParsedEventItem

    result = NLUResult(
        intent="ADD_EVENT",
        events=[
            ParsedEventItem(title="洗澡", date="2026-06-11", time="22:00"),
            ParsedEventItem(title="开会", date="2026-06-11", time="00:00"),
        ],
        reply="安排上啦",
        raw="今晚10点洗澡然后12点开会",
    )
    payload = _ws_result_payload("今晚10点洗澡然后12点开会", result, "安排上啦")
    serialized = json.dumps(payload, ensure_ascii=False)
    assert payload["type"] == "result"
    assert payload["event"]["events"][0]["title"] == "洗澡"


def test_nlu_result_rejects_unknown_intent():
    with pytest.raises(ValidationError):
        NLUResult(intent="UPDATE_EVENT", raw="改一下明天的会")


def test_nlu_result_accepts_date_range_and_events():
    from models.schemas import DateRange, ParsedEventItem

    result = NLUResult(
        intent="QUERY_EVENT",
        date_range=DateRange(start="2026-06-09", end="2026-06-15"),
        events=[ParsedEventItem(title="开会", date="2026-06-12", time="15:00")],
        raw="看看这周安排",
    )

    assert result.date_range is not None
    assert result.date_range.start == "2026-06-09"
    assert len(result.events) == 1


def test_parse_intent_returns_empty_result_when_deepseek_key_missing(monkeypatch):
    calls = []

    async def fail_if_called(*args, **kwargs):
        calls.append((args, kwargs))
        raise AssertionError("DeepSeek API should not be called without an API key")

    monkeypatch.setattr(nlu.settings, "deepseek_api_key", "")
    monkeypatch.setattr(nlu.httpx.AsyncClient, "post", fail_if_called)

    result = asyncio.run(nlu.parse_intent("明天下午三点开会"))

    assert result.intent is None
    assert result.raw == "明天下午三点开会"
    assert calls == []
