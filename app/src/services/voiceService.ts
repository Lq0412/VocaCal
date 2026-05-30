import { Alert, PermissionsAndroid, Platform } from 'react-native';

export type VoiceState = 'idle' | 'recording' | 'processing';

export async function requestRecordPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function startRecording(): Promise<string> {
  throw new Error('VOICE_NOT_AVAILABLE');
}

export async function stopRecording(): Promise<string> {
  throw new Error('VOICE_NOT_AVAILABLE');
}

export async function playFromUrl(_url: string): Promise<void> {
  // TTS 播放需要 react-native-audio-recorder-player，暂不可用
}
