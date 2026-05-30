import axios from 'axios';
import type { NLUResult } from '../types/intent';

export const API_BASE_URL = 'http://10.0.2.2:8000';

export interface VoiceProcessResponse {
  text: string;
  intent: string | null;
  event: NLUResult | null;
  reply_text: string;
  reply_audio: string;
}

export async function parseTextIntent(text: string): Promise<NLUResult> {
  const response = await axios.post<NLUResult>(`${API_BASE_URL}/api/nlu/parse`, {
    text,
  });

  return response.data;
}

export async function processVoice(
  audioPath: string,
): Promise<VoiceProcessResponse> {
  const formData = new FormData();
  const uri = audioPath.startsWith('file://')
    ? audioPath
    : `file://${audioPath}`;

  // @ts-expect-error React Native FormData supports object for file upload
  formData.append('audio', {
    uri,
    type: 'audio/wav',
    name: 'audio.wav',
  });

  const response = await axios.post<VoiceProcessResponse>(
    `${API_BASE_URL}/api/voice/process`,
    formData,
    {headers: {'Content-Type': 'multipart/form-data'}},
  );

  return response.data;
}
