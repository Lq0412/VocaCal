# VocaCal - 语音日历工具

> 七牛云 × XEngineer 暑期实训营 第二批次议题 · 题目一

## 项目简介

VocaCal 是一款以**语音交互**为核心的日历管理工具，旨在帮助用户高效、便捷地管理日程。

### 核心能力

- **语音添加事件**：通过语音输入创建日程提醒
- **语音删除事件**：通过语音指令删除已有日程
- **语音查看事件**：通过语音查询日历中的日程安排

## 时间线

| 阶段 | 时间 |
|------|------|
| 实战期 | 5月29日 00:00 – 5月31日 23:59 |
| 仓库设为公开 | 6月1日 00:00 起 |

## 技术栈

| 层级 | 技术 |
|------|------|
| 移动端 | React Native |
| 后端 | Python FastAPI |
| 语音识别/合成 | 讯飞语音 SDK |
| 意图解析 | DeepSeek API |
| 数据存储 | SQLite (本地) |

## 快速开始

### 后端

```bash
cd server
pip install -r requirements.txt
cp ../.env.example .env   # 填入讯飞和 DeepSeek 的 API Key
uvicorn main:app --reload
```

### 移动端

```bash
cd app
npm install
npx react-native run-android   # 或 run-ios
```

## 项目结构

```
VocaCal/
├── app/           ← React Native 前端
├── server/        ← FastAPI 后端
├── docs/          ← 项目文档
└── .env.example   ← 环境变量模板
```

## 文档索引

| 文档 | 说明 |
|------|------|
| [docs/requirements.md](docs/requirements.md) | 需求分析 |
| [docs/design.md](docs/design.md) | 设计方案 |
| [docs/competition.md](docs/competition.md) | 竞赛通知原文 |

## 许可证

项目知识产权归提交者所有，详见竞赛规则。
