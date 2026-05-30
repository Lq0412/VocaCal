# VocaCal Delivery Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a runnable voice-controlled calendar MVP before 2026-05-31 23:59 with add, query, delete, visible ASR result, TTS feedback, README, and demo video.

**Architecture:** Keep the backend stateless: FastAPI only handles ASR, NLU, and TTS. Put all calendar events in the React Native app using local SQLite, with one main calendar screen that owns the event workflow and calls `POST /api/voice/process`.

**Tech Stack:** Python FastAPI, XunFei ASR/TTS WebSocket APIs, DeepSeek chat completion, React Native + TypeScript, `react-native-calendars`, SQLite, audio recording/playback.

---

## Current State

- Backend exists in `server/` with health, text NLU, and full voice process endpoints.
- Core service files exist: `server/services/xf_asr.py`, `server/services/xf_tts.py`, `server/services/nlu.py`.
- Documentation exists for requirements, design, competition rules, and API references.
- `app/` does not exist yet, so there is no mobile UI, no local storage, no audio recording, and no end-to-end flow.
- There are no automated tests yet.
- Git already has multiple 2026-05-29 commits. Keep PRs small and continue daily commits on 2026-05-30 and 2026-05-31.

---

## Priority Order

1. Close 2026-05-29 with a minimal React Native app scaffold PR.
2. On 2026-05-30, make the app useful without real voice first: calendar UI + SQLite + text/NLU debug path.
3. Add audio recording and connect to `POST /api/voice/process`.
4. Complete add, query, and delete flows with confirmation and error states.
5. On 2026-05-31, stabilize, improve UI, record demo, and update README.

---

### Task 1: Frontend Scaffold

**Files:**
- Create: `app/package.json`
- Create: `app/App.tsx`
- Create: `app/tsconfig.json`
- Create: `app/babel.config.js`
- Create: `app/metro.config.js`
- Create: `app/src/screens/CalendarScreen.tsx`
- Create: `app/src/types/event.ts`

- [ ] **Step 1: Initialize the React Native app**

Run:

```powershell
npx @react-native-community/cli init app --version latest --skip-install
```

Expected: `app/` contains a runnable React Native project.

- [ ] **Step 2: Install required frontend dependencies**

Run:

```powershell
cd app
npm install react-native-calendars axios react-native-sqlite-storage react-native-audio-recorder-player
npm install --save-dev @types/react-native-sqlite-storage
```

Expected: `package.json` lists the calendar, HTTP, SQLite, and audio packages.

- [ ] **Step 3: Create a minimal calendar screen**

Implement `app/src/screens/CalendarScreen.tsx` with a month calendar, selected date state, placeholder event list, and a bottom microphone button.

- [ ] **Step 4: Wire `App.tsx` to `CalendarScreen`**

Replace the generated starter UI with the single main screen.

- [ ] **Step 5: Verify the app starts**

Run:

```powershell
cd app
npm run lint
npx react-native run-android
```

Expected: lint passes or reports only template warnings; Android app opens to the calendar screen.

- [ ] **Step 6: Commit**

```powershell
git add app
git commit -m "feat(前端): 初始化 React Native 日历应用"
```

---

### Task 2: Local Event Storage

**Files:**
- Create: `app/src/services/storageService.ts`
- Modify: `app/src/screens/CalendarScreen.tsx`
- Modify: `app/src/types/event.ts`

- [ ] **Step 1: Define the event model**

Use this shape in `app/src/types/event.ts`:

```typescript
export interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  time: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Implement SQLite table setup**

Create `events` with columns matching the event model. Use `date` and `time` indexes because query and delete flows depend on them.

- [ ] **Step 3: Implement CRUD functions**

Add `initDatabase`, `createEvent`, `getEventsByDate`, `findEvents`, and `deleteEvent`.

- [ ] **Step 4: Connect the calendar list to SQLite**

Load selected-date events on screen mount and whenever selected date changes. Sort all timed events first, then all-day events.

- [ ] **Step 5: Verify storage manually**

Temporarily seed one event from the screen or debug button, open the app, switch dates, and confirm the event list updates.

- [ ] **Step 6: Commit**

```powershell
git add app/src
git commit -m "feat(前端): 实现本地日程存储"
```

---

### Task 3: Backend Hardening Before Integration

**Files:**
- Create: `server/tests/test_nlu_extract_json.py`
- Modify: `server/services/nlu.py`
- Modify: `server/models/schemas.py`
- Modify: `server/main.py`
- Modify: `server/requirements.txt`

- [ ] **Step 1: Add minimal backend test dependency**

Add:

```text
pytest
```

- [ ] **Step 2: Test JSON extraction**

Cover direct JSON and fenced markdown JSON output for `_extract_json`.

- [ ] **Step 3: Constrain intent values**

Use a small `Literal["ADD_EVENT", "DELETE_EVENT", "QUERY_EVENT"] | None` type in the schema or validate intent after parsing.

- [ ] **Step 4: Improve empty API key failure**

If `DEEPSEEK_API_KEY` is empty, return `NLUResult(intent=None, raw=text)` and log a clear warning instead of making a doomed HTTP call.

- [ ] **Step 5: Verify**

Run:

```powershell
cd server
python -m pytest
python -m uvicorn main:app --reload
```

Expected: tests pass; `/api/health` returns `{"status":"ok"}`.

- [ ] **Step 6: Commit**

```powershell
git add server
git commit -m "test(后端): 补充 NLU 解析基础测试"
```

---

### Task 4: Text Debug Flow for Add, Query, Delete

**Files:**
- Create: `app/src/services/apiService.ts`
- Create: `app/src/services/calendarIntentService.ts`
- Modify: `app/src/screens/CalendarScreen.tsx`

- [ ] **Step 1: Implement `parseTextIntent`**

Call `POST /api/nlu/parse` with `{ "text": string }`. Keep `API_BASE_URL` centralized for Android emulator networking.

- [ ] **Step 2: Implement `applyIntent`**

For `ADD_EVENT`, save an event to SQLite. For `QUERY_EVENT`, load matching date events. For `DELETE_EVENT`, find candidates by title and date but do not delete until confirmation.

- [ ] **Step 3: Add a temporary text input**

Add a compact debug input so the workflow can be tested before audio recording is complete.

- [ ] **Step 4: Verify three commands**

Use:

```text
明天下午三点开会
明天有什么安排
把明天的开会删掉
```

Expected: add creates a card; query shows matching events; delete asks for confirmation.

- [ ] **Step 5: Commit**

```powershell
git add app/src
git commit -m "feat(前端): 接入文本意图调试流程"
```

---

### Task 5: Voice Recording and TTS Playback

**Files:**
- Create: `app/src/services/voiceService.ts`
- Modify: `app/src/services/apiService.ts`
- Modify: `app/src/screens/CalendarScreen.tsx`

- [ ] **Step 1: Implement recording permissions**

Request microphone permission on Android before recording.

- [ ] **Step 2: Implement recording lifecycle**

Support `idle`, `recording`, and `processing` states. Save recorded audio as WAV or PCM compatible with backend expectations.

- [ ] **Step 3: Upload audio to backend**

Call `POST /api/voice/process` as `multipart/form-data` with field name `audio`.

- [ ] **Step 4: Play TTS response**

If `reply_audio` is present, save it to a temporary file and play it. If playback fails, still show `reply_text`.

- [ ] **Step 5: Verify on device/emulator**

Say:

```text
明天下午三点开会
```

Expected: app shows ASR text, parsed event preview, saved event, and text/TTS response.

- [ ] **Step 6: Commit**

```powershell
git add app/src
git commit -m "feat(前端): 实现语音录制和后端联调"
```

---

### Task 6: Production MVP Interaction

**Files:**
- Create: `app/src/components/VoiceButton.tsx`
- Create: `app/src/components/EventCard.tsx`
- Create: `app/src/components/VoiceResultSheet.tsx`
- Modify: `app/src/screens/CalendarScreen.tsx`

- [ ] **Step 1: Extract UI components**

Keep the screen focused on state orchestration. Put button, event card, and voice result sheet in separate components.

- [ ] **Step 2: Implement add result sheet**

Show ASR text, event date/time/title, and backend reply text.

- [ ] **Step 3: Implement query result sheet**

Show matched events sorted by time and a readable reply.

- [ ] **Step 4: Implement delete confirmation**

If one event matches, show confirm/cancel. If multiple events match, list candidates and let the user choose. If none match, show friendly failure text.

- [ ] **Step 5: Verify full MVP**

Run through add, query, delete, ASR failure, and backend offline cases.

- [ ] **Step 6: Commit**

```powershell
git add app/src
git commit -m "feat(前端): 完成语音日历核心交互"
```

---

### Task 7: Final Polish and Delivery

**Files:**
- Modify: `README.md`
- Modify: `docs/requirements.md`
- Modify: `docs/design.md`
- Modify: `server/services/xf_asr.py`
- Modify: app UI files as needed

- [ ] **Step 1: Enable dialect-free ASR if available**

Change ASR domain/accent only if the XunFei account supports the documented dialect-free mode. If not, keep the working `slm` mode and describe Mandarin support in README.

- [ ] **Step 2: Clean UI to match project guidance**

Use a simple, professional Ant Design-like hierarchy: clear header, restrained cards, consistent spacing, no heavy gradients, no decorative-only animations.

- [ ] **Step 3: Update README**

Add current startup commands, dependency list, environment variables, supported features, and demo video link placeholder before recording.

- [ ] **Step 4: Record demo**

Show these exact flows: add event, query event, delete event, failure handling, and TTS/ASR visible feedback. Put the final video link near the top of README.

- [ ] **Step 5: Final verification**

Run:

```powershell
cd server
python -m pytest
python -m uvicorn main:app --reload
```

Run:

```powershell
cd app
npm run lint
npx react-native run-android
```

Expected: backend starts, app starts, full demo script works.

- [ ] **Step 6: Commit**

```powershell
git add README.md docs server app
git commit -m "docs: 完善交付说明和 Demo 链接"
```

---

## PR Sequence

1. `feat/app-初始化`: frontend scaffold only.
2. `feat/app-本地日程`: SQLite model and calendar list.
3. `test/server-nlu`: backend tests and NLU hardening.
4. `feat/app-文本意图`: text debug flow through backend NLU.
5. `feat/app-语音联调`: audio recording, backend voice process, TTS playback.
6. `feat/app-核心交互`: add/query/delete production UX.
7. `docs/final-delivery`: README, demo link, final docs.

---

## Stop Doing

- Do not build account login, cloud sync, recurring events, calendar sharing, dark mode, or multi-page settings before the MVP is complete.
- Do not spend time on custom calendar rendering unless `react-native-calendars` blocks the core flow.
- Do not merge large unrelated changes into one PR.
- Do not rely on the final day for first end-to-end integration.
