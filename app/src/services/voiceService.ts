/**
 * 语音服务 — 录音、停止录音、TTS 播放
 *
 * 使用原生 AudioModule 实现：
 * - 录音格式：PCM 16kHz 16bit mono（AudioRecord）
 * - TTS 播放：MediaPlayer 流式播放（旧）/ AudioTrack PCM 流式播放（新）
 */

import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

export type VoiceState = 'idle' | 'recording' | 'processing';

const { AudioModule } = NativeModules;

/**
 * 请求 Android 录音权限（iOS 自动弹窗，无需手动请求）
 */
export async function requestRecordPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * 开始录音，保存到缓存目录（旧接口，保留兼容）
 */
export async function startRecording(): Promise<void> {
  await AudioModule.startRecording();
}

/**
 * 停止录音并返回音频文件路径（旧接口，保留兼容）
 */
export async function stopRecording(): Promise<string> {
  return await AudioModule.stopRecording();
}

/**
 * 开始流式录音：PCM 块通过 AudioChunk 事件实时推送
 */
export async function startStreamingRecording(): Promise<void> {
  await AudioModule.startStreamingRecording();
}

/**
 * 停止流式录音
 */
export async function stopStreamingRecording(): Promise<void> {
  await AudioModule.stopStreamingRecording();
}

/**
 * 开始 PCM 流式播放（用于 WebSocket TTS）
 */
export async function startPCMPlayback(): Promise<void> {
  await AudioModule.startPCMPlayback();
}

/**
 * 喂入一块 PCM 音频（base64 编码）
 */
export async function feedPCMChunk(base64Chunk: string): Promise<void> {
  await AudioModule.feedPCMChunk(base64Chunk);
}

/**
 * 停止 PCM 流式播放
 */
export async function stopPCMPlayback(): Promise<void> {
  try {
    await AudioModule.stopPCMPlayback();
  } catch {
    // ignore
  }
}

/**
 * 从 URL 播放音频（用于 TTS 语音回复，旧接口保留）
 */
export async function playFromUrl(url: string): Promise<void> {
  try {
    await AudioModule.playFromUrl(url);
  } catch {
    // TTS 播放失败不影响主流程
  }
}

/**
 * 停止音频播放
 */
export async function stopPlayer(): Promise<void> {
  try {
    await AudioModule.stopPlayer();
  } catch {
    // ignore
  }
}
