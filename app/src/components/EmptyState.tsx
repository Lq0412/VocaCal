/**
 * EmptyState — 空日程提示（iOS 风格）
 *
 * 居中、轻量图标 + 灰色引导文案。
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing } from '../styles/theme';

export function EmptyState() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🗓️</Text>
      <Text style={styles.title}>暂无日程</Text>
      <Text style={styles.hint}>
        按住下方麦克风语音添加，或输入文字指令
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 34,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.headline,
    color: colors.textSecondary,
  },
  hint: {
    ...typography.footnote,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 19,
  },
});
