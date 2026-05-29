# 设计方案

## 整体架构

```
┌─────────────────────────────────────────────────┐
│                  React Native App                │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ 语音录制  │  │ 日历 UI  │  │ 事件列表/编辑  │  │
│  └────┬─────┘  └────▲─────┘  └───────▲───────┘  │
│       │              │                │          │
│       │    ┌─────────┴────────────────┘          │
│       │    │         SQLite (本地存储)            │
│       │    └─────────────────────────▲           │
└───────┼──────────────────────────────┼───────────┘
        │ (音频流)                      │ (REST)
        ▼                              │
┌───────────────────────────────────────┴───────────┐
│                FastAPI 后端                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ 讯飞语音 ASR │  │ DeepSeek NLU │  │ TTS 语音  │ │
│  │ (语音→文字)  │  │ (意图+实体)  │  │ (文字→语音)│ │
│  └──────┬──────┘  └──────┬───────┘  └─────┬─────┘ │
│         │                │                 │       │
│         └────────────────┼─────────────────┘       │
│                    业务逻辑层                       │
│          解析结果 → 结构化事件数据                    │
└───────────────────────────────────────────────────┘
```

## 确定的技术栈

| 层级 | 技术 | 理由 |
|------|------|------|
| **移动端** | React Native | 跨平台、生态成熟、3 天可出原型 |
| **语音识别** | 讯飞语音 SDK | 中文识别业界最强，有 React Native 插件 |
| **语音合成** | 讯飞 TTS | 与 ASR 同一套 SDK，统一管理 |
| **意图解析** | DeepSeek API | 理解能力强、价格低、国内访问快 |
| **后端** | Python FastAPI | 开发快，讯飞/DeepSeek SDK 支持好 |
| **数据存储** | SQLite (本地) | 移动端原生支持，离线可用 |

## 核心交互流程

### 添加事件

```
用户长按麦克风说："明天下午三点开会"
        │
        ▼
  讯飞 ASR → "明天下午三点开会"
        │
        ▼
  DeepSeek 解析 → {
    intent: "ADD_EVENT",
    title: "开会",
    datetime: "2026-05-30T15:00:00"
  }
        │
        ▼
  本地 SQLite 存储 → 事件已保存
        │
        ▼
  讯飞 TTS → "好的，已为你添加明天下午三点开会"
```

### 查看事件

```
用户说："看看明天有什么安排"
        │
        ▼
  DeepSeek 解析 → {
    intent: "QUERY_EVENT",
    date_range: "2026-05-30"
  }
        │
        ▼
  查询 SQLite → 返回事件列表
        │
        ▼
  讯飞 TTS → "明天有 2 个日程：下午3点开会，晚上7点健身"
```

### 删除事件

```
用户说："把明天的开会删掉"
        │
        ▼
  DeepSeek 解析 → {
    intent: "DELETE_EVENT",
    title: "开会",
    date: "2026-05-30"
  }
        │
        ▼
  SQLite 删除 → 确认删除
        │
        ▼
  讯飞 TTS → "已删除明天下午三点的开会"
```

## DeepSeek Prompt 设计

```python
SYSTEM_PROMPT = """你是一个日历事件解析助手。根据用户的语音输入，提取以下信息并以 JSON 返回：

支持的意图类型：
- ADD_EVENT: 添加事件
- DELETE_EVENT: 删除事件
- QUERY_EVENT: 查询事件

返回格式：
{
  "intent": "ADD_EVENT | DELETE_EVENT | QUERY_EVENT",
  "title": "事件标题",
  "datetime": "ISO 8601 格式，如 2026-05-30T15:00:00",
  "date": "日期 YYYY-MM-DD（用于查询/删除）",
  "time": "时间 HH:MM（如 15:00）",
  "raw": "原始语音文本"
}

规则：
1. 当前日期是 {today}
2. 解析相对时间：明天、后天、下周三、这周末等
3. 解析模糊时间：上午=09:00，下午三点=15:00，晚上=19:00
4. 如果信息不足，在缺失字段填 null
5. 只返回 JSON，不要其他文字"""
```

## 项目目录结构

```
VocaCal/
├── README.md
├── docs/
│   ├── requirements.md
│   ├── design.md              ← 本文件
│   └── competition.md
├── app/                        ← React Native 前端
│   ├── App.tsx
│   ├── src/
│   │   ├── screens/            # 页面
│   │   │   ├── CalendarScreen.tsx
│   │   │   └── EventDetailScreen.tsx
│   │   ├── components/         # 组件
│   │   │   ├── VoiceButton.tsx
│   │   │   ├── EventCard.tsx
│   │   │   └── CalendarGrid.tsx
│   │   ├── services/           # 服务
│   │   │   ├── voiceService.ts    # 讯飞语音
│   │   │   ├── apiService.ts      # 后端 API 调用
│   │   │   └── storageService.ts  # SQLite 操作
│   │   ├── types/              # 类型定义
│   │   │   └── event.ts
│   │   └── utils/              # 工具函数
│   │       └── dateParser.ts
│   ├── package.json
│   └── app.json
├── server/                     ← FastAPI 后端
│   ├── main.py
│   ├── services/
│   │   ├── xf_asr.py           # 讯飞语音识别
│   │   ├── xf_tts.py           # 讯飞语音合成
│   │   └── nlu.py              # DeepSeek 意图解析
│   ├── models/
│   │   └── event.py            # 事件数据模型
│   ├── routes/
│   │   └── voice.py            # 语音处理路由
│   └── requirements.txt
└── .env.example                # 环境变量模板
```

## API 设计

### `POST /api/voice/process`

请求：音频文件（multipart/form-data）

响应：
```json
{
  "intent": "ADD_EVENT",
  "text": "明天下午三点开会",
  "event": {
    "title": "开会",
    "datetime": "2026-05-30T15:00:00"
  },
  "reply": "好的，已为你添加明天下午三点开会",
  "audio_reply": "base64_encoded_audio..."
}
```

### `POST /api/nlu/parse`

请求：
```json
{
  "text": "明天下午三点开会"
}
```

响应：
```json
{
  "intent": "ADD_EVENT",
  "title": "开会",
  "datetime": "2026-05-30T15:00:00"
}
```

## 开发计划

| 阶段 | 时间 | 内容 |
|------|------|------|
| Day 1 (5/29) | 下午-晚上 | 后端搭建：FastAPI + 讯飞 ASR/TTS + DeepSeek NLU |
| Day 1 (5/29) | 晚上 | 前端搭建：React Native 项目 + 日历 UI |
| Day 2 (5/30) | 上午 | 前后端联调：语音录入 → 解析 → 存储 → 反馈 |
| Day 2 (5/30) | 下午 | 完善交互：删除/查看事件、边界情况处理 |
| Day 3 (5/31) | 上午 | 打磨 UI、语音体验优化、Bug 修复 |
| Day 3 (5/31) | 下午 | 测试、录 Demo、整理文档、提交 |
