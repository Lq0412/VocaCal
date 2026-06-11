import type { CalendarEvent } from '../types/event';
import { formatDateLabel, getWeekBounds, todayISO } from './dateUtils';

export interface WeekInsights {
  todayCount: number;
  weekTotal: number;
  busiestDay: { date: string; count: number } | null;
  freeDays: string[];
  eveningBusyDays: number;
  avgPerDay: number;
  summaryLines: string[];
  tipLine: string;
}

function groupByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const list = map.get(event.date) ?? [];
    list.push(event);
    map.set(event.date, list);
  }
  return map;
}

function hasEveningEvent(events: CalendarEvent[]): boolean {
  return events.some(event => {
    if (!event.time) return false;
    const hour = parseInt(event.time.split(':')[0], 10);
    return hour >= 18;
  });
}

/** 基于本地事件生成轻量洞察文案 */
export function computeWeekInsights(
  weekEvents: CalendarEvent[],
  weekDays: string[],
): WeekInsights {
  const byDate = groupByDate(weekEvents);
  const todayCount = (byDate.get(todayISO) ?? []).length;
  const weekTotal = weekEvents.length;

  let busiestDay: { date: string; count: number } | null = null;
  const freeDays: string[] = [];
  let eveningBusyDays = 0;

  for (const day of weekDays) {
    const dayEvents = byDate.get(day) ?? [];
    const count = dayEvents.length;
    if (count === 0) {
      freeDays.push(day);
    }
    if (!busiestDay || count > busiestDay.count) {
      busiestDay = count > 0 ? { date: day, count } : busiestDay;
    }
    if (hasEveningEvent(dayEvents)) {
      eveningBusyDays += 1;
    }
  }

  const avgPerDay = weekDays.length > 0
    ? Math.round((weekTotal / weekDays.length) * 10) / 10
    : 0;

  const summaryLines: string[] = [];
  if (weekTotal === 0) {
    summaryLines.push('本周还没有安排，可以说一句把日程排上。');
  } else {
    summaryLines.push(`本周共 ${weekTotal} 个日程，平均每天 ${avgPerDay} 个。`);
    if (busiestDay) {
      summaryLines.push(
        `最忙的是 ${formatDateLabel(busiestDay.date)}，有 ${busiestDay.count} 件事。`,
      );
    }
    if (freeDays.length > 0 && freeDays.length <= 3) {
      summaryLines.push(`还有 ${freeDays.length} 天空着，适合留点缓冲时间。`);
    }
    if (eveningBusyDays >= 3) {
      summaryLines.push(`${eveningBusyDays} 天晚上有安排，记得早点休息。`);
    }
  }

  let tipLine = '今天轻装上阵，有空档就给自己放个假吧。';
  if (todayCount >= 4) {
    tipLine = '今天日程很满，优先处理最重要的一件事就好。';
  } else if (todayCount >= 2) {
    tipLine = '今天节奏适中，中间留 10 分钟喘口气会更从容。';
  } else if (todayCount === 1) {
    tipLine = '今天只有一件事，做完就可以安心摸鱼啦。';
  } else if (weekTotal > 0 && freeDays.includes(todayISO)) {
    tipLine = '今天没有安排，正好处理积压或提前准备明天。';
  }

  return {
    todayCount,
    weekTotal,
    busiestDay,
    freeDays,
    eveningBusyDays,
    avgPerDay,
    summaryLines,
    tipLine,
  };
}

export function getCurrentWeekInsights(events: CalendarEvent[]): WeekInsights {
  const { days } = getWeekBounds();
  const weekEvents = events.filter(e => days.includes(e.date));
  return computeWeekInsights(weekEvents, days);
}
