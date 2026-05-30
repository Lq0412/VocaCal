/**
 * 日历意图处理服务
 *
 * 将 NLU 解析的结构化意图转换为实际的数据库操作。
 * 支持：添加、查询、删除、修改事件。
 */

import type { IntentApplyResult, NLUResult } from '../types/intent';
import { createEvent, findEvents, getEventsByDate } from './storageService';

/**
 * 根据 NLU 意图执行对应的日历操作
 */
export async function applyIntent(intent: NLUResult): Promise<IntentApplyResult> {
  if (intent.intent === 'ADD_EVENT') {
    if (!intent.title || !intent.date) {
      return {type: 'unknown', message: '缺少日程标题或日期，请再说一次'};
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
      return {type: 'unknown', message: '缺少查询日期，试试说"今天有什么安排"'};
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

  return {type: 'unknown', message: '🤔 抱歉没理解，试试说：明天下午三点开会'};
}
