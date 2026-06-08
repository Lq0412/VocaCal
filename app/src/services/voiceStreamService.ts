/**
 * 流式语音服务 — 通过 WebSocket 边录边传，大幅降低延迟
 *
 * 时序：
 *   按住按钮 → startStream() → 打开 WebSocket + 开始流式录音
 *   录音中 → AudioModule 每100ms 发射 base64 PCM chunk → WebSocket 发送文本
 *   松开按钮 → stopStream() → 发送 END → 等待后端返回 NLU 结果
 *
 * 协议（全部文本帧，无需二进制）：
 *   客户端→服务端: base64 PCM 字符串 | "END"
 *   服务端→客户端: JSON {"type":"result", ...} | {"type":"error", ...}
 */

import {
  NativeModules,
  NativeEventEmitter,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import type {NLUResult} from '../types/intent';
import {API_BASE_URL} from './apiService';

const {AudioModule} = NativeModules;

export interface StreamResult {
  text: string;
  intent: string | null;
  event: NLUResult | null;
  reply_text: string;
}

const WS_URL = API_BASE_URL.replace(/^http/, 'ws') + '/ws/voice';

let ws: WebSocket | null = null;
let audioEmitter: NativeEventEmitter | null = null;
let audioSubscription: any = null;
let resultResolver: ((result: StreamResult) => void) | null = null;
let resultRejecter: ((err: Error) => void) | null = null;

/**
 * 请求录音权限
 */
export async function requestStreamPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * 开始流式语音会话：建 WebSocket + 启动流式录音
 */
export async function startStream(): Promise<void> {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(WS_URL);

    const timeout = setTimeout(() => {
      reject(new Error('WebSocket 连接超时'));
      ws?.close();
      ws = null;
    }, 5000);

    ws.onopen = () => {
      clearTimeout(timeout);
      startAudioCapture();
      resolve();
    };

    ws.onerror = (e: any) => {
      clearTimeout(timeout);
      reject(new Error('WebSocket 连接失败'));
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === 'result' && resultResolver) {
          resultResolver({
            text: data.text || '',
            intent: data.intent || null,
            event: data.event || null,
            reply_text: data.reply_text || '',
          });
          resultResolver = null;
          resultRejecter = null;
          cleanup();
        } else if (data.type === 'error' && resultRejecter) {
          resultRejecter(new Error(data.message || '服务端错误'));
          resultResolver = null;
          resultRejecter = null;
          cleanup();
        }
      } catch {
        // non-JSON message, ignore
      }
    };

    ws.onclose = () => {
      if (resultRejecter) {
        resultRejecter(new Error('连接断开'));
        resultResolver = null;
        resultRejecter = null;
      }
    };
  });
}

/**
 * 停止录音并等待后端返回结果
 */
export function stopStream(): Promise<StreamResult> {
  stopAudioCapture();

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send('END');
  }

  return new Promise((resolve, reject) => {
    resultResolver = resolve;
    resultRejecter = reject;

    setTimeout(() => {
      if (resultRejecter) {
        resultRejecter(new Error('处理超时'));
        resultResolver = null;
        resultRejecter = null;
        cleanup();
      }
    }, 15000);
  });
}

/**
 * 取消当前流式会话
 */
export function cancelStream(): void {
  stopAudioCapture();
  cleanup();
}

// ==================== 内部实现 ====================

function startAudioCapture() {
  if (!audioEmitter) {
    audioEmitter = new NativeEventEmitter(AudioModule);
  }

  audioSubscription = audioEmitter.addListener(
    'onAudioChunk',
    (event: {audio: string}) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(event.audio);
      }
    },
  );

  AudioModule.startStreaming();
}

function stopAudioCapture() {
  if (audioSubscription) {
    audioSubscription.remove();
    audioSubscription = null;
  }
  try {
    AudioModule.stopStreaming();
  } catch {
    // ignore if already stopped
  }
}

function cleanup() {
  if (ws) {
    ws.close();
    ws = null;
  }
}
