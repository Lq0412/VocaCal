/**
 * TodayBriefing — 今日概览卡片（iOS 风格）
 *
 * 白底圆角、无阴影，左侧系统色圆形图标 + 标题/副标题。
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography, radius } from '../styles/theme';
import type { CalendarEvent } from '../types/event';

interface TodayBriefingProps {
  events: CalendarEvent[];
}

export function TodayBriefing({ events }: TodayBriefingProps) {
  if (events.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.iconContainer, { backgroundColor: colors.success }]}>
          <Text style={styles.icon}>☕</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>今日空闲</Text>
          <Text style={styles.subtitle}>难得清闲的一天，好好放松一下吧</Text>
        </View>
      </View>
    );
  }

  // Find next upcoming event
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let nextEvent: CalendarEvent | null = null;
  let timeStr = '';

  for (const event of events) {
    if (!event.time) continue;
    const [h, m] = event.time.split(':').map(Number);
    const eventMinutes = h * 60 + m;
    if (eventMinutes > currentMinutes) {
      nextEvent = event;
      const diff = eventMinutes - currentMinutes;
      if (diff < 60) {
        timeStr = `${diff}分钟后`;
      } else {
        const diffH = Math.floor(diff / 60);
        const diffM = diff % 60;
        timeStr = `${diffH}小时${diffM > 0 ? diffM + '分' : ''}后`;
      }
      break;
    }
  }

  let summary = '';
  if (events.length >= 4) {
    summary = '今天很忙碌，注意安排时间';
  } else if (events.length >= 2) {
    summary = '今天比较充实，加油哦';
  } else {
    summary = '今天只有这 1 个安排，很轻松';
  }

  const iconBg = events.length >= 4
    ? colors.danger
    : nextEvent
      ? colors.tint
      : colors.timeEvening;
  const iconText = events.length >= 4 ? '🔥' : nextEvent ? '⏰' : '📝';

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Text style={styles.icon}>{iconText}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>今日 {events.length} 个日程</Text>
        <Text
          style={[styles.subtitle, nextEvent && { color: colors.tint, fontWeight: '600' }]}
          numberOfLines={1}
        >
          {nextEvent
            ? `下一项 · ${nextEvent.time} ${nextEvent.title}（${timeStr}）`
            : summary}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 22,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.headline,
  },
  subtitle: {
    ...typography.subhead,
    marginTop: 3,
  },
});
