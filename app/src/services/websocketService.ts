/**
 * WebSocket 语音流客户端
 *
 * 连接后端 /ws/voice，实现：
 * - 实时发送 PCM 音频块
 * - 接收 ASR 文本、NLU 结果、TTS 音频块
 * - TTS 音频块到达即回调，前端可边收边播
 */

import { NativeModules } from 'react-native';
import { API_BASE_URL } from './apiService';
import type { NLUResult } from '../types/intent';

const { AudioModule } = NativeModules;

/** WS 消息类型 */
export interface ASRFinalMsg {
  type: 'asr_final';
  text: string;
}

export interface NLUResultMsg {
  type: 'nlu_result';
  intent: string | null;
  event: NLUResult | null;
  reply_text: string;
}

export interface TTSEndMsg {
  type: 'tts_end';
}

export interface ErrorMsg {
  type: 'error';
  message: string;
}

export type WSMessage = ASRFinalMsg | NLUResultMsg | TTSEndMsg | ErrorMsg;

export interface WebSocketVoiceCallbacks {
  onASRFinal?: (text: string) => void;
  onNLUResult?: (msg: NLUResultMsg) => void;
  onTTSEnd?: () => void;
  onError?: (message: string) => void;
}

/**
 * 创建 WebSocket 语音会话，返回控制对象。
 *
 * 使用方式：
 *   const session = createVoiceSession({ onASRFinal, onNLUResult, onTTSEnd });
 *   await session.start();           // 建连 + 开始录音
 *   // ... 用户松手时
 *   await session.stop();            // 停录音 + 等结果
 */
export function createVoiceSession(callbacks: WebSocketVoiceCallbacks) {
  let ws: WebSocket | null = null;
  let audioChunkListener: ((b64: string) => void) | null = null;

  return {
    async start() {
      const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/ws/voice';
      ws = new WebSocket(wsUrl);

      // 等连接打开
      await new Promise<void>((resolve, reject) => {
        ws!.onopen = () => resolve();
        ws!.onerror = (e: any) => reject(new Error('WebSocket 连接失败'));
        setTimeout(() => reject(new Error('WebSocket 连接超时')), 10000);
      });

      // 发送 audio_start
      ws!.send(JSON.stringify({ type: 'audio_start' }));

      // 监听原生模块的 PCM 音频块事件
      const { DeviceEventEmitter } = require('react-native');
      audioChunkListener = (b64: string) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          // base64 → ArrayBuffer → 发送二进制帧
          const binary = base64ToArrayBuffer(b64);
          ws!.send(binary);
        }
      };
      DeviceEventEmitter.addListener('AudioChunk', audioChunkListener);

      // 启动流式录音
      await AudioModule.startStreamingRecording();

      // 处理服务端消息
      ws!.onmessage = (event: WebSocketMessageEvent) => {
        if (typeof event.data === 'string') {
          const msg = JSON.parse(event.data) as WSMessage;
          switch (msg.type) {
            case 'asr_final':
              callbacks.onASRFinal?.(msg.text);
              break;
            case 'nlu_result':
              callbacks.onNLUResult?.(msg);
              break;
            case 'tts_end':
              callbacks.onTTSEnd?.();
              break;
            case 'error':
              callbacks.onError?.(msg.message);
              break;
          }
        } else if (event.data instanceof ArrayBuffer) {
          // TTS PCM 音频块 → base64 → 喂给原生 AudioTrack
          const b64 = arrayBufferToBase64(event.data);
          AudioModule.feedPCMChunk(b64);
        }
      };

      ws!.onerror = () => {
        callbacks.onError?.('连接中断');
      };

      ws!.onclose = () => {
        // 清理
      };
    },

    async stop() {
      // 停止录音
      try { await AudioModule.stopStreamingRecording(); } catch {}
      // 移除音频块监听
      if (audioChunkListener) {
        const { DeviceEventEmitter } = require('react-native');
        DeviceEventEmitter.removeListener('AudioChunk', audioChunkListener);
        audioChunkListener = null;
      }
      // 发送 audio_end
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws!.send(JSON.stringify({ type: 'audio_end' }));
      }
    },

    async startPCMPlayback() {
      await AudioModule.startPCMPlayback();
    },

    async stopPCMPlayback() {
      try { await AudioModule.stopPCMPlayback(); } catch {}
    },

    close() {
      if (audioChunkListener) {
        const { DeviceEventEmitter } = require('react-native');
        DeviceEventEmitter.removeListener('AudioChunk', audioChunkListener);
        audioChunkListener = null;
      }
      if (ws) {
        ws.close();
        ws = null;
      }
    },
  };
}

// ── 工具函数 ──

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
