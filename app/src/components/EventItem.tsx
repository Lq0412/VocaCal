/**
 * EventItem — iOS inset 列表行
 *
 * 左侧彩色竖条 + 标题/备注，右侧时间徽标。
 * hairline 分隔线从内容左缘开始（iOS 风格左缩进）。
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
  const barColor = getBarColor(event.time);
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onLongPress={() => onDelete(event)}
    >
      <View style={[styles.bar, { backgroundColor: barColor }]} />
      <View style={[styles.content, !isLast && styles.contentBorder]}>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
          {event.note ? (
            <Text style={styles.note} numberOfLines={1}>{event.note}</Text>
          ) : null}
        </View>
        <View style={styles.right}>
          <Text style={[styles.time, { color: barColor }]}>
            {event.time || '全天'}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed]}
            onPress={() => onDelete(event)}
            hitSlop={8}
          >
            <Text style={styles.deleteIcon}>×</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingLeft: spacing.lg,
  },
  rowPressed: {
    backgroundColor: colors.fill,
  },
  bar: {
    width: 4,
    borderRadius: 2,
    marginVertical: 14,
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingRight: spacing.md,
  },
  contentBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  info: {
    flex: 1,
  },
  title: {
    ...typography.body,
  },
  note: {
    ...typography.footnote,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  time: {
    fontSize: 15,
    fontWeight: '600',
  },
  deleteBtn: {
    marginLeft: spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.fill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnPressed: {
    backgroundColor: colors.textTertiary,
  },
  deleteIcon: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 18,
  },
});
