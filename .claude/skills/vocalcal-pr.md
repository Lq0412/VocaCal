---
name: vocalcal-pr
description: VocaCal 项目 PR/Commit 提交规范 — 单功能 PR、描述模板、持续提交要求。所有 git 操作必须遵守此规范。
---

# VocaCal PR & Commit 提交规范

## 核心原则

> **每个 PR 只做一件事。** 大功能拆分为多个独立 PR 分步提交。

## Commit 规范

### 格式

```
<type>: <subject>
```

### Type 列表

| type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 bug |
| `docs` | 文档变更 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构（不新增功能也不修复 bug） |
| `test` | 添加/修改测试 |
| `chore` | 构建/工具/配置变更 |

### 示例

```
feat(后端): 集成讯飞语音识别
feat(前端): 实现语音录制按钮组件
fix(后端): 修复空音频输入导致的崩溃
docs: 更新 README 添加 Demo 视频链接
```

### 规则

- commit message 使用**中文**描述
- 描述不超过 50 字符，说清楚改了什么
- 不写"更新"、"修复"等模糊描述，要具体
- **scope** 标注影响范围：`后端`、`前端`、`文档`

## PR 规范

### 工作流

```
main ← feature/xxx（分支开发）→ PR → 合并到 main
```

1. 从 main 创建功能分支：`feat/server-asr`、`feat/app-calendar-ui`
2. 在功能分支上开发并 commit
3. 完成后创建 PR 合并回 main
4. **合并前确保 main 仍可运行**

### 分支命名

```
feat/<scope>-<描述>    # 新功能
fix/<scope>-<描述>     # bug 修复
```

示例：
- `feat/server-讯飞语音识别` — 后端讯飞语音识别
- `feat/app-日历界面` — 前端日历界面
- `feat/server-意图解析` — 后端意图解析
- `fix/app-语音录制崩溃` — 修复前端语音录制崩溃

### PR 标题

一句话说明本 PR 新增/修改了什么。

```
feat(后端): 集成讯飞语音识别，支持音频流转文字
feat(前端): 实现语音录制按钮组件
```

### PR 描述模板（必填）

每个 PR 的描述**必须**包含以下四个部分：

```markdown
## 功能描述
<!-- 说明该功能的作用与使用方式 -->

## 实现思路
<!-- 简要说明技术选型或核心实现逻辑 -->

## 测试方式
<!-- 如何验证该功能正常运行 -->

## 相关 Issue / 备注
<!-- 可选：关联信息 -->
```

### PR 示例

**标题：** `feat(后端): 集成 DeepSeek 意图解析`

**描述：**
```markdown
## 功能描述
将用户语音文本（如"明天下午三点开会"）解析为结构化事件数据：
- 识别意图类型：ADD_EVENT / DELETE_EVENT / QUERY_EVENT
- 提取实体：事件标题、日期时间
- 支持相对时间解析（明天、下周三、后天等）

## 实现思路
通过 DeepSeek API 的 chat completion 接口，使用精心设计的 system prompt
引导模型输出结构化 JSON。prompt 中注入当前日期，使模型能准确解析相对时间。
返回结果经 Pydantic 模型校验后供业务层使用。

## 测试方式
1. 启动后端：`cd server && uvicorn main:app --reload`
2. 调用测试接口：`POST /api/nlu/parse` body: `{"text": "明天下午三点开会"}`
3. 验证返回的 intent、title、datetime 字段正确
```

## 持续提交要求

> ⚠️ **严禁最后一天突击提交。** 仅在最后一天一次性导入所有代码的作品直接视为无效。

### 每日最低要求

| 日期 | 应完成的 PR |
|------|-------------|
| **5/29** | 后端框架搭建 + 讯飞 ASR 集成 + React Native 项目初始化 |
| **5/30** | DeepSeek NLU 集成 + 前端日历 UI + 前后端联调 |
| **5/31** | 功能完善 + Bug 修复 + Demo 视频 + 文档整理 |

- 每天**至少 1 个 PR**
- commit 时间必须均匀分布，不能集中在某个时段
- 每个 PR 粒度尽可能小，功能拆细

### 无效 PR 特征（避免）

- PR 描述为空
- PR 描述与实际代码变更严重不符
- 单个 PR 包含多个不相关功能
- PR 合并后 main 无法运行
