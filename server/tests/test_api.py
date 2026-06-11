"""后端业务逻辑测试

测试回复文本生成、音频转换等核心逻辑。
不依赖外部服务（DeepSeek/讯飞），纯单元测试。
"""

import pytest

from main import _build_reply
from models.schemas import NLUResult


class TestBuildReply:
    """回复文本生成逻辑测试"""

    def test_returns_nlu_reply_when_available(self):
        """如果 NLU 返回了 reply 字段，应优先使用"""
        result = NLUResult(
            intent="ADD_EVENT",
            title="开会",
            date="2026-05-31",
            time="15:00",
            reply="好的，已为你添加明天下午三点开会",
            raw="明天下午三点开会",
        )
        assert _build_reply(result) == "好的，已为你添加明天下午三点开会"

    def test_add_event_without_reply(self):
        """ADD_EVENT 无 reply 时应生成默认回复"""
        result = NLUResult(
            intent="ADD_EVENT",
            title="开会",
            date="2026-05-31",
            time="15:00",
            raw="明天下午三点开会",
        )
        reply = _build_reply(result)
        assert "已添加" in reply
        assert "开会" in reply

    def test_add_event_with_date_and_time(self):
        """ADD_EVENT 回复应包含日期和时间"""
        result = NLUResult(
            intent="ADD_EVENT",
            title="健身",
            date="2026-06-01",
            time="19:00",
            raw="后天晚上七点健身",
        )
        reply = _build_reply(result)
        assert "2026-06-01" in reply
        assert "19:00" in reply
        assert "健身" in reply

    def test_delete_event_reply(self):
        """DELETE_EVENT 应生成确认删除的回复"""
        result = NLUResult(
            intent="DELETE_EVENT",
            title="开会",
            date="2026-05-31",
            raw="把明天的开会删掉",
        )
        reply = _build_reply(result)
        assert "确认删除" in reply

    def test_delete_event_with_time(self):
        """DELETE_EVENT 有时间时回复应包含时间"""
        result = NLUResult(
            intent="DELETE_EVENT",
            title="开会",
            date="2026-05-31",
            time="15:00",
            raw="把明天下午三点的开会删掉",
        )
        reply = _build_reply(result)
        assert "15:00" in reply

    def test_query_event_with_date(self):
        """QUERY_EVENT 有日期时应包含日期信息"""
        result = NLUResult(
            intent="QUERY_EVENT",
            date="2026-05-31",
            raw="明天有什么安排",
        )
        reply = _build_reply(result)
        assert "2026-05-31" in reply

    def test_query_event_with_date_range(self):
        """QUERY_EVENT 有 date_range 时应包含范围信息"""
        from models.schemas import DateRange

        result = NLUResult(
            intent="QUERY_EVENT",
            date_range=DateRange(start="2026-06-09", end="2026-06-15"),
            raw="看看这周安排",
        )
        reply = _build_reply(result)
        assert "2026-06-09" in reply
        assert "2026-06-15" in reply

    def test_add_multi_events_reply(self):
        """多事件添加应生成批量回复"""
        from models.schemas import ParsedEventItem

        result = NLUResult(
            intent="ADD_EVENT",
            events=[
                ParsedEventItem(title="健身", date="2026-06-12", time="07:00"),
                ParsedEventItem(title="开会", date="2026-06-12", time="15:00"),
            ],
            raw="明早健身下午开会",
        )
        reply = _build_reply(result)
        assert "2" in reply

    def test_modify_event_reply(self):
        """MODIFY_EVENT 应生成修改确认的回复"""
        result = NLUResult(
            intent="MODIFY_EVENT",
            title="开会",
            raw="把开会改到四点",
        )
        reply = _build_reply(result)
        assert "修改" in reply
        assert "开会" in reply

    def test_unknown_intent_fallback(self):
        """intent 为 None 时应返回引导提示"""
        result = NLUResult(intent=None, raw="啦啦啦")
        reply = _build_reply(result)
        assert "抱歉" in reply
        assert "试试说" in reply

    def test_empty_raw_fallback(self):
        """空输入的兜底回复"""
        result = NLUResult(raw="")
        reply = _build_reply(result)
        assert len(reply) > 0
