# GPT Image2 生图 Prompt

> 使用方式：逐个复制到 ChatGPT 生成 UI 效果图
> 注意：AI 生图中文文字可能乱码，prompt 里用英文占位，后续标注实际中文
> 生成后可截图 → 用工具转 HTML，或直接作为 UI 开发参考

---

## Screen 1：主屏幕（默认态）

```
A beautiful, modern mobile app UI mockup for a voice-controlled calendar app. The design has a warm, friendly personality — think Apple Calendar meets Notion's warmth.

Portrait orientation, iPhone-sized frame with soft shadow on a light background.

Screen content from top to bottom:
- A minimal top bar with a small sun icon and app name on the left, a gear icon on the right
- A compact monthly calendar grid for May 2026, with clean typography. Weekday headers in a row. Today's date has a soft warm-yellow circle highlight. A few other dates have tiny mint-green dots underneath indicating events. The selected date has a filled soft teal/mint-green circle with white text.
- Below the calendar, a subtle section header with the selected date
- 2-3 event cards in a vertical list. Each card is white with generous padding, 16px rounded corners, very soft shadow, and a thin colored accent bar on the left edge (blue for morning, mint green for afternoon, indigo for evening). Each card shows a time on the left and event name on the right.
- At the bottom center: a prominent floating action button — a soft mint green / teal circle with a white microphone icon inside, with a soft glow/shadow beneath it

Color palette: warm mint green / soft teal as primary, warm muted yellow as accent, clean white cards on a very light warm gray (#FAFAFA) background. No harsh colors, no gradients. Avoid purple — it looks too "AI tool".

Typography: clean sans-serif, generous line height, modern.

Overall vibe: premium yet approachable, 2026 design language, generous white space, nothing cluttered. The app feels like it cares about you.

Style: high-fidelity UI mockup, Dribbble-quality, clean and polished.
```

---

## Screen 2：语音录音态（底部弹窗）

```
A beautiful mobile app UI mockup showing an active voice recording state for a calendar app. Portrait orientation, iPhone frame.

The top 40% of the screen shows a blurred/dimmed calendar grid visible behind a bottom sheet.

The bottom 60% is a white bottom sheet with large top-rounded corners and a small horizontal drag handle at the top center.

Inside the bottom sheet:
- Center: a large, beautiful microphone button in a state of active recording. The button itself is a warm mint green / teal circle. Around it, 2-3 concentric ripple rings radiate outward with decreasing opacity — the classic "listening" pulse animation frozen in time. The ripples are soft teal with transparency, creating an organic, alive feeling.
- Below the mic: muted gray text "Listening..."
- Below that: large, bold recognized text "Meeting tomorrow at 3pm" displayed prominently as a headline
- At the bottom: subtle helper text in lighter gray suggesting example phrases

The recording animation is the hero of this screen — it should feel magical and delightful, like talking to a friendly AI assistant. Similar in quality to Apple Siri or Google Assistant's listening animation.

Style: high-fidelity UI mockup, warm mint green / teal accents, clean white bottom sheet, soft shadows. 2026 design language. Dribbble-quality.
```

---

## Screen 3：添加成功反馈

```
A beautiful mobile app UI mockup showing a successful event creation confirmation. Portrait orientation, iPhone frame.

A white bottom sheet with top-rounded corners covers the lower portion of the screen. A calendar grid is faintly visible behind it at the top.

Inside the bottom sheet:
- Top center: a satisfying, large green checkmark icon inside a soft green circle, with "Added" text below it. The checkmark should feel rewarding — like completing a task in a todo app.
- Middle: a clean event card showing the just-created event:
  * A small calendar icon with "May 30, Saturday"
  * A small clock icon with "3:00 PM"
  * A small note icon with "Meeting"
  The card has soft shadow, rounded corners, and a mint green left accent bar.
- Below the card: a small speaker/waveform icon with the voice reply text in a muted style, indicating the app is speaking the confirmation aloud
- Bottom: a soft mint green rounded "Done" button

The overall feeling is confidence and trust — the user clearly sees what was understood and saved. Clean, warm, satisfying. Like the feeling of checking off a todo item.

Style: high-fidelity UI mockup, 2026 design, Dribbble-quality. Warm mint green / teal primary, success green for the checkmark.
```

---

## Screen 4：左滑删除（手动入口）

```
A beautiful mobile app UI mockup showing swipe-to-delete interaction on an event card. Portrait orientation, iPhone frame.

The screen shows the main calendar app with the event list. One event card in the middle of the list has been swiped to the left, revealing a hidden action behind it.

The swiped card shows:
- The event card (white, rounded, with mint green left accent bar showing "3:00 PM — Meeting") has shifted about 80 pixels to the left
- Behind the card, a warm orange/terracotta colored surface is revealed with a trash icon and "Delete" text in white
- The swiped card has a slightly elevated shadow showing it's been "lifted" from its position
- The cards above and below remain in their normal resting position

The other visible elements:
- Top: the monthly calendar grid (partially visible)
- Other event cards in their normal state ("10:00 AM — Review", "7:00 PM — Gym")

This is a gesture-driven, modern delete interaction — no popup, no confirmation dialog. Clean and direct, exactly like iOS Mail or WeChat's swipe-to-delete.

At the bottom: the mint green floating microphone button in its resting state.

Style: high-fidelity UI mockup, 2026 design, fluid and modern. Warm mint green for primary UI, warm orange only for the revealed delete action. Dribbble-quality.
```

---

## Screen 5：查询结果

```
A beautiful mobile app UI mockup showing voice query results for a calendar app. Portrait orientation, iPhone frame.

A white bottom sheet with top-rounded corners shows the results of a voice query "What's on my schedule tomorrow?":

- Top of sheet: a small list icon with header "Tomorrow's Schedule"
- Middle: three event cards stacked vertically with subtle dividers between them:
  * "10:00 AM — Project Review" with a blue left accent bar
  * "3:00 PM — Meeting" with a mint green left accent bar
  * "7:00 PM — Gym" with an indigo left accent bar
  Each card is clean and easy to scan at a glance. Times are left-aligned, event names right-aligned.
- Below the cards: a small speaker icon with the TTS reply text in a speech-bubble style, showing what the app is speaking aloud
- Bottom: a soft mint green "Done" button

The calendar grid is partially visible above the bottom sheet.

The design communicates clarity and efficiency — the user asked a question and got a clean, organized answer. Information hierarchy is clear: what day, how many events, when each one is.

Style: high-fidelity UI mockup, 2026 design, warm mint green / teal accents. Dribbble-quality.
```

---

## Screen 6：错误/空状态

```
A beautiful mobile app UI mockup showing a gentle error/retry state for voice input. Portrait orientation, iPhone frame.

A white bottom sheet with top-rounded corners shows:

- Top center: a friendly, warm illustration or icon — NOT a scary error symbol. Could be a gentle question mark, a friendly face, or a subtle shrug gesture. Below it: the text "Didn't catch that" in a warm, non-judgmental tone.
- Middle: helpful guidance text "Please try again, or say something like:" followed by two example phrases in lighter, muted text:
  * "Meeting tomorrow at 3pm"
  * "What's on my schedule tomorrow"
- Bottom: a welcoming, rounded "Try Again" button in soft mint green / teal with a small microphone icon. The button should feel inviting, not clinical.

The overall tone is warm and encouraging — like a friend saying "sorry, what was that?" not a machine saying "ERROR: unrecognized input". The app doesn't make the user feel stupid.

Style: high-fidelity UI mockup, 2026 design, warm and friendly. Soft mint green / teal accents. Dribbble-quality.
```
