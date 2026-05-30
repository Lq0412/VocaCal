import SQLite from 'react-native-sqlite-storage';
import type {
  ResultSet,
  SQLiteDatabase,
  Transaction,
} from 'react-native-sqlite-storage';
import type { CalendarEvent } from '../types/event';

type NewCalendarEvent = Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>;

interface FindEventsCriteria {
  date?: string;
  title?: string | null;
}

function getDatabase(): SQLiteDatabase {
  return SQLite.openDatabase(
    {name: 'vocalcal.db', location: 'default'},
    () => undefined,
    () => undefined,
  );
}

function executeSql(
  sqlStatement: string,
  params: unknown[] = [],
): Promise<ResultSet> {
  const database = getDatabase();

  return new Promise((resolve, reject) => {
    database.transaction(
      (tx: Transaction) => {
        tx.executeSql(
          sqlStatement,
          params,
          (_, result) => resolve(result),
          (_, error) => {
            reject(error);
          },
        );
      },
      error => reject(error),
    );
  });
}

export async function initDatabase(): Promise<void> {
  await executeSql(
    `CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT,
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  );
  await executeSql(
    'CREATE INDEX IF NOT EXISTS idx_events_date ON events(date)',
  );
  await executeSql(
    'CREATE INDEX IF NOT EXISTS idx_events_date_time ON events(date, time)',
  );
}

export async function createEvent(event: NewCalendarEvent): Promise<CalendarEvent> {
  const now = new Date().toISOString();
  const result = await executeSql(
    `INSERT INTO events (title, date, time, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [event.title, event.date, event.time, event.note, now, now],
  );

  return {
    ...event,
    id: result.insertId,
    created_at: now,
    updated_at: now,
  };
}

export async function getEventsByDate(date: string): Promise<CalendarEvent[]> {
  const result = await executeSql(
    `SELECT id, title, date, time, note, created_at, updated_at
     FROM events
     WHERE date = ?`,
    [date],
  );

  return sortEventsBySchedule(rowsToEvents(result));
}

export async function findEvents(
  criteria: FindEventsCriteria,
): Promise<CalendarEvent[]> {
  const whereClauses: string[] = [];
  const params: string[] = [];

  if (criteria.date) {
    whereClauses.push('date = ?');
    params.push(criteria.date);
  }

  if (criteria.title) {
    whereClauses.push('title LIKE ?');
    params.push(`%${criteria.title}%`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const result = await executeSql(
    `SELECT id, title, date, time, note, created_at, updated_at
     FROM events
     ${whereSql}`,
    params,
  );

  return sortEventsBySchedule(rowsToEvents(result));
}

export async function deleteEvent(id: number): Promise<void> {
  await executeSql('DELETE FROM events WHERE id = ?', [id]);
}

/**
 * 更新事件的标题、日期或时间（用于修改事件）
 */
export async function updateEvent(
  id: number,
  updates: { title?: string; date?: string; time?: string },
): Promise<void> {
  const setClauses: string[] = [];
  const params: unknown[] = [];

  if (updates.title !== undefined) {
    setClauses.push('title = ?');
    params.push(updates.title);
  }
  if (updates.date !== undefined) {
    setClauses.push('date = ?');
    params.push(updates.date);
  }
  if (updates.time !== undefined) {
    setClauses.push('time = ?');
    params.push(updates.time);
  }

  if (setClauses.length === 0) return;

  setClauses.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);

  await executeSql(
    `UPDATE events SET ${setClauses.join(', ')} WHERE id = ?`,
    params,
  );
}

/**
 * 获取所有有事件的日期列表（用于日历标记小圆点）
 */
export async function getAllEventDates(): Promise<string[]> {
  const result = await executeSql(
    'SELECT DISTINCT date FROM events ORDER BY date',
  );

  const dates: string[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    dates.push(result.rows.item(i).date);
  }
  return dates;
}

function rowsToEvents(result: ResultSet): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (let index = 0; index < result.rows.length; index += 1) {
    events.push(result.rows.item(index));
  }

  return events;
}

function sortEventsBySchedule(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((left, right) =>
    (left.time ?? '24:00').localeCompare(right.time ?? '24:00'),
  );
}
