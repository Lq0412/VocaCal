/**
 * Header — iOS Large Title 标题栏
 *
 * 左侧 34pt 大标题 + 灰色副标题，右侧蓝色「今天」文字按钮。
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing } from '../styles/theme';

interface HeaderProps {
  onTodayPress: () => void;
}

export function Header({ onTodayPress }: HeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>VocaCal</Text>
        <Text style={styles.subtitle}>语音日历助手</Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.todayButton, pressed && styles.todayButtonPressed]}
        onPress={onTodayPress}
        hitSlop={8}
      >
        <Text style={styles.todayText}>今天</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    ...typography.largeTitle,
  },
  subtitle: {
    ...typography.subhead,
    marginTop: 2,
  },
  todayButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: 4,
  },
  todayButtonPressed: {
    opacity: 0.4,
  },
  todayText: {
    fontSize: 17,
    fontWeight: '400',
    color: colors.tint,
  },
});
