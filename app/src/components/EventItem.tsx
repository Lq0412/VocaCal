/**
 * EventItem — 单条日程行
 *
 * 扁平行设计：左侧 3px 色条 + 时间 + 标题，无卡片边框无阴影。
 * 长按或点击 × 触发删除。
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing } from '../styles/theme';
import type { CalendarEvent } from '../types/event';

interface EventItemProps {
  event: CalendarEvent;
  isLast: boolean;
  onDelete: (event: CalendarEvent) => void;
}

/** 根据时间段返回色条颜色 */
function getBarColor(time: string | null): string {
  if (!time) return colors.timeAllDay;
  const hour = parseInt(time.split(':')[0], 10);
  if (hour < 12) return colors.timeMorning;
  if (hour < 18) return colors.timeAfternoon;
  return colors.timeEvening;
}

export function EventItem({ event, isLast, onDelete }: EventItemProps) {
  return (
    <Pressable
      style={[styles.row, !isLast && styles.rowBorder]}
      onLongPress={() => onDelete(event)}
    >
      <View style={[styles.bar, { backgroundColor: getBarColor(event.time) }]} />
      <View style={styles.content}>
        <Text style={styles.time}>
          {event.time || '全天'}
        </Text>
        <Text style={styles.title}>{event.title}</Text>
        {event.note ? (
          <Text style={styles.note}>{event.note}</Text>
        ) : null}
      </View>
      <Pressable
        style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed]}
        onPress={() => onDelete(event)}
        hitSlop={8}
      >
        <Text style={styles.deleteIcon}>×</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingRight: spacing.sm,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  bar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  time: {
    ...typography.caption,
    color: colors.accent,
  },
  title: {
    ...typography.body,
    marginTop: 2,
  },
  note: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  deleteBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 4,
  },
  deleteBtnPressed: {
    backgroundColor: colors.border,
  },
  deleteIcon: {
    color: colors.textTertiary,
    fontSize: 18,
    fontWeight: '400',
  },
});
