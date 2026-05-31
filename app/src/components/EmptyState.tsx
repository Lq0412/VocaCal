/**
 * EmptyState — 空日程提示
 *
 * 左对齐、无大图标、留白充足。
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing } from '../styles/theme';

export function EmptyState() {
  return (
    <View style={styles.container}>
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
    paddingHorizontal: spacing.xs,
  },
  title: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
  hint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
});
