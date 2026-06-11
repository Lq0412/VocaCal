/**
 * WeekScreen — 本周议程纵览
 *
 * 展示当前周 7 天事件数量与摘要，点击某天跳转日程 Tab。
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { useDatabase } from '../hooks/useDatabase';
import type { RootTabParamList } from '../navigation/types';
import { useTabBarLayout } from '../navigation/tabBarLayout';
import { getEventsByDateRange } from '../services/storageService';
import type { CalendarEvent } from '../types/event';
import { colors, typography, spacing, radius } from '../styles/theme';
import {
  formatDateLabel,
  formatShortDate,
  formatWeekRangeLabel,
  getWeekBounds,
  getWeekdayLabel,
  isToday,
} from '../utils/dateUtils';

type Nav = BottomTabNavigationProp<RootTabParamList, 'Week'>;

const MAX_PREVIEW = 3;

export function WeekScreen() {
  const navigation = useNavigation<Nav>();
  const { scrollBottomPadding } = useTabBarLayout();
  const { ready, error } = useDatabase();
  const weekBounds = useMemo(() => getWeekBounds(), []);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const loadWeek = useCallback(async () => {
    if (!ready) return;
    const data = await getEventsByDateRange(weekBounds.start, weekBounds.end);
    setEvents(data);
  }, [ready, weekBounds.end, weekBounds.start]);

  useEffect(() => {
    loadWeek();
  }, [loadWeek]);

  useFocusEffect(
    useCallback(() => {
      loadWeek();
    }, [loadWeek]),
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [events]);

  const weekTotal = events.length;
  const busiest = useMemo(() => {
    let best: { date: string; count: number } | null = null;
    for (const day of weekBounds.days) {
      const count = (eventsByDate.get(day) ?? []).length;
      if (!best || count > best.count) {
        best = count > 0 ? { date: day, count } : best;
      }
    }
    return best;
  }, [eventsByDate, weekBounds.days]);

  const handleDayPress = useCallback((date: string) => {
    navigation.navigate('Schedule', { selectedDate: date });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <ScreenHeader
          title="本周"
          subtitle={formatWeekRangeLabel(weekBounds.start, weekBounds.end)}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
          showsVerticalScrollIndicator={false}
        >
          {/* 周概览统计 */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{weekTotal}</Text>
              <Text style={styles.statLabel}>本周日程</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {busiest ? busiest.count : 0}
              </Text>
              <Text style={styles.statLabel}>单日最多</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {weekBounds.days.filter(d => !(eventsByDate.get(d)?.length)).length}
              </Text>
              <Text style={styles.statLabel}>空闲日</Text>
            </View>
          </View>

          {error ? (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>数据库错误：{error}</Text>
            </View>
          ) : null}

          {/* 7 天列表 */}
          <Text style={styles.sectionTitle}>每日议程</Text>
          <View style={styles.dayGroup}>
            {weekBounds.days.map((day, index) => {
              const dayEvents = eventsByDate.get(day) ?? [];
              const isLast = index === weekBounds.days.length - 1;
              const today = isToday(day);
              return (
                <Pressable
                  key={day}
                  style={({ pressed }) => [
                    styles.dayRow,
                    pressed && styles.dayRowPressed,
                  ]}
                  onPress={() => handleDayPress(day)}
                >
                  <View style={styles.dayLeft}>
                    <View style={[styles.dayBadge, today && styles.dayBadgeToday]}>
                      <Text style={[styles.dayWeekday, today && styles.dayWeekdayToday]}>
                        {getWeekdayLabel(day)}
                      </Text>
                      <Text style={[styles.dayDate, today && styles.dayDateToday]}>
                        {formatShortDate(day)}
                      </Text>
                    </View>
                    <View style={styles.dayInfo}>
                      <Text style={styles.dayTitle}>
                        {today ? '今天' : formatDateLabel(day)}
                      </Text>
                      {dayEvents.length === 0 ? (
                        <Text style={styles.dayEmpty}>暂无安排 · 点击查看</Text>
                      ) : (
                        dayEvents.slice(0, MAX_PREVIEW).map(event => (
                          <Text key={event.id} style={styles.previewLine} numberOfLines={1}>
                            {(event.time ? `${event.time} ` : '') + event.title}
                          </Text>
                        ))
                      )}
                      {dayEvents.length > MAX_PREVIEW ? (
                        <Text style={styles.moreLine}>
                          还有 {dayEvents.length - MAX_PREVIEW} 个日程
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={[styles.countPill, dayEvents.length > 0 && styles.countPillActive]}>
                    <Text style={[styles.countText, dayEvents.length > 0 && styles.countTextActive]}>
                      {dayEvents.length}
                    </Text>
                  </View>
                  {!isLast ? <View style={styles.separator} /> : null}
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.hint}>点击某天可跳转到日程页查看详情</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  scroll: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.tint,
  },
  statLabel: {
    ...typography.caption,
    marginTop: 2,
  },
  banner: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerText: {
    ...typography.subhead,
    color: colors.danger,
  },
  sectionTitle: {
    ...typography.title2,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  dayGroup: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    position: 'relative',
  },
  dayRowPressed: {
    backgroundColor: colors.fill,
  },
  dayLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  dayBadge: {
    width: 44,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.fill,
  },
  dayBadgeToday: {
    backgroundColor: colors.tint,
  },
  dayWeekday: {
    ...typography.caption,
    fontWeight: '600',
  },
  dayWeekdayToday: {
    color: '#FFFFFF',
  },
  dayDate: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  dayDateToday: {
    color: '#FFFFFF',
  },
  dayInfo: {
    flex: 1,
  },
  dayTitle: {
    ...typography.headline,
    marginBottom: 4,
  },
  dayEmpty: {
    ...typography.subhead,
  },
  previewLine: {
    ...typography.subhead,
    color: colors.textBody,
    marginTop: 2,
  },
  moreLine: {
    ...typography.caption,
    color: colors.tint,
    marginTop: 4,
  },
  countPill: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.fill,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  countPillActive: {
    backgroundColor: 'rgba(0,122,255,0.12)',
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  countTextActive: {
    color: colors.tint,
  },
  separator: {
    position: 'absolute',
    left: spacing.lg + 44 + spacing.md,
    right: spacing.lg,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
  },
  hint: {
    ...typography.footnote,
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
});
