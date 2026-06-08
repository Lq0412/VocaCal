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

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseTextIntent, API_BASE_URL } from '../services/apiService';
import { applyIntent } from '../services/calendarIntentService';
import {
  deleteEvent,
  getAllEventDates,
  getEventsByDate,
  initDatabase,
  updateEvent,
} from '../services/storageService';
import {
  playFromUrl,
} from '../services/voiceService';
import type { VoiceState } from '../services/voiceService';
import {
  cancelStream,
  requestStreamPermission,
  startStream,
  stopStream,
} from '../services/voiceStreamService';
import type { CalendarEvent } from '../types/event';

import { Header } from '../components/Header';
import { EventItem } from '../components/EventItem';
import { EmptyState } from '../components/EmptyState';
import { VoiceButton } from '../components/VoiceButton';
import { QuickPhrases } from '../components/QuickPhrases';
import { DeleteModal } from '../components/DeleteModal';
import { TodayBriefing } from '../components/TodayBriefing';
import { colors, typography, spacing } from '../styles/theme';

const today = new Date().toISOString().slice(0, 10);

/** 主界面组件 */
export function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  const [eventDates, setEventDates] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [debugText, setDebugText] = useState('');
  const [deleteCandidates, setDeleteCandidates] = useState<CalendarEvent[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // --- 数据库初始化（仅首次挂载） ---
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDatabase()
      .then(() => setDbReady(true))
      .catch((e: any) => setStatusMessage('数据库错误: ' + (e?.message || String(e))));
  }, []);

  // --- 加载事件（日期变化或数据库就绪时） ---
  useEffect(() => {
    if (!dbReady) return;
    let isActive = true;
    async function loadEvents() {
      try {
        const events = await getEventsByDate(selectedDate);
        if (isActive) {
          setSelectedEvents(events);
          const dates = await getAllEventDates();
          setEventDates(dates);
        }
      } catch (e: any) {
        if (isActive) {
          setStatusMessage('加载失败: ' + (e?.message || String(e)));
        }
      }
    }
    loadEvents();
    return () => { isActive = false; };
  }, [selectedDate, dbReady]);

  /** 刷新事件列表和日期标记 */
  const reloadEvents = useCallback(async (date: string) => {
    const events = await getEventsByDate(date);
    setSelectedEvents(events);
    const dates = await getAllEventDates();
    setEventDates(dates);
  }, []);

  // --- 构建日历标记 ---
  const markedDates = React.useMemo(() => {
    const marks: Record<string, any> = {};
    for (const d of eventDates) {
      marks[d] = {
        marked: true,
        dotColor: colors.accent,
      };
    }
    marks[selectedDate] = {
      ...(marks[selectedDate] || {}),
      selected: true,
      selectedColor: colors.primary,
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
  }, originalReply?: string): Promise<string | null> => {
    const result = await applyIntent(intent as any);

    if (result.type === 'added') {
      setSelectedDate(result.event.date);
      await reloadEvents(result.event.date);
      
      let textToSpeak = originalReply || ('已添加：' + result.event.title + (result.event.time ? '（' + result.event.time + '）' : ''));
      if (result.hasConflict) {
        textToSpeak = `注意哦，这个时间段你已经有别的安排了。${textToSpeak}`;
      }
      setStatusMessage(textToSpeak);
      return textToSpeak;
    }

    if (result.type === 'query') {
      setSelectedDate(result.date);
      setSelectedEvents(result.events);
      if (result.events.length > 0) {
        const summary = result.events
          .map(e => (e.time ? e.time + ' ' : '') + e.title)
          .join('、');
        const msg = result.events.length + ' 个日程：' + summary;
        setStatusMessage(msg);
        return originalReply || msg;
      } else {
        const msg = '该日期暂无日程';
        setStatusMessage(msg);
        return originalReply || msg;
      }
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
          '删除「' + event.title + '」' + (event.time ? '（' + event.time + '）' : '（全天）') + '？',
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
        return '请确认删除操作';
      }
      setDeleteCandidates(result.events);
      setShowDeleteModal(true);
      return '请在屏幕上选择要删除的日程';
    }

    if (result.type === 'modify_candidates') {
      if (result.events.length === 0) {
        setStatusMessage('未找到要修改的日程');
        return;
      }
      const event = result.events[0];
      const updates: { title?: string; date?: string; time?: string } = {};
      if (result.newTitle) updates.title = result.newTitle;
      if (result.newDate) updates.date = result.newDate;
      if (result.newTime) updates.time = result.newTime;

      Alert.alert(
        '确认修改',
        '修改「' + event.title + '」？',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '确认',
            onPress: async () => {
              await updateEvent(event.id, updates);
              const targetDate = result.newDate || selectedDate;
              setSelectedDate(targetDate);
              await reloadEvents(targetDate);
              setStatusMessage('已修改：' + (result.newTitle || event.title));
            },
          },
        ],
      );
      return '请确认修改操作';
    }

    const msg = result.message || '抱歉没理解，试试说：明天下午三点开会';
    setStatusMessage(msg);
    return msg;
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
    setStatusMessage('已删除：' + event.title);
  }, [deleteCandidates, selectedDate, reloadEvents]);

  /** 长按事件卡片删除 */
  const handleEventDelete = useCallback((event: CalendarEvent) => {
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
            setStatusMessage('已删除：' + event.title);
          },
        },
      ],
    );
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

  /** 快捷短语选中 */
  const handlePhraseSelect = useCallback(async (phrase: string) => {
    setDebugText(phrase);
    try {
      setStatusMessage('正在解析...');
      const intent = await parseTextIntent(phrase);
      await handleIntentResult(intent);
      setDebugText('');
    } catch (e: any) {
      setStatusMessage('解析失败：' + (e?.message || '请检查网络'));
    }
  }, [handleIntentResult]);

  // --- 语音操作（WebSocket 流式） ---
  const handleVoiceStart = useCallback(async () => {
    if (voiceState !== 'idle') return;

    const granted = await requestStreamPermission();
    if (!granted) {
      setStatusMessage('需要录音权限才能使用语音功能');
      return;
    }

    try {
      await startStream();
      setVoiceState('recording');
      setStatusMessage('正在录音，松开结束...');
    } catch {
      setStatusMessage('连接失败，请检查后端');
    }
  }, [voiceState]);

  const handleVoiceStop = useCallback(async () => {
    if (voiceState !== 'recording') return;

    setVoiceState('processing');
    setStatusMessage('处理中...');

    try {
      const result = await stopStream();

      if (result.text) {
        setStatusMessage('识别：' + result.text);
      }

      let finalReply = result.reply_text;
      if (result.event?.intent) {
        const overrideReply = await handleIntentResult(result.event, result.reply_text);
        if (overrideReply) {
          finalReply = overrideReply;
        }
      } else if (result.reply_text) {
        setStatusMessage(result.reply_text);
      }

      if (finalReply) {
        const ttsUrl = API_BASE_URL + '/api/tts/speak?text=' + encodeURIComponent(finalReply);
        playFromUrl(ttsUrl);
      }
    } catch (e: any) {
      setStatusMessage('语音处理失败：' + (e?.message || '请重试'));
    } finally {
      setVoiceState('idle');
    }
  }, [voiceState, handleIntentResult]);

  const handleVoiceCancel = useCallback(async () => {
    if (voiceState !== 'recording') return;
    cancelStream();
    setVoiceState('idle');
    setStatusMessage('已取消录音');
  }, [voiceState]);

  // ==================== 渲染 ====================

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 标题栏 */}
        <Header onTodayPress={() => setSelectedDate(today)} />

        <ScrollView 
          style={styles.mainScroll} 
          contentContainerStyle={styles.mainScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 日历组件 */}
          <View style={styles.calendarWrap}>
          <Calendar
            onDayPress={(day: any) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              backgroundColor: colors.surface,
              calendarBackground: colors.surface,
              todayTextColor: colors.accent,
              selectedDayBackgroundColor: colors.primary,
              arrowColor: colors.textSecondary,
              monthTextColor: colors.primary,
              textDayFontWeight: '400',
              textMonthFontWeight: '600',
              textDayHeaderFontWeight: '500',
              dotColor: colors.accent,
              selectedDotColor: '#ffffff',
              textSectionTitleColor: colors.textSecondary,
            }}
          />
        </View>

        {/* 智能今日概览 */}
        {selectedDate === today && (
          <TodayBriefing events={selectedEvents} />
        )}

        {/* 快捷短语 */}
        <QuickPhrases
          visible={!debugText}
          onSelect={handlePhraseSelect}
        />

        {/* 文本输入 */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={debugText}
            onChangeText={setDebugText}
            placeholder="输入指令，如：明天下午三点开会"
            placeholderTextColor={colors.textTertiary}
            onSubmitEditing={handleDebugSubmit}
            returnKeyType="send"
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              pressed && styles.sendButtonPressed,
            ]}
            onPress={handleDebugSubmit}
          >
            <Text style={styles.sendText}>发送</Text>
          </Pressable>
        </View>

        {/* 状态消息 */}
        {statusMessage ? (
          <Text style={styles.statusText}>{statusMessage}</Text>
        ) : null}

        {/* 日程列表标题 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{formatDateLabel(selectedDate)}</Text>
          <Text style={styles.sectionCount}>{selectedEvents.length} 个日程</Text>
        </View>

        {/* 日程列表 */}
        <View style={styles.eventListInner}>
          {selectedEvents.length === 0 ? (
            <EmptyState />
          ) : (
            selectedEvents.map((event, index) => (
              <EventItem
                key={event.id}
                event={event}
                isLast={index === selectedEvents.length - 1}
                onDelete={handleEventDelete}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* 语音按钮 */}
        <VoiceButton
          voiceState={voiceState}
          onPressIn={handleVoiceStart}
          onPressOut={handleVoiceStop}
          onCancel={handleVoiceCancel}
        />

        {/* 删除确认弹窗 */}
        <DeleteModal
          visible={showDeleteModal}
          candidates={deleteCandidates}
          onDelete={handleDeleteFromModal}
          onClose={() => setShowDeleteModal(false)}
        />
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

// ==================== 样式 ====================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    paddingBottom: 120, // 给底部的悬浮语音按钮留出空间
    paddingTop: spacing.sm,
  },

  // --- 日历 ---
  calendarWrap: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  // --- 文本输入 ---
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  textInput: {
    flex: 1,
    height: 42,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.primary,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonPressed: {
    opacity: 0.8,
  },
  sendText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },

  // --- 状态消息 ---
  statusText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },

  // --- 日程列表 ---
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.subtitle,
  },
  sectionCount: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  eventListInner: {
    marginTop: spacing.sm,
  },
});
