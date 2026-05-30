import { PermissionsAndroid, Platform } from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

export type VoiceState = 'idle' | 'recording' | 'processing';

const audioRecorderPlayer = new AudioRecorderPlayer();

export async function requestRecordPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export async function startRecording(): Promise<void> {
  const path = Platform.select({
    android: 'sdcard/vocalcal_record.m4a',
    ios: 'vocalcal_record.m4a',
  });

  await audioRecorderPlayer.startRecorder(path);
  audioRecorderPlayer.setSubscriptionDuration(0.1);
}

export async function stopRecording(): Promise<string> {
  const result = await audioRecorderPlayer.stopRecorder();
  return result;
}

export async function playFromUrl(url: string): Promise<void> {
  try {
    await audioRecorderPlayer.startPlayer(url);
    audioRecorderPlayer.setVolume(1.0);
  } catch {
    // TTS 播放失败不影响主流程
  }
}

export async function stopPlayer(): Promise<void> {
  try {
    await audioRecorderPlayer.stopPlayer();
  } catch {
    // ignore
  }
}