export interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  time: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}
