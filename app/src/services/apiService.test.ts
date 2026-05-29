import axios from 'axios';
import { parseTextIntent } from './apiService';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

test('parseTextIntent posts text to backend NLU endpoint', async () => {
  mockedAxios.post.mockResolvedValue({
    data: {
      intent: 'ADD_EVENT',
      title: '开会',
      date: '2026-05-30',
      time: '15:00',
      raw: '明天下午三点开会',
    },
  });

  const result = await parseTextIntent('明天下午三点开会');

  expect(mockedAxios.post).toHaveBeenCalledWith(
    'http://10.0.2.2:8000/api/nlu/parse',
    {text: '明天下午三点开会'},
  );
  expect(result).toEqual({
    intent: 'ADD_EVENT',
    title: '开会',
    date: '2026-05-30',
    time: '15:00',
    raw: '明天下午三点开会',
  });
});
