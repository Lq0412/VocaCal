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


def test_nlu_result_rejects_unknown_intent():
    with pytest.raises(ValidationError):
        NLUResult(intent="UPDATE_EVENT", raw="改一下明天的会")


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
