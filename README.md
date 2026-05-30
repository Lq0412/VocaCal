# VocaCal - 语音日历助手 🎙️📅

> **七牛云 × XEngineer 暑期实训营 · 题目一 · 语音版日历工具**

<!-- Demo 视频链接（上传后更新） -->
<!-- 🎬 [Demo 视频](https://www.bilibili.com/video/BVxxxx) -->

## ✨ 产品亮点

VocaCal 让你**对着手机说一句话就能管理日程**——不用打字、不用点击、解放双手。

- 🗣️ **说话添加日程**："明天下午三点开会" → 自动创建事件
- 🔍 **说话查看日程**："看看明天有什么安排" → 朗读日程摘要
- 🗑️ **说话删除日程**："把开会删掉" → 确认后删除
- ✏️ **说话修改日程**："把开会改到四点" → 确认后修改
- 🔊 **语音反馈**：每次操作后 TTS 语音播报结果
- 📅 **日历视图**：标记有事件的日期，一目了然

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────┐
│              React Native 移动端                  │
│  ┌───────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ 语音录制   │  │ 日历 UI  │  │ 事件列表管理  │  │
│  │ (录音/播放) │  │ (标记/选) │  │ (增删改查)   │  │
│  └─────┬─────┘  └────▲─────┘  └──────▲───────┘  │
│        │              │               │          │
│        │    ┌─────────┴───────────────┘          │
│        │    │       SQLite (本地存储)              │
└────────┼────┼────────────────────────────────────┘
         │    │ (REST API)
         ▼    │
┌─────────────┴───────────────────────────────────┐
│             FastAPI 后端 (无状态)                  │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ 讯飞 ASR │  │ DeepSeek NLU │  │ 讯飞 TTS  │  │
│  │ 语音→文字 │  │ 文字→意图    │  │ 文字→语音  │  │
│  └──────────┘  └──────────────┘  └───────────┘  │
└─────────────────────────────────────────────────┘
```

**数据流**：语音录制 → 后端 ASR 识别 → DeepSeek 意图解析 → App 本地存储操作 → TTS 语音回复

## 🛠️ 技术栈

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **移动端** | React Native | 0.85.3 | 跨平台移动应用 |
| **录音/播放** | react-native-audio-recorder-player | 4.5.0 | 语音录制和 TTS 播放 |
| **日历组件** | react-native-calendars | 1.1314+ | 日历 UI 和日期选择 |
| **本地存储** | react-native-sqlite-storage | 6.0.1 | SQLite 事件存储 |
| **后端** | Python FastAPI | latest | REST API 服务 |
| **语音识别** | 讯飞 ASR | WebSocket | 中文语音转文字 |
| **语音合成** | 讯飞 TTS | WebSocket | 文字转语音回复 |
| **意图解析** | DeepSeek API | v4-pro | 自然语言理解 |

## 🚀 快速开始

### 环境要求

- Node.js >= 22.11.0
- Python 3.10+
- Android Studio (含 Android SDK)
- 讯飞开放平台账号 + DeepSeek API Key

### 1. 克隆项目

```bash
git clone https://github.com/YOUR_USERNAME/VocaCal.git
cd VocaCal
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入 API 密钥
```

`.env` 文件格式：
```env
XF_APP_ID=你的讯飞AppID
XF_API_KEY=你的讯飞APIKey
XF_API_SECRET=你的讯飞APISecret
DEEPSEEK_API_KEY=你的DeepSeek密钥
```

### 3. 启动后端

```bash
cd server
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

后端启动后可访问 http://localhost:8000/docs 查看 API 文档。

### 4. 启动移动端

```bash
cd app
npm install
npx react-native run-android   # Android
# 或
npx react-native run-ios       # iOS
```

### 5. 运行测试

```bash
# 后端测试
cd server && python -m pytest tests/ -v

# 前端测试
cd app && npm test
```

## 📂 项目结构

```
VocaCal/
├── README.md               ← 本文件
├── .env.example             ← 环境变量模板
├── docs/                    ← 项目文档
│   ├── requirements.md      # 需求分析
│   ├── design.md            # 设计方案
│   └── competition.md       # 竞赛规则
├── server/                  ← FastAPI 后端
│   ├── main.py              # API 路由和业务逻辑
│   ├── config.py            # 环境变量配置
│   ├── services/
│   │   ├── xf_asr.py        # 讯飞语音识别
│   │   ├── xf_tts.py        # 讯飞语音合成
│   │   └── nlu.py           # DeepSeek 意图解析
│   ├── models/
│   │   └── schemas.py       # Pydantic 数据模型
│   ├── tests/               # 后端单元测试
│   └── requirements.txt     # Python 依赖
└── app/                     ← React Native 前端
    ├── App.tsx              # 应用入口
    ├── src/
    │   ├── screens/
    │   │   └── CalendarScreen.tsx  # 主界面
    │   ├── services/
    │   │   ├── voiceService.ts     # 语音录制/播放
    │   │   ├── apiService.ts       # 后端 API 调用
    │   │   ├── calendarIntentService.ts  # 意图处理
    │   │   └── storageService.ts   # SQLite 数据操作
    │   └── types/
    │       ├── event.ts     # 事件类型
    │       └── intent.ts    # 意图类型
    └── package.json
```

## 🔌 API 接口

### `POST /api/voice/process`

完整语音管线：音频 → ASR → NLU → 回复生成 → TTS

**请求**：`multipart/form-data`，字段 `audio`（WAV/m4a 文件）

**响应**：
```json
{
  "text": "明天下午三点开会",
  "intent": "ADD_EVENT",
  "event": {
    "intent": "ADD_EVENT",
    "title": "开会",
    "date": "2026-05-31",
    "time": "15:00",
    "reply": "好的，已为你添加明天下午三点开会"
  },
  "reply_text": "好的，已为你添加明天下午三点开会",
  "reply_audio": "base64..."
}
```

### `POST /api/nlu/parse`

纯文本意图解析（调试用）

### `GET /api/tts/speak?text=...`

TTS 播放端点，返回 WAV 音频流

### `GET /api/health`

健康检查

## 📋 第三方依赖声明

### 后端 (Python)
| 包名 | 用途 | 许可证 |
|------|------|--------|
| fastapi | Web 框架 | MIT |
| uvicorn | ASGI 服务器 | BSD |
| httpx | HTTP 客户端（调用 DeepSeek） | BSD |
| websockets | WebSocket 客户端（讯飞 API） | BSD |
| pydantic-settings | 配置管理 | MIT |
| python-multipart | 文件上传 | Apache 2.0 |
| pydub | 音频格式转换 | MIT |

### 前端 (React Native)
| 包名 | 用途 | 许可证 |
|------|------|--------|
| react-native | 跨平台框架 | MIT |
| react-native-audio-recorder-player | 录音和播放 | MIT |
| react-native-calendars | 日历组件 | MIT |
| react-native-sqlite-storage | SQLite 存储 | MIT |
| react-native-safe-area-context | 安全区域 | MIT |
| axios | HTTP 请求 | MIT |

> 所有代码均为原创，第三方库仅用于基础功能（网络请求、UI 组件、数据库）。核心业务逻辑（语音管线、意图解析、事件管理）全部自主实现。

## 📝 开发日志

- [2026-05-30 开发日志](docs/devlog-2026-05-30.md)：前后端联调、6 个 bug 复盘

## 📄 许可证

项目知识产权归提交者所有，详见竞赛规则。
