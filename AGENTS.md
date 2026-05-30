# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

VocaCal is a voice-controlled calendar app for the 「七牛云 × XEngineer 暑期实训营」competition. Deadline: May 31 23:59. The app lets users add/delete/query calendar events via voice in Chinese.

## Architecture

Two independent modules in one repo:

- **`app/`** — React Native mobile frontend. Uses SQLite for local event storage. Sends audio to backend, receives parsed intent + TTS audio reply.
- **`server/`** — Python FastAPI backend. Three services: 讯飞 ASR (speech→text), DeepSeek API (intent parsing with structured JSON output), 讯飞 TTS (text→speech).

Data flow: `Voice input → Backend ASR → DeepSeek NLU → App stores event locally → TTS reply`

Backend is stateless — all event data lives on the device in SQLite. Backend only does speech processing and NLU.

## Environment Variables

Copy `.env.example` and fill in:
- `XF_APP_ID`, `XF_API_KEY`, `XF_API_SECRET` — 讯飞 voice SDK credentials
- `DEEPSEEK_API_KEY` — DeepSeek API key

## Commands

```bash
# Backend
cd server && pip install -r requirements.txt
cd server && uvicorn main:app --reload

# Frontend
cd app && npm install
cd app && npx react-native run-android          # or run-ios
```

## Competition Redlines

> 详细规则见 `.Codex/skills/vocalcal-dev.md` 和 `vocalcal-pr.md`

- 每天必须有 PR/commit，最后一天突击提交 → 无效
- 每个 PR 只做一件事，描述必须含功能描述+实现思路+测试方式
- main 分支随时可运行
- commit 用中文：`feat(后端): 集成讯飞语音识别`
- 评审：40% 功能完整度 + 40% 代码质量/PR质量 + 20% Demo 视频
