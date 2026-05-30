import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Animated,
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
import { getEventsByDate, initDatabase, deleteEvent } from '../services/storageService';
import {
  playFromUrl,
  requestRecordPermission,
  startRecording,
  stopRecording,
  stopPlayer,
} from '../services/voiceService';
import type { VoiceState } from '../services/voiceService';
import type { CalendarEvent } from '../types/event';

const today = new Date().toISOString().slice(0, 10);

export function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [debugText, setDebugText] = useState('');
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    let isActive = true;
    async function loadEvents() {
      try {
        await initDatabase();
        if (isActive) {
          const events = await getEventsByDate(selectedDate);
          setSelectedEvents(events);
        }
      } catch {
        // 数据库初始化失败时静默处理
      }
    }
    loadEvents();
    return () => { isActive = false; };
  }, [selectedDate]);

  const reloadEvents = useCallback(async (date: string) => {
    const events = await getEventsByDate(date);
    setSelectedEvents(events);
  }, []);

  // --- 录音脉冲动画 ---
  useEffect(() => {
    if (voiceState === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [voiceState, pulseAnim]);

  // --- 处理 NLU 结果 ---
  const handleIntentResult = useCallback(async (intent: { intent: string | null; title: string | null; date: string | null; time: string | null; raw: string }) => {
    const result = await applyIntent(intent as any);

    if (result.type === 'added') {
      setSelectedDate(result.event.date);
      await reloadEvents(result.event.date);
      setStatusMessage('已添加：' + result.event.title);
      return;
    }
    if (result.type === 'query') {
      setSelectedDate(result.date);
      setSelectedEvents(result.events);
      setStatusMessage(result.events.length > 0
        ? '查询到 ' + result.events.length + ' 个日程'
        : '该日期暂无日程');
      return;
    }
    if (result.type === 'delete_candidates') {
      if (result.events.length === 0) {
        setStatusMessage('未找到匹配的日程');
        return;
      }
      if (result.events.length === 1) {
        const event = result.events[0];
        Alert.alert(
          '确认删除',
          '删除「' + event.title + '」(' + (event.time || '全天') + ')？',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '删除',
              style: 'destructive',
              onPress: async () => {
                await deleteEvent(event.id);
                await reloadEvents(selectedDate);
                setStatusMessage('已删除：' + event.title);
              },
            },
          ],
        );
        return;
      }
      // 多个候选：列出选择
      const buttons = result.events.map(e => ({
        text: e.time ? e.time + ' ' + e.title : e.title,
        onPress: async () => {
          await deleteEvent(e.id);
          await reloadEvents(selectedDate);
          setStatusMessage('已删除：' + e.title);
        },
      }));
      Alert.alert(
        '选择要删除的日程',
        '找到 ' + result.events.length + ' 个匹配日程',
        [
          ...result.events.map(e => ({
            text: (e.time ? e.time + ' ' : '') + e.title,
            onPress: async () => {
              await deleteEvent(e.id);
              await reloadEvents(selectedDate);
              setStatusMessage('已删除：' + e.title);
            },
          })),
          { text: '取消', style: 'cancel' },
        ],
      );
      return;
    }
    setStatusMessage(result.message || '抱歉没理解，请换个说法');
  }, [selectedDate, reloadEvents]);

  // --- 文本输入 ---
  const handleDebugSubmit = useCallback(async () => {
    const text = debugText.trim();
    if (!text) return;
    try {
      setStatusMessage('正在解析...');
      const intent = await parseTextIntent(text);
      await handleIntentResult(intent);
      setDebugText('');
    } catch (e: any) {
      setStatusMessage('解析失败：' + (e?.message || '请检查网络'));
    }
  }, [debugText, handleIntentResult]);

  // --- 语音操作 ---
  const handleVoiceStart = useCallback(async () => {
    if (voiceState !== 'idle') return;
    const granted = await requestRecordPermission();
    if (!granted) {
      setStatusMessage('需要录音权限');
      return;
    }
    try {
      await startRecording();
      setVoiceState('recording');
      setStatusMessage('正在录音...');
    } catch {
      setStatusMessage('录音启动失败');
    }
  }, [voiceState]);

  const handleVoiceStop = useCallback(async () => {
    if (voiceState !== 'recording') return;
    setVoiceState('processing');
    setStatusMessage('处理中...');
    try {
      const path = await stopRecording();
      const result = await processVoice(path);

      if (result.text) {
        setStatusMessage('识别：' + result.text);
      }

      if (result.event?.intent) {
        await handleIntentResult(result.event);
      } else if (result.reply_text) {
        setStatusMessage(result.reply_text);
      }

      if (result.reply_text) {
        playFromUrl(API_BASE_URL + '/api/tts/speak?text=' + encodeURIComponent(result.reply_text));
      }
    } catch {
      setStatusMessage('语音处理失败，请重试');
    } finally {
      setVoiceState('idle');
    }
  }, [voiceState, handleIntentResult]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 标题 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>VocaCal</Text>
            <Text style={styles.subtitle}>语音日历助手</Text>
          </View>
        </View>

        {/* 日历 */}
        <View style={styles.calendarPanel}>
          <Calendar
            onDayPress={(day: any) => setSelectedDate(day.dateString)}
            markedDates={{
              [selectedDate]: { selected: true, selectedColor: '#6C5CE7' },
            }}
            theme={{
              todayTextColor: '#FDCB6E',
              selectedDayBackgroundColor: '#6C5CE7',
              arrowColor: '#6C5CE7',
              textDayFontWeight: '400',
              textMonthFontWeight: '700',
            }}
          />
        </View>

        {/* 文本输入（调试用，保留但风格统一） */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={debugText}
            onChangeText={setDebugText}
            placeholder="输入指令，如：明天下午三点开会"
            placeholderTextColor="#636E72"
            onSubmitEditing={handleDebugSubmit}
            returnKeyType="send"
          />
          <Pressable style={styles.sendButton} onPress={handleDebugSubmit}>
            <Text style={styles.sendButtonText}>发送</Text>
          </Pressable>
        </View>

        {/* 状态消息 */}
        {statusMessage ? (
          <Text style={styles.statusMessage}>{statusMessage}</Text>
        ) : null}

        {/* 日程列表 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{formatDateLabel(selectedDate)}</Text>
          <Text style={styles.sectionMeta}>{selectedEvents.length} 个日程</Text>
        </View>

        <ScrollView style={styles.eventList} contentContainerStyle={styles.eventListContent}>
          {selectedEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>暂无日程</Text>
              <Text style={styles.emptyText}>按住下方麦克风语音添加{'\n'}或输入文字指令</Text>
            </View>
          ) : (
            selectedEvents.map(event => (
              <View key={event.id} style={styles.eventCard}>
                <View style={[styles.eventAccent, { backgroundColor: getTimeColor(event.time) }]} />
                <View style={styles.eventBody}>
                  {event.time ? <Text style={styles.eventTime}>{event.time}</Text> : null}
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  {event.note ? <Text style={styles.eventNote}>{event.note}</Text> : null}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* 语音按钮 */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Pressable
            style={[
              styles.voiceButton,
              voiceState === 'recording' && styles.voiceButtonRecording,
              voiceState === 'processing' && styles.voiceButtonProcessing,
            ]}
            onPressIn={handleVoiceStart}
            onPressOut={handleVoiceStop}
            disabled={voiceState === 'processing'}
          >
            <Text style={styles.voiceButtonIcon}>
              {voiceState === 'recording' ? '●' : voiceState === 'processing' ? '···' : '🎙️'}
            </Text>
            <Text style={styles.voiceButtonText}>
              {voiceState === 'recording' ? '松开结束' : voiceState === 'processing' ? '处理中' : '按住说话'}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

function formatDateLabel(dateString: string) {
  const d = new Date(dateString + 'T00:00:00');
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + weekday;
}

function getTimeColor(time: string | null) {
  if (!time) return '#6C5CE7';
  const hour = parseInt(time.split(':')[0], 10);
  if (hour < 12) return '#74b9ff';
  if (hour < 18) return '#6C5CE7';
  return '#a29bfe';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  container: { flex: 1, paddingHorizontal: 16, paddingBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, paddingBottom: 14 },
  title: { color: '#2D3436', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#636E72', fontSize: 13, marginTop: 2 },
  calendarPanel: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#eaecf0', overflow: 'hidden' },
  inputRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  textInput: { flex: 1, height: 42, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#d0d5dd', paddingHorizontal: 12, fontSize: 14, color: '#2D3436' },
  sendButton: { backgroundColor: '#6C5CE7', borderRadius: 12, paddingHorizontal: 16, height: 42, justifyContent: 'center', alignItems: 'center' },
  sendButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  statusMessage: { color: '#636E72', fontSize: 13, lineHeight: 19, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 18, paddingBottom: 10 },
  sectionTitle: { color: '#2D3436', fontSize: 17, fontWeight: '600' },
  sectionMeta: { color: '#636E72', fontSize: 13 },
  eventList: { flex: 1 },
  eventListContent: { paddingBottom: 96 },
  emptyState: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#eaecf0', paddingHorizontal: 20, paddingVertical: 28 },
  emptyTitle: { color: '#2D3436', fontSize: 16, fontWeight: '600' },
  emptyText: { color: '#636E72', fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  eventCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#eaecf0', flexDirection: 'row', marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  eventAccent: { width: 4 },
  eventBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 12 },
  eventTime: { color: '#6C5CE7', fontSize: 13, fontWeight: '600' },
  eventTitle: { color: '#2D3436', fontSize: 16, fontWeight: '600', marginTop: 4 },
  eventNote: { color: '#636E72', fontSize: 13, lineHeight: 19, marginTop: 5 },
  voiceButton: { position: 'absolute', bottom: 24, alignSelf: 'center', width: 72, height: 72, borderRadius: 36, backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center', shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 8 },
  voiceButtonIcon: { color: '#fff', fontSize: 20 },
  voiceButtonText: { color: '#fff', fontSize: 10, marginTop: 2 },
  voiceButtonRecording: { backgroundColor: '#E17055' },
  voiceButtonProcessing: { backgroundColor: '#636E72' },
});