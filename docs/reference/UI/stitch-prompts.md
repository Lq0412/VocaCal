# Google Stitch 提示词

> 逐个复制到 Google Stitch 生成原型页面

---

## Screen 1：主屏幕（默认态）

```
Design a mobile app screen for a voice-controlled calendar app called "VocaCal".
The app has a warm, friendly visual style with soft purple (#6C5CE7) as the primary color and warm yellow (#FDCB6E) as accent.

Layout (top to bottom):
1. Top bar: App name "VocaCal" with a sun icon on the left, settings gear icon on the right
2. Month header: "2026年5月" with left/right arrows to switch months
3. Compact calendar grid: 7 columns (一 二 三 四 五 六 日), showing dates. Today (29th) has a yellow dot below. Selected date has a purple filled circle. Dates with events have small purple dots.
4. Below the calendar: Selected date header "5月29日 周四 · 今天"
5. Event list: Cards with left colored border strip, showing time (15:00) and title (开会). Cards are white with 16px rounded corners and soft shadow.
6. Floating action button at bottom center: A purple circle (64dp) with a white microphone icon, with text "按住说话" below it.

Background: #FAFAFA
Card background: #FFFFFF
Text primary: #2D3436
Text secondary: #636E72
Chinese text throughout. Mobile phone frame, portrait orientation.
```

---

## Screen 2：语音录音态（底部弹窗展开）

```
Design a mobile app screen showing a voice recording interaction for a calendar app.
The bottom half of the screen shows a white bottom sheet with top rounded corners (24px).

Bottom sheet content:
1. Center: A large microphone icon with animated purple pulse rings radiating outward (recording state). The button area is red with purple wave ripples.
2. Below mic: Text "正在聆听..." in gray
3. Large recognized text display: "明天下午三点开会" in 20sp bold, dark text
4. Helper text box at bottom: "试试说：· 明天下午三点开会 · 这周末有什么安排 · 把明天的开会删掉"
5. A "取消" text button at the bottom

The top half of the screen still shows the calendar grid partially visible above the bottom sheet.
The bottom sheet has a small horizontal drag handle at the top center.

Style: Warm, friendly. Primary purple #6C5CE7. Chinese text. Soft shadows.
```

---

## Screen 3：添加成功反馈

```
Design a mobile app screen showing a successful voice command result for a calendar app.

A white bottom sheet (top rounded corners 24px) contains:
1. Top: A green checkmark icon (✅) with text "已添加" below it
2. Center: An event card preview showing:
   - 📅 5月30日 周六
   - 🕐 下午 3:00
   - 📝 开会
   Card has 16px rounded corners, soft shadow, warm purple left border accent.
3. Below card: TTS reply text "已添加5月30日周六下午3点开会" with a small speaker icon
4. Bottom: A purple "确认" button with rounded corners

The calendar grid is partially visible above the bottom sheet.

Style: Warm, friendly. Success green #00B894 for the checkmark. Primary purple #6C5CE7.
Chinese text. Mobile phone frame, portrait.
```

---

## Screen 4：删除确认弹窗

```
Design a mobile app screen showing a delete confirmation dialog for a calendar app.

Center of screen: A modal dialog card (white, 16px rounded corners, soft shadow) containing:
1. Top: An orange warning icon (⚠️) with title "确认删除"
2. Middle: An event card showing the event to be deleted:
   - 📅 5月30日 周六
   - 🕐 下午 3:00
   - 📝 开会
3. Bottom: Two buttons side by side:
   - Left: "取消" - outlined/ghost button (gray border, white background)
   - Right: "确认删除" - filled button with warm orange (#E17055) background

Background is dimmed (semi-transparent dark overlay) to focus attention on the dialog.

Style: Warm, friendly. Warning orange #E17055. Primary purple #6C5CE7.
Chinese text. Mobile phone frame, portrait.
```

---

## Screen 5：查询结果

```
Design a mobile app screen showing voice query results for a calendar app.

A white bottom sheet (top rounded corners 24px) contains:
1. Top: A list icon (📋) with title "明天的日程"
2. Middle: A stack of 3 event cards stacked vertically, each showing:
   - 10:00  项目评审  (with blue left border)
   - 15:00  开会      (with purple left border)
   - 19:00  健身      (with indigo left border)
   Cards have subtle separators between them.
3. Below cards: TTS reply text "明天有3个日程：上午10点项目评审，下午3点开会，晚上7点健身" with speaker icon
4. Bottom: Purple "确认" button

Calendar grid partially visible above.

Style: Warm, friendly. Primary purple #6C5CE7.
Chinese text. Mobile phone frame, portrait.
```

---

## Screen 6：错误 / 空状态

```
Design a mobile app screen showing an error/retry state for a voice calendar app.

A white bottom sheet (top rounded corners 24px) contains:
1. Top: A confused face icon (🤔) with text "没听清" below
2. Middle: Helper text "请再说一次，或试试这样说：" followed by example phrases in lighter gray:
   · "明天下午三点开会"
   · "看看明天有什么安排"
3. Bottom: A purple "再说一次" button with rounded corners, with a small microphone icon inside

Calendar grid partially visible above the bottom sheet.

Style: Warm, friendly, non-judgmental. Primary purple #6C5CE7.
Chinese text. Mobile phone frame, portrait.
```
