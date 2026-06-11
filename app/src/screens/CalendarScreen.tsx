/**
 * CalendarScreen — VocaCal 主界面
 *
 * 功能：
 * - 语音/文字添加、查询、删除日程
 * - 解析反馈卡片、撤销、范围查询、多事件批量添加
 * - 日历标记已有事件日期（小圆点）
 * - 删除确认弹窗（单选/多选）
 * - 事件卡片长按删除
 * - 录音脉冲动画
 * - TTS 语音回复播放
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseTextIntent, API_BASE_URL } from '../services/apiService';
import {
  applyBatchEvents,
  applyIntent,
  clearPendingUndo,
  executeUndo,
  getPendingUndo,
  setPendingUndo,
} from '../services/calendarIntentService';
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
import type { NLUResult, ParsedEventItem } from '../types/intent';

import { Header } from '../components/Header';
import { EventItem } from '../components/EventItem';
import { EmptyState } from '../components/EmptyState';
import { VoiceButton } from '../components/VoiceButton';
import { QuickPhrases } from '../components/QuickPhrases';
import { DeleteModal } from '../components/DeleteModal';
import { TodayBriefing } from '../components/TodayBriefing';
import { ParseResultCard } from '../components/ParseResultCard';
import { BatchConfirmCard } from '../components/BatchConfirmCard';
import { UndoBanner } from '../components/UndoBanner';
import { colors, typography, spacing, radius } from '../styles/theme';
import type { RootTabParamList } from '../navigation/types';
import { useTabBarLayout } from '../navigation/tabBarLayout';
import { formatDateLabel, todayISO } from '../utils/dateUtils';

const today = todayISO;
type ScheduleRoute = RouteProp<RootTabParamList, 'Schedule'>;

/** 主界面组件 */
export function CalendarScreen() {
  const route = useRoute<ScheduleRoute>();
  const { scrollBottomPaddingWithVoice, voiceButtonBottomOffset } = useTabBarLayout();
  const [selectedDate, setSelectedDate] = useState(
    () => route.params?.selectedDate ?? today,
  );
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  const [eventDates, setEventDates] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [debugText, setDebugText] = useState('');
  const [deleteCandidates, setDeleteCandidates] = useState<CalendarEvent[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [parsePreview, setParsePreview] = useState<NLUResult | null>(null);
  const [batchPending, setBatchPending] = useState<{ events: ParsedEventItem[]; raw: string } | null>(null);
  const [rangeGroups, setRangeGroups] = useState<{ date: string; events: CalendarEvent[] }[] | null>(null);
  const [undoMessage, setUndoMessage] = useState('');
  const undoKeyRef = useRef(0);

  // --- 数据库初始化（仅首次挂载） ---
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDatabase()
      .then(() => setDbReady(true))
      .catch((e: any) => setStatusMessage('数据库错误: ' + (e?.message || String(e))));
  }, []);

  // 从周视图等 Tab 跳转时同步选中日期
  useFocusEffect(
    useCallback(() => {
      const date = route.params?.selectedDate;
      if (date) {
        setSelectedDate(date);
        setRangeGroups(null);
      }
    }, [route.params?.selectedDate]),
  );

  // --- 加载事件（日期变化或数据库就绪时） ---
  useEffect(() => {
    if (!dbReady || rangeGroups) return;
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
  }, [selectedDate, dbReady, rangeGroups]);

  /** 刷新事件列表和日期标记 */
  const reloadEvents = useCallback(async (date: string) => {
    const events = await getEventsByDate(date);
    setSelectedEvents(events);
    const dates = await getAllEventDates();
    setEventDates(dates);
  }, []);

  const showUndo = useCallback((message: string) => {
    if (!getPendingUndo()) return;
    undoKeyRef.current += 1;
    setUndoMessage(message);
  }, []);

  const handleUndoExpire = useCallback(() => {
    clearPendingUndo();
    setUndoMessage('');
  }, []);

  const handleUndoPress = useCallback(async () => {
    const result = await executeUndo();
    setUndoMessage('');
    if (result.success) {
      setRangeGroups(null);
      setBatchPending(null);
      await reloadEvents(selectedDate);
      setStatusMessage(result.message);
    } else {
      setStatusMessage(result.message);
    }
  }, [selectedDate, reloadEvents]);

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
  const handleIntentResult = useCallback(async (
    intent: NLUResult,
    originalReply?: string,
  ): Promise<string | null> => {
    setParsePreview(intent);
    setBatchPending(null);

    const result = await applyIntent(intent);

    if (result.type === 'batch_pending') {
      setBatchPending({ events: result.events, raw: result.raw });
      const msg = originalReply || `识别到 ${result.events.length} 个日程，请确认`;
      setStatusMessage(msg);
      return msg;
    }

    if (result.type === 'added') {
      setRangeGroups(null);
      setSelectedDate(result.event.date);
      await reloadEvents(result.event.date);

      let textToSpeak = originalReply || ('已添加：' + result.event.title + (result.event.time ? '（' + result.event.time + '）' : ''));
      if (result.hasConflict) {
        textToSpeak = `注意哦，这个时间段你已经有别的安排了。${textToSpeak}`;
      }
      setStatusMessage(textToSpeak);
      showUndo(textToSpeak);
      return textToSpeak;
    }

    if (result.type === 'batch_added') {
      setRangeGroups(null);
      const firstDate = result.events[0]?.date ?? selectedDate;
      setSelectedDate(firstDate);
      await reloadEvents(firstDate);
      const msg = originalReply || `已添加 ${result.events.length} 个日程`;
      setStatusMessage(msg);
      showUndo(msg);
      return msg;
    }

    if (result.type === 'query_range') {
      setRangeGroups(result.groups);
      const total = result.groups.reduce((sum, g) => sum + g.events.length, 0);
      if (total > 0) {
        const msg = originalReply || `共 ${total} 个日程（${result.start} 至 ${result.end}）`;
        setStatusMessage(msg);
        return msg;
      }
      const msg = '该时间段暂无日程';
      setStatusMessage(msg);
      return originalReply || msg;
    }

    if (result.type === 'query') {
      setRangeGroups(null);
      setSelectedDate(result.date);
      setSelectedEvents(result.events);
      if (result.events.length > 0) {
        const summary = result.events
          .map(e => (e.time ? e.time + ' ' : '') + e.title)
          .join('、');
        const msg = result.events.length + ' 个日程：' + summary;
        setStatusMessage(msg);
        return originalReply || msg;
      }
      const msg = '该日期暂无日程';
      setStatusMessage(msg);
      return originalReply || msg;
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
                setPendingUndo({ type: 'delete', event });
                await deleteEvent(event.id);
                await reloadEvents(selectedDate);
                const msg = '已删除：' + event.title;
                setStatusMessage(msg);
                showUndo(msg);
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
              setPendingUndo({
                type: 'modify',
                eventId: event.id,
                previous: { title: event.title, date: event.date, time: event.time },
              });
              await updateEvent(event.id, updates);
              const targetDate = result.newDate || selectedDate;
              setSelectedDate(targetDate);
              await reloadEvents(targetDate);
              const msg = '已修改：' + (result.newTitle || event.title);
              setStatusMessage(msg);
              showUndo(msg);
            },
          },
        ],
      );
      return '请确认修改操作';
    }

    const msg = result.message || '抱歉没理解，试试说：明天下午三点开会';
    setStatusMessage(msg);
    return msg;
  }, [selectedDate, reloadEvents, showUndo]);

  const handleBatchConfirm = useCallback(async (selected: ParsedEventItem[]) => {
    if (!batchPending) return;
    setBatchPending(null);
    const result = await applyBatchEvents(selected, batchPending.raw);
    if (result.type === 'batch_added') {
      const firstDate = result.events[0]?.date ?? selectedDate;
      setSelectedDate(firstDate);
      setRangeGroups(null);
      await reloadEvents(firstDate);
      const msg = `已添加 ${result.events.length} 个日程`;
      setStatusMessage(msg);
      showUndo(msg);
    } else if (result.type === 'unknown') {
      setStatusMessage(result.message);
    }
  }, [batchPending, selectedDate, reloadEvents, showUndo]);

  const handleBatchCancel = useCallback(() => {
    setBatchPending(null);
    setStatusMessage('已取消批量添加');
  }, []);

  /** 删除单个事件（从弹窗中选择） */
  const handleDeleteFromModal = useCallback(async (event: CalendarEvent) => {
    setPendingUndo({ type: 'delete', event });
    await deleteEvent(event.id);
    const remaining = deleteCandidates.filter(e => e.id !== event.id);
    setDeleteCandidates(remaining);
    if (remaining.length === 0) {
      setShowDeleteModal(false);
    }
    await reloadEvents(selectedDate);
    const msg = '已删除：' + event.title;
    setStatusMessage(msg);
    showUndo(msg);
  }, [deleteCandidates, selectedDate, reloadEvents, showUndo]);

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
            setPendingUndo({ type: 'delete', event });
            await deleteEvent(event.id);
            await reloadEvents(selectedDate);
            const msg = '已删除：' + event.title;
            setStatusMessage(msg);
            showUndo(msg);
          },
        },
      ],
    );
  }, [selectedDate, reloadEvents, showUndo]);

  // --- 文本输入 ---
  const handleDebugSubmit = useCallback(async () => {
    const text = debugText.trim();
    if (!text) return;
    try {
      setStatusMessage('正在解析...');
      setParsePreview(null);
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
      setParsePreview(null);
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
      setParsePreview(null);
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
        const overrideReply = await handleIntentResult(result.event as NLUResult, result.reply_text);
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

  const handleDayPress = useCallback((day: { dateString: string }) => {
    setRangeGroups(null);
    setSelectedDate(day.dateString);
  }, []);

  // ==================== 渲染 ====================

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* 标题栏 */}
        <Header onTodayPress={() => {
          setRangeGroups(null);
          setSelectedDate(today);
        }} />

        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={[
            styles.mainScrollContent,
            { paddingBottom: scrollBottomPaddingWithVoice },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* 日历组件 */}
          <View style={styles.calendarWrap}>
            <Calendar
              onDayPress={handleDayPress}
              markedDates={markedDates}
              theme={{
                backgroundColor: colors.surface,
                calendarBackground: colors.surface,
                todayTextColor: colors.tint,
                selectedDayBackgroundColor: colors.tint,
                arrowColor: colors.tint,
                monthTextColor: colors.primary,
                textDayFontWeight: '400',
                textMonthFontWeight: '700',
                textDayHeaderFontWeight: '600',
                dotColor: colors.tint,
                selectedDotColor: '#ffffff',
                textSectionTitleColor: colors.textSecondary,
                textMonthFontSize: 18,
              }}
            />
          </View>

          {/* 智能今日概览 */}
          {selectedDate === today && !rangeGroups && (
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
            {debugText ? (
              <Pressable
                style={({ pressed }) => [
                  styles.sendButton,
                  pressed && styles.sendButtonPressed,
                ]}
                onPress={handleDebugSubmit}
              >
                <Text style={styles.sendText}>发送</Text>
              </Pressable>
            ) : null}
          </View>

          {/* 解析反馈卡片 */}
          {parsePreview && parsePreview.intent ? (
            <ParseResultCard intent={parsePreview} />
          ) : null}

          {/* 多事件批量确认 */}
          {batchPending ? (
            <BatchConfirmCard
              events={batchPending.events}
              onConfirm={handleBatchConfirm}
              onCancel={handleBatchCancel}
            />
          ) : null}

          {/* 撤销提示 */}
          {undoMessage ? (
            <UndoBanner
              key={undoKeyRef.current}
              message={undoMessage}
              onUndo={handleUndoPress}
              onExpire={handleUndoExpire}
            />
          ) : null}

          {/* 状态消息 */}
          {statusMessage ? (
            <View style={styles.statusBanner}>
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          ) : null}

          {/* 范围查询：按日分组列表 */}
          {rangeGroups ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>日程概览</Text>
                <Pressable onPress={() => setRangeGroups(null)}>
                  <Text style={styles.clearRange}>返回单日</Text>
                </Pressable>
              </View>
              {rangeGroups.length === 0 ? (
                <View style={styles.eventGroup}>
                  <EmptyState />
                </View>
              ) : (
                rangeGroups.map(group => (
                  <View key={group.date}>
                    <View style={styles.rangeDayHeader}>
                      <Text style={styles.rangeDayTitle}>{formatDateLabel(group.date)}</Text>
                      <Text style={styles.sectionCount}>{group.events.length} 个</Text>
                    </View>
                    <View style={styles.eventGroup}>
                      {group.events.map((event, index) => (
                        <EventItem
                          key={event.id}
                          event={event}
                          isLast={index === group.events.length - 1}
                          onDelete={handleEventDelete}
                        />
                      ))}
                    </View>
                  </View>
                ))
              )}
            </>
          ) : (
            <>
              {/* 日程列表标题 */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{formatDateLabel(selectedDate)}</Text>
                <Text style={styles.sectionCount}>{selectedEvents.length} 个日程</Text>
              </View>

              {/* 日程列表（inset grouped） */}
              {selectedEvents.length === 0 ? (
                <View style={styles.eventGroup}>
                  <EmptyState />
                </View>
              ) : (
                <View style={styles.eventGroup}>
                  {selectedEvents.map((event, index) => (
                    <EventItem
                      key={event.id}
                      event={event}
                      isLast={index === selectedEvents.length - 1}
                      onDelete={handleEventDelete}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* 语音按钮 */}
        <VoiceButton
          voiceState={voiceState}
          onPressIn={handleVoiceStart}
          onPressOut={handleVoiceStop}
          onCancel={handleVoiceCancel}
          bottomOffset={voiceButtonBottomOffset}
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
    paddingTop: spacing.xs,
  },

  calendarWrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    paddingVertical: spacing.xs,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.primary,
  },
  sendButton: {
    backgroundColor: colors.tint,
    borderRadius: radius.md,
    paddingHorizontal: 18,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonPressed: {
    opacity: 0.6,
  },
  sendText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  statusBanner: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  statusText: {
    ...typography.subhead,
    color: colors.textBody,
    lineHeight: 20,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    ...typography.title2,
  },
  sectionCount: {
    ...typography.footnote,
    color: colors.textTertiary,
  },
  clearRange: {
    ...typography.subhead,
    color: colors.tint,
    fontWeight: '600',
  },
  rangeDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  rangeDayTitle: {
    ...typography.headline,
  },
  eventGroup: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
});
