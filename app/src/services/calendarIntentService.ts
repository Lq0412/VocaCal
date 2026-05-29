import type { IntentApplyResult, NLUResult } from '../types/intent';
import { createEvent, findEvents, getEventsByDate } from './storageService';

export async function applyIntent(intent: NLUResult): Promise<IntentApplyResult> {
  if (intent.intent === 'ADD_EVENT') {
    if (!intent.title || !intent.date) {
      return {type: 'unknown', message: '缺少日程标题或日期'};
    }

    const event = await createEvent({
      title: intent.title,
      date: intent.date,
      time: intent.time,
      note: intent.raw,
    });

    return {type: 'added', event};
  }

  if (intent.intent === 'QUERY_EVENT') {
    if (!intent.date) {
      return {type: 'unknown', message: '缺少查询日期'};
    }

    const events = await getEventsByDate(intent.date);
    return {type: 'query', events, date: intent.date};
  }

  if (intent.intent === 'DELETE_EVENT') {
    const events = await findEvents({
      date: intent.date ?? undefined,
      title: intent.title,
    });

    return {type: 'delete_candidates', events};
  }

  return {type: 'unknown', message: '抱歉没理解，请换个说法'};
}
