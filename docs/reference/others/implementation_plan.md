# VocaCal 三天竞赛冲刺计划

## 现状分析

### ✅ 已完成（可用）
- **后端完整**：FastAPI + 讯飞ASR + DeepSeek NLU + 讯飞TTS，全链路已通
- **前端文本交互**：输入框 → 后端NLU → 日程添加/查询/删除候选 → SQLite存储
- **日历UI**：react-native-calendars 日历组件 + 事件列表展示
- **API通信**：axios调用 `/api/nlu/parse`、`/api/voice/process`

### ❌ 未完成 / 问题
| 问题 | 严重度 | 说明 |
|------|--------|------|
| **App闪退** | 🔴致命 | `react-native-sqlite-storage` 不兼容新架构RN 0.85，需手动注册且不稳定 |
| **语音录音不可用** | 🔴致命 | `voiceService.ts` 里 `startRecording()` 直接 `throw Error`，没有录音库 |
| **TTS播放不可用** | 🟡重要 | `playFromUrl()` 是空函数 |
| **删除无确认** | 🟡重要 | 找到候选后只显示文字，没有确认/取消交互 |
| **UI简陋** | 🟡重要 | 调试模式标签、无动画、无空状态图标、视觉平淡 |
| **无Demo视频** | 🟡重要 | 评审占20% |

### 关键技术决策

> [!IMPORTANT]
> **`react-native-sqlite-storage` → `expo-sqlite` 迁移**
> 
> 当前用的 `react-native-sqlite-storage@6.0.1` 不支持 RN 新架构，这是闪退的根源。建议迁移到 `expo-sqlite`（Expo SDK 官方库，完美兼容）。API 几乎相同，迁移成本低。

> [!IMPORTANT]
> **语音录音方案：`expo-av`**
> 
> 当前项目没有 Expo 依赖（纯 RN CLI 项目），需要引入 Expo 来使用 `expo-av` 录音。
> 替代方案：也可以用 `react-native-audio-recorder-player`，但 expo-av 在 Expo 生态下更稳定。
> **如果你的项目之前引入过 Expo（回退前的 commit 有 expo 相关依赖），我们可以直接集成 expo。如果不想引入 expo，可以用 `react-native-audio-recorder-player`。**

## 评审对标策略

| 维度 | 占比 | 我们的目标 |
|------|------|----------|
| **功能完整度与创新性** | 40% | 语音添加✅ 语音查询✅ 语音删除✅ + TTS语音反馈 + 日历标记有事件的日期 |
| **开发过程与质量** | 40% | 每天2-3个小粒度PR，描述含功能+思路+测试，commit中文规范 |
| **Demo视频** | 20% | B站上传，完整展示语音流程，README显眼位置放链接 |

---

## Day 1（5/30 今晚 ~ 5/31 凌晨）— 修复基础 + 语音能力

目标：**让App不闪退 + 能录音 + 能播放TTS**

---

### PR 1: `fix(前端): 迁移expo-sqlite替换react-native-sqlite-storage`

**功能描述**：将 SQLite 库从不兼容新架构的 `react-native-sqlite-storage` 迁移到 Expo 官方的 `expo-sqlite`，修复 App 闪退问题。

**实现思路**：
1. 引入 Expo 到纯 RN 项目：`npx install-expo-modules@latest`
2. `npm install expo-sqlite`
3. 重写 `storageService.ts`：
   - `expo-sqlite` 使用同步风格 API（`openDatabaseSync`）
   - 替换 `SQLite.openDatabase` → `openDatabaseSync('vocalcal.db')`
   - 替换 `tx.executeSql` → `db.runSync` / `db.getAllSync`
4. 删除 `react-native-sqlite-storage` 和 `@types/react-native-sqlite-storage`
5. `MainApplication.kt` 不再需要手动注册 `SQLitePluginPackage`

**测试方式**：
- `npx expo run:android` 启动不闪退
- 文本输入"明天下午三点开会" → 日程列表出现新事件
- 切换日期 → 事件正确按日期过滤

**改动文件**：
- [MODIFY] `app/package.json` — 删除旧依赖，添加 expo + expo-sqlite
- [MODIFY] `app/src/services/storageService.ts` — 重写为 expo-sqlite API
- [MODIFY] `app/android/app/src/main/java/com/app/MainApplication.kt` — 移除手动注册

---

### PR 2: `feat(前端): 集成expo-av实现语音录音与TTS播放`

**功能描述**：实现按住麦克风录音、松开发送到后端、播放TTS语音回复。

**实现思路**：
1. `npx expo install expo-av`
2. 重写 `voiceService.ts`：
   - `Audio.Recording.createAsync()` 实现录音（16kHz mono AAC `.m4a`）
   - `Audio.Sound.createAsync({ uri })` 实现TTS播放
   - 录音文件通过 `FormData` 上传到 `/api/voice/process`
3. `apiService.ts`：用 `fetch` 替代 `axios` 上传文件（避免 boundary 丢失问题）
4. AndroidManifest 确认有 `RECORD_AUDIO` 权限

**测试方式**：
- 按住麦克风说话 → 松开 → 显示识别文本 → 日程添加成功
- TTS播放"已添加xxx" 语音反馈

**改动文件**：
- [MODIFY] `app/src/services/voiceService.ts` — 完整重写录音+播放
- [MODIFY] `app/src/services/apiService.ts` — fetch替代axios上传

---

### PR 3: `fix(前端): 配置Android明文HTTP权限和网络安全`

**功能描述**：允许 Android 访问 `http://10.0.2.2:8000`（模拟器连本机后端）。

**实现思路**：
1. `AndroidManifest.xml` 添加 `android:usesCleartextTraffic="true"`
2. 新增 `network_security_config.xml` 显式允许 `10.0.2.2`
3. `app.json` 添加 expo android 插件配置

**测试方式**：文本输入/语音录音都能正常请求后端

**改动文件**：
- [MODIFY] `app/android/app/src/main/AndroidManifest.xml`
- [NEW] `app/android/app/src/main/res/xml/network_security_config.xml`

---

## Day 2（5/31 上午 ~ 下午）— UI打磨 + 完善交互

目标：**让App看起来精致专业，交互完整**

---

### PR 4: `feat(前端): 重写日历主界面UI，提升视觉体验`

**功能描述**：全面升级 CalendarScreen 的视觉设计，从"调试模式"升级为正式产品。

**实现思路**：
1. 配色方案：深紫主色 `#6C5CE7` + 暖黄点缀 `#FDCB6E`
2. 日历组件主题定制（选中日颜色、今日标记）
3. 事件卡片重新设计：左侧色条（按时段变色）+ 阴影 + 圆角
4. 空状态添加图标 📅 + 引导文字
5. 麦克风按钮重新设计：
   - idle → 呼吸动画（Animated.loop）
   - recording → 脉冲动画 + 红色
   - processing → 灰色 + "···"
6. 输入框从"调试面板"改为正式输入区
7. 状态消息支持 info/success/error 三种样式
8. 移除"调试模式"标签

**测试方式**：视觉检查，交互流畅

**改动文件**：
- [MODIFY] `app/src/screens/CalendarScreen.tsx` — 完整重写UI+动画

---

### PR 5: `feat(前端): 实现删除确认底部弹窗和操作结果反馈`

**功能描述**：语音/文本删除时弹出底部Sheet显示候选日程，点击确认删除；添加/查询结果也有弹窗反馈。

**实现思路**：
1. 使用 RN `Modal` + `TouchableWithoutFeedback` 实现底部弹出Sheet
2. 删除流程：找到候选 → 弹窗显示列表 → 用户点击某条 → 确认删除 → 关闭弹窗
3. 添加/查询结果弹窗：显示图标+标题+副标题，3秒自动关闭
4. 弹窗有拖拽把手、圆角、遮罩层

**测试方式**：
- 输入"删除明天的开会" → 弹窗显示候选 → 点击删除 → 日程消失
- 输入"明天三点开会" → 弹窗显示"✅ 已添加日程"

**改动文件**：
- [MODIFY] `app/src/screens/CalendarScreen.tsx` — 添加Modal组件
- [MODIFY] `app/src/services/storageService.ts` — 导出deleteEvent函数

---

### PR 6: `feat(前端): 日历标记有事件的日期`

**功能描述**：在日历视图中，有事件的日期显示小圆点标记，让用户一眼看到哪些天有安排。

**实现思路**：
1. 新增 `getAllEventDates()` 查询所有有事件的日期
2. 在 `Calendar` 组件的 `markedDates` 中，对有事件的日期添加 `{marked: true, dotColor: '#6C5CE7'}`
3. 页面加载和事件变更时刷新标记

**测试方式**：添加多个日期的事件 → 日历上对应日期显示圆点

**改动文件**：
- [MODIFY] `app/src/services/storageService.ts` — 新增getAllEventDates
- [MODIFY] `app/src/screens/CalendarScreen.tsx` — markedDates逻辑

---

## Day 3（5/31 下午 ~ 晚上）— 收尾 + Demo

目标：**测试打磨、录视频、整理文档**

---

### PR 7: `docs: 完善README，添加架构图、依赖清单和使用说明`

**功能描述**：让README专业完整，包含项目介绍、架构图、技术栈、安装步骤、API文档。

**实现思路**：
1. 项目简介 + 功能亮点
2. Mermaid架构流程图
3. 技术栈表格
4. 安装运行步骤（前端+后端）
5. 环境变量说明
6. API接口文档
7. **Demo视频链接放在README最顶部**

**改动文件**：
- [MODIFY] `README.md`

---

### PR 8: `docs: 添加Demo演示视频`

**功能描述**：录制完整Demo视频上传B站，展示语音添加/查询/删除全流程。

**视频内容**：
1. 打开App → 展示日历界面
2. 文本输入"明天下午三点开会" → 事件添加成功
3. 按住麦克风说"后天上午十点面试" → 语音识别 → 自动添加 → TTS播放确认
4. 语音说"看看明天有什么安排" → 查询结果展示
5. 语音说"把明天的开会删掉" → 弹窗确认 → 删除成功
6. 日历切换日期，展示标记和事件列表

---

## PR 提交节奏

| 时间 | PR | 说明 |
|------|-----|------|
| 5/30 晚上 | PR 1 | 修复闪退（expo-sqlite迁移）|
| 5/30 深夜 | PR 2 | 语音录音+TTS播放 |
| 5/30 深夜 | PR 3 | HTTP权限配置 |
| 5/31 上午 | PR 4 | UI全面升级 |
| 5/31 中午 | PR 5 | 删除确认弹窗 |
| 5/31 下午 | PR 6 | 日历标记 |
| 5/31 下午 | PR 7 | README文档 |
| 5/31 晚上 | PR 8 | Demo视频 |

## Open Questions

> [!IMPORTANT]
> **Expo集成方案确认**
> 
> 当前项目是**纯 React Native CLI 项目**（无 Expo）。要使用 `expo-sqlite` 和 `expo-av`，需要将项目转换为 Expo 项目（`npx install-expo-modules`）。这会修改 `android/` 目录下的多个配置文件。
> 
> 之前你回退掉的 commit 里似乎已经集成了 Expo（有 `expo`, `expo-av`, `expo-asset` 等依赖）。**是否确认采用 Expo 方案？** 或者你更倾向于保持纯 RN 项目？

> [!WARNING]
> **时间紧迫风险**
> 
> 现在是 5/30 21:00，距离 5/31 23:59 截止只剩约 **27 小时**。
> 上述 8 个 PR 中，**PR 1-3 是今晚必须完成的**（约4-5小时），否则明天无法进行后续工作。
> PR 4-6 是明天上午/下午（约6小时），PR 7-8 是明天晚上收尾。

## Verification Plan

### 自动化测试
- 后端：`cd server && python -m pytest` — 验证NLU解析
- 前端：`cd app && npm test` — 基本组件测试

### 手动验证
- 模拟器上完整语音流程：录音 → 识别 → 添加 → TTS播放
- 文本输入添加/查询/删除
- 日历切换日期、事件标记
- 删除弹窗交互
