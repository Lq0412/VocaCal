/**
 * Header — 标题栏
 *
 * 左对齐标题 + 右侧「今天」文字按钮，简约无背景色。
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
      <View>
        <Text style={styles.title}>VocaCal</Text>
        <Text style={styles.subtitle}>语音日历助手</Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.todayButton, pressed && styles.todayButtonPressed]}
        onPress={onTodayPress}
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
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.title,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  todayButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  todayButtonPressed: {
    backgroundColor: colors.border,
  },
  todayText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
});
