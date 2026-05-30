/**
 * CalendarScreen — VocaCal 主界面
 *
 * 功能：
 * - 语音/文字添加、查询、删除日程
 * - 日历标记已有事件日期（小圆点）
 * - 删除确认弹窗（单选/多选）
 * - 事件卡片长按删除
 * - 录音脉冲动画
 * - TTS 语音回复播放
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
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
import {
  deleteEvent,
  getAllEventDates,
  getEventsByDate,
  initDatabase,
} from '../services/storageService';
import {
  playFromUrl,
  requestRecordPermission,
  startRecording,
  stopRecording,
} from '../services/voiceService';
import type { VoiceState } from '../services/voiceService';
import type { CalendarEvent } from '../types/event';

const today = new Date().toISOString().slice(0, 10);

/** 主界面组件 */
export function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  const [eventDates, setEventDates] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [debugText, setDebugText] = useState('');
  const [pulseAnim] = useState(new Animated.Value(1));
  const [deleteCandidates, setDeleteCandidates] = useState<CalendarEvent[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const pulseAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // --- 加载事件 ---
  useEffect(() => {
    let isActive = true;
    async function loadEvents() {
      try {
        await initDatabase();
        if (isActive) {
          const events = await getEventsByDate(selectedDate);
          setSelectedEvents(events);
          // 加载所有有事件的日期
          const dates = await getAllEventDates();
          setEventDates(dates);
        }
      } catch (e: any) {
        if (isActive) {
          setStatusMessage('数据库错误: ' + (e?.message || String(e)));
        }
      }
    }
    loadEvents();
    return () => { isActive = false; };
  }, [selectedDate]);

  /** 刷新事件列表和日期标记 */
  const reloadEvents = useCallback(async (date: string) => {
    const events = await getEventsByDate(date);
    setSelectedEvents(events);
    const dates = await getAllEventDates();
    setEventDates(dates);
  }, []);

  // --- 录音脉冲动画 ---
  useEffect(() => {
    if (voiceState === 'recording') {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.18, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
      pulseAnimRef.current = animation;
      animation.start();
    } else {
      if (pulseAnimRef.current) {
        pulseAnimRef.current.stop();
        pulseAnimRef.current = null;
      }
      pulseAnim.setValue(1);
    }
  }, [voiceState, pulseAnim]);

  // --- 构建日历标记 ---
  const markedDates = React.useMemo(() => {
    const marks: Record<string, any> = {};
    for (const d of eventDates) {
      marks[d] = {
        marked: true,
        dotColor: '#6C5CE7',
      };
    }
    // 选中日期
    marks[selectedDate] = {
      ...(marks[selectedDate] || {}),
      selected: true,
      selectedColor: '#6C5CE7',
    };
    return marks;
  }, [eventDates, selectedDate]);

  // --- 处理 NLU 意图结果 ---
  const handleIntentResult = useCallback(async (intent: {
    intent: string | null;
    title: string | null;
    date: string | null;
    time: string | null;
    raw: string;
  }) => {
    const result = await applyIntent(intent as any);

    if (result.type === 'added') {
      setSelectedDate(result.event.date);
      await reloadEvents(result.event.date);
      setStatusMessage('✅ 已添加：' + result.event.title +
        (result.event.time ? '（' + result.event.time + '）' : ''));
      return;
    }

    if (result.type === 'query') {
      setSelectedDate(result.date);
      setSelectedEvents(result.events);
      if (result.events.length > 0) {
        const summary = result.events
          .map(e => (e.time ? e.time + ' ' : '') + e.title)
          .join('、');
        setStatusMessage('📋 ' + result.events.length + ' 个日程：' + summary);
      } else {
        setStatusMessage('📋 该日期暂无日程');
      }
      return;
    }

    if (result.type === 'delete_candidates') {
      if (result.events.length === 0) {
        setStatusMessage('❌ 未找到匹配的日程');
        return;
      }
      if (result.events.length === 1) {
        // 单条直接弹确认
        const event = result.events[0];
        Alert.alert(
          '确认删除',
          '删除「' + event.title + '」' + (event.time ? '（' + event.time + '）' : '（全天）') + '？',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '删除',
              style: 'destructive',
              onPress: async () => {
                await deleteEvent(event.id);
                await reloadEvents(selectedDate);
                setStatusMessage('🗑️ 已删除：' + event.title);
              },
            },
          ],
        );
        return;
      }
      // 多条 → 弹出自定义选择弹窗
      setDeleteCandidates(result.events);
      setShowDeleteModal(true);
      return;
    }

    setStatusMessage(result.message || '🤔 抱歉没理解，试试说：明天下午三点开会');
  }, [selectedDate, reloadEvents]);

  /** 删除单个事件（从弹窗中选择） */
  const handleDeleteFromModal = useCallback(async (event: CalendarEvent) => {
    await deleteEvent(event.id);
    const remaining = deleteCandidates.filter(e => e.id !== event.id);
    setDeleteCandidates(remaining);
    if (remaining.length === 0) {
      setShowDeleteModal(false);
    }
    await reloadEvents(selectedDate);
    setStatusMessage('🗑️ 已删除：' + event.title);
  }, [deleteCandidates, selectedDate, reloadEvents]);

  /** 长按事件卡片删除 */
  const handleEventLongPress = useCallback((event: CalendarEvent) => {
    Alert.alert(
      '删除日程',
      '确定删除「' + event.title + '」？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            await deleteEvent(event.id);
            await reloadEvents(selectedDate);
            setStatusMessage('🗑️ 已删除：' + event.title);
          },
        },
      ],
    );
  }, [selectedDate, reloadEvents]);

  // --- 文本输入调试 ---
  const handleDebugSubmit = useCallback(async () => {
    const text = debugText.trim();
    if (!text) return;
    try {
      setStatusMessage('⏳ 正在解析...');
      const intent = await parseTextIntent(text);
      await handleIntentResult(intent);
      setDebugText('');
    } catch (e: any) {
      setStatusMessage('❌ 解析失败：' + (e?.message || '请检查网络'));
    }
  }, [debugText, handleIntentResult]);

  // --- 语音操作 ---
  const handleVoiceStart = useCallback(async () => {
    if (voiceState !== 'idle') return;

    const granted = await requestRecordPermission();
    if (!granted) {
      setStatusMessage('⚠️ 需要录音权限才能使用语音功能');
      return;
    }

    try {
      await startRecording();
      setVoiceState('recording');
      setStatusMessage('🎙️ 正在录音，松开结束...');
    } catch {
      setStatusMessage('❌ 录音启动失败');
    }
  }, [voiceState]);

  const handleVoiceStop = useCallback(async () => {
    if (voiceState !== 'recording') return;

    setVoiceState('processing');
    setStatusMessage('⏳ 处理中...');

    try {
      const path = await stopRecording();
      const result = await processVoice(path);

      if (result.text) {
        setStatusMessage('🗣️ 识别：' + result.text);
      }

      if (result.event?.intent) {
        await handleIntentResult(result.event);
      } else if (result.reply_text) {
        setStatusMessage(result.reply_text);
      }

      // TTS 播放语音回复
      if (result.reply_text) {
        const ttsUrl = API_BASE_URL + '/api/tts/speak?text=' + encodeURIComponent(result.reply_text);
        playFromUrl(ttsUrl);
      }
    } catch (e: any) {
      setStatusMessage('❌ 语音处理失败：' + (e?.message || '请重试'));
    } finally {
      setVoiceState('idle');
    }
  }, [voiceState, handleIntentResult]);

  // ==================== 渲染 ====================

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 标题栏 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>VocaCal</Text>
            <Text style={styles.subtitle}>语音日历助手</Text>
          </View>
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>
              {new Date().getMonth() + 1}月{new Date().getDate()}日
            </Text>
          </View>
        </View>

        {/* 日历组件 */}
        <View style={styles.calendarPanel}>
          <Calendar
            onDayPress={(day: any) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              todayTextColor: '#FDCB6E',
              selectedDayBackgroundColor: '#6C5CE7',
              arrowColor: '#6C5CE7',
              textDayFontWeight: '400',
              textMonthFontWeight: '700',
              dotColor: '#6C5CE7',
              selectedDotColor: '#ffffff',
            }}
          />
        </View>

        {/* 文本输入 */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={debugText}
            onChangeText={setDebugText}
            placeholder="输入指令，如：明天下午三点开会"
            placeholderTextColor="#98a2b3"
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

        {/* 日程列表标题 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{formatDateLabel(selectedDate)}</Text>
          <Text style={styles.sectionMeta}>{selectedEvents.length} 个日程</Text>
        </View>

        {/* 日程列表 */}
        <ScrollView style={styles.eventList} contentContainerStyle={styles.eventListContent}>
          {selectedEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📅</Text>
              <Text style={styles.emptyTitle}>暂无日程</Text>
              <Text style={styles.emptyText}>
                按住下方麦克风语音添加{'\n'}或输入文字指令
              </Text>
            </View>
          ) : (
            selectedEvents.map(event => (
              <Pressable
                key={event.id}
                style={styles.eventCard}
                onLongPress={() => handleEventLongPress(event)}
              >
                <View style={[styles.eventAccent, { backgroundColor: getTimeColor(event.time) }]} />
                <View style={styles.eventBody}>
                  {event.time ? (
                    <Text style={styles.eventTime}>{event.time}</Text>
                  ) : (
                    <Text style={[styles.eventTime, { color: '#a29bfe' }]}>全天</Text>
                  )}
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  {event.note ? (
                    <Text style={styles.eventNote}>{event.note}</Text>
                  ) : null}
                </View>
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => handleEventLongPress(event)}
                  hitSlop={8}
                >
                  <Text style={styles.deleteButtonText}>✕</Text>
                </Pressable>
              </Pressable>
            ))
          )}
        </ScrollView>

        {/* 语音按钮 */}
        <Animated.View style={[styles.voiceButtonOuter, { transform: [{ scale: pulseAnim }] }]}>
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
              {voiceState === 'recording'
                ? '松开结束'
                : voiceState === 'processing'
                  ? '处理中'
                  : '按住说话'}
            </Text>
          </Pressable>
        </Animated.View>

        {/* 删除候选弹窗 */}
        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>选择要删除的日程</Text>
              <Text style={styles.modalSubtitle}>
                找到 {deleteCandidates.length} 个匹配日程
              </Text>
              <ScrollView style={styles.modalList}>
                {deleteCandidates.map(event => (
                  <Pressable
                    key={event.id}
                    style={styles.modalItem}
                    onPress={() => handleDeleteFromModal(event)}
                  >
                    <View style={styles.modalItemInfo}>
                      <Text style={styles.modalItemTime}>
                        {event.time || '全天'}
                      </Text>
                      <Text style={styles.modalItemTitle}>{event.title}</Text>
                    </View>
                    <Text style={styles.modalItemDelete}>删除</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable
                style={styles.modalCancel}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

// ==================== 工具函数 ====================

function formatDateLabel(dateString: string) {
  const d = new Date(dateString + 'T00:00:00');
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + weekday;
}

/** 根据时间段返回不同的强调色 */
function getTimeColor(time: string | null) {
  if (!time) return '#a29bfe';
  const hour = parseInt(time.split(':')[0], 10);
  if (hour < 12) return '#74b9ff';   // 上午：蓝
  if (hour < 18) return '#6C5CE7';   // 下午：紫
  return '#e17055';                   // 晚上：橙
}

// ==================== 样式 ====================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  // --- 标题栏 ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 14,
  },
  title: {
    color: '#2D3436',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1,
  },
  subtitle: {
    color: '#636E72',
    fontSize: 13,
    marginTop: 2,
  },
  todayBadge: {
    backgroundColor: '#6C5CE7',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  todayBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  // --- 日历 ---
  calendarPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eaecf0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  // --- 文本输入 ---
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d0d5dd',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#2D3436',
  },
  sendButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 14,
    paddingHorizontal: 18,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  // --- 状态消息 ---
  statusMessage: {
    color: '#475467',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    paddingHorizontal: 4,
  },

  // --- 日程列表 ---
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 10,
  },
  sectionTitle: {
    color: '#2D3436',
    fontSize: 17,
    fontWeight: '700',
  },
  sectionMeta: {
    color: '#636E72',
    fontSize: 13,
  },
  eventList: {
    flex: 1,
  },
  eventListContent: {
    paddingBottom: 100,
  },

  // --- 空状态 ---
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eaecf0',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#2D3436',
    fontSize: 17,
    fontWeight: '700',
  },
  emptyText: {
    color: '#636E72',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },

  // --- 事件卡片 ---
  eventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eaecf0',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  eventAccent: {
    width: 4,
    alignSelf: 'stretch',
  },
  eventBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eventTime: {
    color: '#6C5CE7',
    fontSize: 13,
    fontWeight: '700',
  },
  eventTitle: {
    color: '#2D3436',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 3,
  },
  eventNote: {
    color: '#636E72',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  deleteButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#b2bec3',
    fontSize: 16,
    fontWeight: '600',
  },

  // --- 语音按钮 ---
  voiceButtonOuter: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
  },
  voiceButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  voiceButtonIcon: {
    color: '#ffffff',
    fontSize: 20,
  },
  voiceButtonText: {
    color: '#ffffff',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  voiceButtonRecording: {
    backgroundColor: '#E17055',
  },
  voiceButtonProcessing: {
    backgroundColor: '#636E72',
  },

  // --- 删除确认弹窗 ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
    width: '100%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
  },
  modalTitle: {
    color: '#2D3436',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalSubtitle: {
    color: '#636E72',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  modalList: {
    maxHeight: 300,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemTime: {
    color: '#6C5CE7',
    fontSize: 12,
    fontWeight: '600',
  },
  modalItemTitle: {
    color: '#2D3436',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  modalItemDelete: {
    color: '#E17055',
    fontSize: 14,
    fontWeight: '700',
    paddingLeft: 16,
  },
  modalCancel: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  modalCancelText: {
    color: '#636E72',
    fontSize: 15,
    fontWeight: '600',
  },
});
