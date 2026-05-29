import type { CalendarEvent } from '../types/event';
import { applyIntent } from './calendarIntentService';
import {
  createEvent,
  findEvents,
  getEventsByDate,
} from './storageService';

jest.mock('./storageService', () => ({
  createEvent: jest.fn(),
  findEvents: jest.fn(),
  getEventsByDate: jest.fn(),
}));

const mockedCreateEvent = createEvent as jest.MockedFunction<typeof createEvent>;
const mockedFindEvents = findEvents as jest.MockedFunction<typeof findEvents>;
const mockedGetEventsByDate = getEventsByDate as jest.MockedFunction<typeof getEventsByDate>;

const storedEvent: CalendarEvent = {
  id: 1,
  title: '开会',
  date: '2026-05-30',
  time: '15:00',
  note: '明天下午三点开会',
  created_at: '2026-05-29T12:00:00.000Z',
  updated_at: '2026-05-29T12:00:00.000Z',
};

beforeEach(() => {
  jest.resetAllMocks();
});

test('adds an event for ADD_EVENT intent', async () => {
  mockedCreateEvent.mockResolvedValue(storedEvent);

  const result = await applyIntent({
    intent: 'ADD_EVENT',
    title: '开会',
    date: '2026-05-30',
    time: '15:00',
    raw: '明天下午三点开会',
  });

  expect(mockedCreateEvent).toHaveBeenCalledWith({
    title: '开会',
    date: '2026-05-30',
    time: '15:00',
    note: '明天下午三点开会',
  });
  expect(result).toEqual({type: 'added', event: storedEvent});
});

test('queries events for QUERY_EVENT intent', async () => {
  mockedGetEventsByDate.mockResolvedValue([storedEvent]);

  const result = await applyIntent({
    intent: 'QUERY_EVENT',
    title: null,
    date: '2026-05-30',
    time: null,
    raw: '明天有什么安排',
  });

  expect(mockedGetEventsByDate).toHaveBeenCalledWith('2026-05-30');
  expect(result).toEqual({type: 'query', events: [storedEvent], date: '2026-05-30'});
});

test('returns delete candidates for DELETE_EVENT intent', async () => {
  mockedFindEvents.mockResolvedValue([storedEvent]);

  const result = await applyIntent({
    intent: 'DELETE_EVENT',
    title: '开会',
    date: '2026-05-30',
    time: null,
    raw: '把明天的开会删掉',
  });

  expect(mockedFindEvents).toHaveBeenCalledWith({
    date: '2026-05-30',
    title: '开会',
  });
  expect(result).toEqual({type: 'delete_candidates', events: [storedEvent]});
});
