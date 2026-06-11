/**
 * ScreenHeader — 子页面 Large Title 标题栏
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing } from '../styles/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, rightAction }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {rightAction}
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
    color: colors.textSecondary,
  },
});
