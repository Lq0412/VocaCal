import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseTextIntent, processVoice, API_BASE_URL } from '../services/apiService';
import { applyIntent } from '../services/calendarIntentService';
import { getEventsByDate, initDatabase } from '../services/storageService';
import {
  playFromUrl,
  requestRecordPermission,
  startRecording,
  stopRecording,
} from '../services/voiceService';
import type { VoiceState } from '../services/voiceService';
import type { CalendarEvent } from '../types/event';

const today = new Date().toISOString().slice(0, 10);

export function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  const [debugText, setDebugText] = useState('');
  const [debugResult, setDebugResult] = useState('');
  const [storageError, setStorageError] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');

  useEffect(() => {
    let isActive = true;

    async function loadEvents() {
      try {
        await initDatabase();
        const events = await getEventsByDate(selectedDate);

        if (isActive) {
          setSelectedEvents(events);
          setStorageError('');
        }
      } catch (e: any) {
        if (isActive) {
          setStorageError('数据库错误: ' + (e?.message || String(e)));
          setSelectedEvents([]);
        }
      }
    }

    loadEvents();

    return () => {
      isActive = false;
    };
  }, [selectedDate]);

  async function reloadEvents(date: string) {
    const events = await getEventsByDate(date);
    setSelectedEvents(events);
    setStorageError('');
  }

  async function handleDebugSubmit() {
    const text = debugText.trim();

    if (!text) {
      setDebugResult('请输入一句日程指令');
      return;
    }

    try {
      setDebugResult('正在解析...');
      const intent = await parseTextIntent(text);
      setDebugResult('NLU结果: intent=' + intent.intent + ' title=' + intent.title + ' date=' + intent.date + ' time=' + intent.time);

      const result = await applyIntent(intent);

      if (result.type === 'added') {
        setSelectedDate(result.event.date);
        await reloadEvents(result.event.date);
        setDebugResult('已添加：' + result.event.title);
        setDebugText('');
        return;
      }

      if (result.type === 'query') {
        setSelectedDate(result.date);
        setSelectedEvents(result.events);
        setDebugResult('查询到 ' + result.events.length + ' 个日程');
        return;
      }

      if (result.type === 'delete_candidates') {
        setDebugResult('找到 ' + result.events.length + ' 个待删除日程');
        return;
      }

      setDebugResult(result.message);
    } catch (e: any) {
      setDebugResult('错误: ' + (e?.message || String(e)));
    }
  }

  async function handleVoiceStart() {
    if (voiceState !== 'idle') {
      return;
    }

    const granted = await requestRecordPermission();
    if (!granted) {
      setDebugResult('需要录音权限才能使用语音功能');
      return;
    }

    try {
      await startRecording();
      setVoiceState('recording');
    } catch (e: any) {
      if (e?.message === 'VOICE_NOT_AVAILABLE') {
        setDebugResult('语音录音暂不可用，请使用文本输入调试');
      } else {
        setDebugResult('录音启动失败');
      }
    }
  }

  async function handleVoiceStop() {
    if (voiceState !== 'recording') {
      return;
    }

    setVoiceState('processing');

    try {
      const path = await stopRecording();
      const result = await processVoice(path);

      setDebugResult(result.text ? '识别：' + result.text : '未识别到语音');

      if (result.event?.intent) {
        const applyResult = await applyIntent(result.event);

        if (applyResult.type === 'added') {
          setSelectedDate(applyResult.event.date);
          await reloadEvents(applyResult.event.date);
          setDebugResult('已添加：' + applyResult.event.title);
        } else if (applyResult.type === 'query') {
          setSelectedDate(applyResult.date);
          setSelectedEvents(applyResult.events);
          setDebugResult('查询到 ' + applyResult.events.length + ' 个日程');
        } else if (applyResult.type === 'delete_candidates') {
          setDebugResult('找到 ' + applyResult.events.length + ' 个待删除日程');
        } else {
          setDebugResult(applyResult.message);
        }
      } else if (result.reply_text) {
        setDebugResult(result.reply_text);
      }

      if (result.reply_text) {
        const ttsUrl = API_BASE_URL + '/api/tts/speak?text=' + encodeURIComponent(result.reply_text);
        playFromUrl(ttsUrl);
      }
    } catch (e: any) {
      setDebugResult('语音错误: ' + (e?.message || String(e)));
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>VocaCal</Text>
            <Text style={styles.subtitle}>语音日历助手</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>调试模式</Text>
          </View>
        </View>

        <View style={styles.calendarPanel}>
          <Calendar
            onDayPress={(day: any) => setSelectedDate(day.dateString)}
            markedDates={{
              [selectedDate]: {selected: true, selectedColor: '#1677ff'},
            }}
            theme={{
              todayTextColor: '#1677ff',
              selectedDayBackgroundColor: '#1677ff',
              arrowColor: '#1677ff',
            }}
          />
        </View>

        <View style={styles.debugPanel}>
          <TextInput
            style={styles.debugInput}
            value={debugText}
            onChangeText={setDebugText}
            placeholder="输入指令调试，如：明天下午三点开会"
            placeholderTextColor="#98a2b3"
            onSubmitEditing={handleDebugSubmit}
            returnKeyType="send"
          />
          <Pressable style={styles.debugButton} onPress={handleDebugSubmit}>
            <Text style={styles.debugButtonText}>发送</Text>
          </Pressable>
        </View>

        {debugResult ? (
          <Text style={styles.debugResult}>{debugResult}</Text>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {formatDateLabel(selectedDate)}
          </Text>
          <Text style={styles.sectionMeta}>
            {selectedEvents.length} 个日程
          </Text>
        </View>

        {storageError ? (
          <Text style={[styles.debugResult, {color: '#e03131'}]}>{storageError}</Text>
        ) : null}

        <ScrollView
          style={styles.eventList}
          contentContainerStyle={styles.eventListContent}
        >
          {selectedEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>暂无日程</Text>
              <Text style={styles.emptyText}>
                使用上方输入框添加，或按住麦克风语音添加
              </Text>
            </View>
          ) : (
            selectedEvents.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventAccent} />
                <View style={styles.eventBody}>
                  {event.time ? (
                    <Text style={styles.eventTime}>{event.time}</Text>
                  ) : null}
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  {event.note ? (
                    <Text style={styles.eventNote}>{event.note}</Text>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <Pressable
          style={[
            styles.voiceButton,
            voiceState === 'recording' && styles.voiceButtonActive,
            voiceState === 'processing' && styles.voiceButtonProcessing,
          ]}
          onPressIn={handleVoiceStart}
          onPressOut={handleVoiceStop}
          disabled={voiceState === 'processing'}
        >
          <Text style={styles.voiceButtonIcon}>
            {voiceState === 'recording'
              ? '●'
              : voiceState === 'processing'
                ? '···'
                : 'MIC'}
          </Text>
          <Text style={styles.voiceButtonText}>
            {voiceState === 'recording'
              ? '松开结束'
              : voiceState === 'processing'
                ? '处理中'
                : '按住说话'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function formatDateLabel(dateString: string) {
  const date = new Date(dateString + 'T00:00:00');
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
  return month + '月' + day + '日 ' + weekday;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 14,
    paddingTop: 10,
  },
  title: {
    color: '#101828',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#667085',
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#e6f4ff',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    color: '#1677ff',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarPanel: {
    backgroundColor: '#ffffff',
    borderColor: '#eaecf0',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  debugPanel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  debugInput: {
    backgroundColor: '#ffffff',
    borderColor: '#d0d5dd',
    borderRadius: 8,
    borderWidth: 1,
    color: '#101828',
    flex: 1,
    fontSize: 14,
    height: 42,
    paddingHorizontal: 12,
  },
  debugButton: {
    alignItems: 'center',
    backgroundColor: '#1677ff',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  debugButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  debugResult: {
    color: '#475467',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    paddingTop: 18,
  },
  sectionTitle: {
    color: '#101828',
    fontSize: 17,
    fontWeight: '600',
  },
  sectionMeta: {
    color: '#667085',
    fontSize: 13,
  },
  eventList: {
    flex: 1,
  },
  eventListContent: {
    paddingBottom: 96,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#eaecf0',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  emptyTitle: {
    color: '#101828',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  eventCard: {
    backgroundColor: '#ffffff',
    borderColor: '#eaecf0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    overflow: 'hidden',
  },
  eventAccent: {
    backgroundColor: '#1677ff',
    width: 4,
  },
  eventBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eventTime: {
    color: '#1677ff',
    fontSize: 13,
    fontWeight: '600',
  },
  eventTitle: {
    color: '#101828',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  eventNote: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  voiceButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#1677ff',
    borderRadius: 32,
    bottom: 24,
    height: 64,
    justifyContent: 'center',
    position: 'absolute',
    width: 64,
  },
  voiceButtonIcon: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  voiceButtonText: {
    color: '#ffffff',
    fontSize: 10,
    marginTop: 2,
  },
  voiceButtonActive: {
    backgroundColor: '#e03131',
    transform: [{scale: 1.1}],
  },
  voiceButtonProcessing: {
    backgroundColor: '#868e96',
  },
});
