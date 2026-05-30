/**
 * 语音服务 — 录音、停止录音、TTS 播放
 *
 * 使用 react-native-audio-recorder-player 实现：
 * - 录音格式：m4a（Android/iOS 原生支持）
 * - TTS 播放：直接从后端 URL 流式播放 WAV
 */

import { PermissionsAndroid, Platform } from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

export type VoiceState = 'idle' | 'recording' | 'processing';

const audioRecorderPlayer = new AudioRecorderPlayer();

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
 * 开始录音，保存到设备存储
 */
export async function startRecording(): Promise<void> {
  const path = Platform.select({
    android: 'sdcard/vocalcal_record.m4a',
    ios: 'vocalcal_record.m4a',
  });

  await audioRecorderPlayer.startRecorder(path);
  audioRecorderPlayer.setSubscriptionDuration(0.1);
}

/**
 * 停止录音并返回音频文件路径
 */
export async function stopRecording(): Promise<string> {
  const result = await audioRecorderPlayer.stopRecorder();
  return result;
}

/**
 * 从 URL 播放音频（用于 TTS 语音回复）
 */
export async function playFromUrl(url: string): Promise<void> {
  try {
    await audioRecorderPlayer.startPlayer(url);
    audioRecorderPlayer.setVolume(1.0);
  } catch {
    // TTS 播放失败不影响主流程，用户可以看文字
  }
}

/**
 * 停止音频播放
 */
export async function stopPlayer(): Promise<void> {
  try {
    await audioRecorderPlayer.stopPlayer();
  } catch {
    // ignore
  }
}
