const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const todayISO = formatISODate(new Date());

/** 获取某日期所在周（周一至周日）的边界与 7 天列表 */
export function getWeekBounds(reference: Date = new Date()): {
  start: string;
  end: string;
  days: string[];
} {
  const ref = new Date(reference);
  const weekday = ref.getDay();
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
  const monday = new Date(ref);
  monday.setDate(ref.getDate() + diffToMonday);

  const days: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    days.push(formatISODate(dayDate));
  }

  return { start: days[0], end: days[6], days };
}

export function formatDateLabel(dateString: string): string {
  const d = new Date(`${dateString}T00:00:00`);
  const weekday = WEEKDAY_LABELS[d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekday}`;
}

export function formatShortDate(dateString: string): string {
  const d = new Date(`${dateString}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatWeekRangeLabel(start: string, end: string): string {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (s.getMonth() === e.getMonth()) {
    return `${s.getMonth() + 1}月${s.getDate()}日 – ${e.getDate()}日`;
  }
  return `${s.getMonth() + 1}月${s.getDate()}日 – ${e.getMonth() + 1}月${e.getDate()}日`;
}

export function getWeekdayLabel(dateString: string): string {
  const d = new Date(`${dateString}T00:00:00`);
  return WEEKDAY_LABELS[d.getDay()];
}

export function isToday(dateString: string): boolean {
  return dateString === todayISO;
}
