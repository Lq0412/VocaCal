/**
 * UndoBanner — 5 秒撤销提示条
 */

import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography, radius } from '../styles/theme';

interface UndoBannerProps {
  message: string;
  onUndo: () => void;
  onExpire: () => void;
  durationMs?: number;
}

export function UndoBanner({ message, onUndo, onExpire, durationMs = 5000 }: UndoBannerProps) {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(durationMs / 1000));

  useEffect(() => {
    setSecondsLeft(Math.ceil(durationMs / 1000));

    const expireTimeout = setTimeout(onExpire, durationMs);

    const interval = setInterval(() => {
      setSecondsLeft(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => {
      clearTimeout(expireTimeout);
      clearInterval(interval);
    };
  }, [message, durationMs, onExpire]);

  return (
    <View style={styles.container}>
      <Text style={styles.message} numberOfLines={2}>{message}</Text>
      <Pressable style={styles.undoButton} onPress={onUndo}>
        <Text style={styles.undoText}>撤销 ({secondsLeft}s)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  message: {
    ...typography.subhead,
    color: colors.textBody,
    flex: 1,
    marginRight: spacing.sm,
  },
  undoButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  undoText: {
    ...typography.headline,
    color: colors.tint,
  },
});
