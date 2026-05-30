/**
 * NLU 意图解析相关类型定义
 */

import type { CalendarEvent } from './event';

export type CalendarIntent = 'ADD_EVENT' | 'DELETE_EVENT' | 'QUERY_EVENT' | 'MODIFY_EVENT';

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
  /** NLU 生成的自然语言回复 */
  reply: string | null;
  raw: string;
}

export type IntentApplyResult =
  | {type: 'added'; event: CalendarEvent}
  | {type: 'query'; events: CalendarEvent[]; date: string}
  | {type: 'delete_candidates'; events: CalendarEvent[]}
  | {type: 'modify_candidates'; events: CalendarEvent[]; newTitle?: string; newDate?: string; newTime?: string}
  | {type: 'unknown'; message: string};
