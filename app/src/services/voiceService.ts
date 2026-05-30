/**
 * 语音服务 — 录音、停止录音、TTS 播放
 *
 * 使用原生 AudioModule 实现：
 * - 录音格式：m4a（Android MediaRecorder）
 * - TTS 播放：MediaPlayer 流式播放
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
 * 开始录音，保存到缓存目录
 */
export async function startRecording(): Promise<void> {
  await AudioModule.startRecording();
}

/**
 * 停止录音并返回音频文件路径
 */
export async function stopRecording(): Promise<string> {
  return await AudioModule.stopRecording();
}

/**
 * 从 URL 播放音频（用于 TTS 语音回复）
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
