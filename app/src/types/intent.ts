import type { CalendarEvent } from './event';

export type CalendarIntent = 'ADD_EVENT' | 'DELETE_EVENT' | 'QUERY_EVENT';

export interface NLUResult {
  intent: CalendarIntent | null;
  title: string | null;
  date: string | null;
  time: string | null;
  raw: string;
}

export type IntentApplyResult =
  | {type: 'added'; event: CalendarEvent}
  | {type: 'query'; events: CalendarEvent[]; date: string}
  | {type: 'delete_candidates'; events: CalendarEvent[]}
  | {type: 'unknown'; message: string};
