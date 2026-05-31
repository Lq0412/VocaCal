import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../styles/theme';
import type { CalendarEvent } from '../types/event';

interface TodayBriefingProps {
  events: CalendarEvent[];
}

export function TodayBriefing({ events }: TodayBriefingProps) {
  if (events.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.iconContainer}>
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

  return (
    <View style={[styles.container, { borderColor: nextEvent ? colors.accent : colors.border }]}>
      <View style={[styles.iconContainer, nextEvent && { backgroundColor: '#FDF1EB' }]}>
        <Text style={styles.icon}>{events.length >= 4 ? '🔥' : nextEvent ? '⏰' : '📝'}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>
          今日 {events.length} 个日程
        </Text>
        <Text style={[styles.subtitle, nextEvent && { color: colors.accent }]}>
          {nextEvent 
            ? `下一项：${nextEvent.time} ${nextEvent.title} (${timeStr})`
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
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.subtitle,
    fontSize: 15,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 4,
  },
});
