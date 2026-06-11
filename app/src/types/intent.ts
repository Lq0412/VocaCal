/**
 * NLU 意图解析相关类型定义
 */

import type { CalendarEvent } from './event';

export type CalendarIntent = 'ADD_EVENT' | 'DELETE_EVENT' | 'QUERY_EVENT' | 'MODIFY_EVENT';

export interface ParsedEventItem {
  title: string | null;
  date: string | null;
  time: string | null;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface NLUResult {
  intent: CalendarIntent | null;
  title: string | null;
  date: string | null;
  time: string | null;
  /** 修改事件专用：新标题 */
  new_title: string | null;
  /** 修改事件专用：新日期 */
  new_date: string | null;
  /** 修改事件专用：新时间 */
  new_time: string | null;
  /** 范围查询：这周/下周等 */
  date_range: DateRange | null;
  /** 一句话多事件拆分 */
  events: ParsedEventItem[] | null;
  /** NLU 生成的自然语言回复 */
  reply: string | null;
  raw: string;
}

export type UndoRecord =
  | { type: 'add'; event: CalendarEvent }
  | { type: 'delete'; event: CalendarEvent }
  | { type: 'modify'; eventId: number; previous: { title: string; date: string; time: string | null } }
  | { type: 'batch_add'; events: CalendarEvent[] };

export type IntentApplyResult =
  | { type: 'added'; event: CalendarEvent; hasConflict?: boolean }
  | { type: 'batch_pending'; events: ParsedEventItem[]; raw: string }
  | { type: 'batch_added'; events: CalendarEvent[] }
  | { type: 'query'; events: CalendarEvent[]; date: string }
  | { type: 'query_range'; groups: { date: string; events: CalendarEvent[] }[]; start: string; end: string }
  | {type: 'delete_candidates'; events: CalendarEvent[]}
  | {type: 'modify_candidates'; events: CalendarEvent[]; newTitle?: string; newDate?: string; newTime?: string}
  | {type: 'unknown'; message: string};
