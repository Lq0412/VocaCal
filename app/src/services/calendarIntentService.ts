/**
 * 日历意图处理服务
 *
 * 将 NLU 解析的结构化意图转换为实际的数据库操作。
 * 支持：添加、查询、删除、修改事件，以及撤销操作。
 */

import type { IntentApplyResult, NLUResult, ParsedEventItem, UndoRecord } from '../types/intent';
import {
  createEvent,
  deleteEvent,
  findEvents,
  getEventsByDate,
  getEventsByDateRange,
  restoreEvent,
  updateEvent,
} from './storageService';

let pendingUndo: UndoRecord | null = null;

export function getPendingUndo(): UndoRecord | null {
  return pendingUndo;
}

export function clearPendingUndo(): void {
  pendingUndo = null;
}

export function setPendingUndo(record: UndoRecord): void {
  pendingUndo = record;
}

export async function executeUndo(): Promise<{ success: boolean; message: string }> {
  if (!pendingUndo) {
    return { success: false, message: '没有可撤销的操作' };
  }

  const action = pendingUndo;
  pendingUndo = null;

  if (action.type === 'add') {
    await deleteEvent(action.event.id);
    return { success: true, message: '已撤销添加：' + action.event.title };
  }

  if (action.type === 'batch_add') {
    for (const event of action.events) {
      await deleteEvent(event.id);
    }
    return { success: true, message: `已撤销 ${action.events.length} 个日程` };
  }

  if (action.type === 'delete') {
    await restoreEvent(action.event);
    return { success: true, message: '已恢复：' + action.event.title };
  }

  if (action.type === 'modify') {
    await updateEvent(action.eventId, action.previous);
    return { success: true, message: '已撤销修改' };
  }

  return { success: false, message: '无法撤销' };
}

function groupEventsByDate(events: Awaited<ReturnType<typeof getEventsByDateRange>>) {
  const map = new Map<string, typeof events>();
  for (const event of events) {
    const list = map.get(event.date) ?? [];
    list.push(event);
    map.set(event.date, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayEvents]) => ({ date, events: dayEvents }));
}

/**
 * 根据 NLU 意图执行对应的日历操作（含多事件入口）
 */
export async function applyIntent(intent: NLUResult): Promise<IntentApplyResult> {
  if (intent.intent === 'ADD_EVENT' && intent.events && intent.events.length > 1) {
    return { type: 'batch_pending', events: intent.events, raw: intent.raw };
  }

  if (intent.intent === 'ADD_EVENT' && intent.events?.length === 1) {
    const item = intent.events[0];
    return applySingleAdd({
      ...intent,
      title: item.title ?? intent.title,
      date: item.date ?? intent.date,
      time: item.time ?? intent.time,
    });
  }

  if (intent.intent === 'ADD_EVENT') {
    return applySingleAdd(intent);
  }

  if (intent.intent === 'QUERY_EVENT') {
    if (intent.date_range?.start && intent.date_range?.end) {
      const events = await getEventsByDateRange(intent.date_range.start, intent.date_range.end);
      return {
        type: 'query_range',
        groups: groupEventsByDate(events),
        start: intent.date_range.start,
        end: intent.date_range.end,
      };
    }

    if (!intent.date) {
      return { type: 'unknown', message: '缺少查询日期，试试说"今天有什么安排"或"看看这周安排"' };
    }

    const events = await getEventsByDate(intent.date);
    return { type: 'query', events, date: intent.date };
  }

  if (intent.intent === 'DELETE_EVENT') {
    const events = await findEvents({
      date: intent.date ?? undefined,
      title: intent.title,
    });

    return { type: 'delete_candidates', events };
  }

  if (intent.intent === 'MODIFY_EVENT') {
    const events = await findEvents({
      date: intent.date ?? undefined,
      title: intent.title,
    });

    return {
      type: 'modify_candidates',
      events,
      newTitle: intent.new_title ?? undefined,
      newDate: intent.new_date ?? undefined,
      newTime: intent.new_time ?? undefined,
    };
  }

  return { type: 'unknown', message: '🤔 抱歉没理解，试试说：明天下午三点开会' };
}

export async function applyBatchEvents(
  items: ParsedEventItem[],
  raw: string,
): Promise<IntentApplyResult> {
  const created = [];

  for (const item of items) {
    if (!item.title || !item.date) continue;
    const event = await createEvent({
      title: item.title,
      date: item.date,
      time: item.time,
      note: raw,
    });
    created.push(event);
  }

  if (created.length === 0) {
    return { type: 'unknown', message: '没有有效的日程可添加' };
  }

  setPendingUndo({ type: 'batch_add', events: created });
  return { type: 'batch_added', events: created };
}

async function applySingleAdd(intent: NLUResult): Promise<IntentApplyResult> {
  if (!intent.title || !intent.date) {
    return { type: 'unknown', message: '缺少日程标题或日期，请再说一次' };
  }

  const conflicts = await getEventsByDate(intent.date);
  const hasConflict = !!intent.time && conflicts.some(e => e.time === intent.time);

  const event = await createEvent({
    title: intent.title,
    date: intent.date,
    time: intent.time,
    note: intent.raw,
  });

  setPendingUndo({ type: 'add', event });
  return { type: 'added', event, hasConflict };
}
