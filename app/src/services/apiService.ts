import axios from 'axios';
import type { NLUResult } from '../types/intent';

export const API_BASE_URL = 'http://10.0.2.2:8000';

export async function parseTextIntent(text: string): Promise<NLUResult> {
  const response = await axios.post<NLUResult>(`${API_BASE_URL}/api/nlu/parse`, {
    text,
  });

  return response.data;
}
