import axios from 'axios';
import {Platform} from 'react-native';
import type { NLUResult } from '../types/intent';

// ====== 真机调试：把下面的 IP 改成你电脑的局域网 IP ======
// 运行 ipconfig 查看，一般是 192.168.x.x
const REAL_DEVICE_IP = '192.168.1.36';
// ========================================================

const EMULATOR_IP = '10.0.2.2';

// __DEV__ 为 true 时是开发模式；真机和模拟器都走这里
// 如果是 Android 模拟器用 10.0.2.2，否则（真机/iOS）用局域网 IP
function getBaseUrl(): string {
  if (Platform.OS === 'android') {
    // 简单判断：如果能连 10.0.2.2 就是模拟器，否则是真机
    // 实际开发中直接改 REAL_DEVICE_IP 即可
    return `http://${REAL_DEVICE_IP}:8000`;
  }
  return `http://${REAL_DEVICE_IP}:8000`;
}

export const API_BASE_URL = getBaseUrl();

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
