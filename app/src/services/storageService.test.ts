import type { CalendarEvent } from '../types/event';

const mockOpenDatabase = jest.fn();

jest.mock('react-native-sqlite-storage', () => ({
  __esModule: true,
  openDatabase: mockOpenDatabase,
  default: {
    openDatabase: mockOpenDatabase,
  },
}));

const {
  createEvent,
  deleteEvent,
  findEvents,
  getEventsByDate,
  initDatabase,
} = require('./storageService');

function createRows(events: CalendarEvent[]) {
  return {
    length: events.length,
    item: (index: number) => events[index],
  };
}

function createDatabaseMock(rows = createRows([]), insertId = 1) {
  const executeSql = jest.fn((sql, params, onSuccess) => {
    onSuccess(null, {insertId, rows, rowsAffected: 1});
  });
  const transaction = jest.fn(callback => callback({executeSql}));

  mockOpenDatabase.mockReturnValue({transaction});

  return {executeSql, transaction};
}

describe('storageService', () => {
  beforeEach(() => {
    mockOpenDatabase.mockReset();
    jest.useRealTimers();
  });

  test('initializes events table and indexes', async () => {
    const {executeSql} = createDatabaseMock();

    await initDatabase();

    expect(executeSql).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS events'),
      [],
      expect.any(Function),
      expect.any(Function),
    );
    expect(executeSql).toHaveBeenCalledWith(
      expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_events_date'),
      [],
      expect.any(Function),
      expect.any(Function),
    );
    expect(executeSql).toHaveBeenCalledWith(
      expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_events_date_time'),
      [],
      expect.any(Function),
      expect.any(Function),
    );
  });

  test('returns events for a date sorted by time with all-day events last', async () => {
    const allDayEvent: CalendarEvent = {
      id: 1,
      title: '全天整理资料',
      date: '2026-05-30',
      time: null,
      note: null,
      created_at: '2026-05-29T10:00:00.000Z',
      updated_at: '2026-05-29T10:00:00.000Z',
    };
    const afternoonEvent: CalendarEvent = {
      id: 2,
      title: '下午会议',
      date: '2026-05-30',
      time: '15:00',
      note: null,
      created_at: '2026-05-29T10:00:00.000Z',
      updated_at: '2026-05-29T10:00:00.000Z',
    };
    const morningEvent: CalendarEvent = {
      id: 3,
      title: '上午评审',
      date: '2026-05-30',
      time: '09:00',
      note: null,
      created_at: '2026-05-29T10:00:00.000Z',
      updated_at: '2026-05-29T10:00:00.000Z',
    };
    const {executeSql} = createDatabaseMock(
      createRows([allDayEvent, afternoonEvent, morningEvent]),
    );

    const events = await getEventsByDate('2026-05-30');

    expect(executeSql).toHaveBeenCalledWith(
      expect.stringContaining('WHERE date = ?'),
      ['2026-05-30'],
      expect.any(Function),
      expect.any(Function),
    );
    expect(events.map((event: CalendarEvent) => event.title)).toEqual([
      '上午评审',
      '下午会议',
      '全天整理资料',
    ]);
  });

  test('creates an event with generated timestamps', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-29T12:00:00.000Z'));
    const {executeSql} = createDatabaseMock(createRows([]), 42);

    const event = await createEvent({
      title: '开会',
      date: '2026-05-30',
      time: '15:00',
      note: '明天下午三点开会',
    });

    expect(executeSql).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO events'),
      [
        '开会',
        '2026-05-30',
        '15:00',
        '明天下午三点开会',
        '2026-05-29T12:00:00.000Z',
        '2026-05-29T12:00:00.000Z',
      ],
      expect.any(Function),
      expect.any(Function),
    );
    expect(event).toEqual({
      id: 42,
      title: '开会',
      date: '2026-05-30',
      time: '15:00',
      note: '明天下午三点开会',
      created_at: '2026-05-29T12:00:00.000Z',
      updated_at: '2026-05-29T12:00:00.000Z',
    });
  });

  test('finds events by date and title', async () => {
    const {executeSql} = createDatabaseMock();

    await findEvents({date: '2026-05-30', title: '开会'});

    expect(executeSql).toHaveBeenCalledWith(
      expect.stringContaining('WHERE date = ? AND title LIKE ?'),
      ['2026-05-30', '%开会%'],
      expect.any(Function),
      expect.any(Function),
    );
  });

  test('deletes an event by id', async () => {
    const {executeSql} = createDatabaseMock();

    await deleteEvent(7);

    expect(executeSql).toHaveBeenCalledWith(
      'DELETE FROM events WHERE id = ?',
      [7],
      expect.any(Function),
      expect.any(Function),
    );
  });
});
