/**
 * QuickPhrases — 快捷短语横向滚动条
 *
 * 白底灰边药丸，不用彩色背景。
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '../styles/theme';

interface QuickPhrasesProps {
  visible: boolean;
  onSelect: (phrase: string) => void;
}

const PHRASES = ['明天下午三点开会', '看看今天安排', '后天晚上聚餐', '删除开会'];

export function QuickPhrases({ visible, onSelect }: QuickPhrasesProps) {
  if (!visible) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {PHRASES.map(phrase => (
        <Pressable
          key={phrase}
          style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
          onPress={() => onSelect(phrase)}
        >
          <Text style={styles.chipText}>{phrase}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginTop: spacing.sm,
    maxHeight: 36,
  },
  content: {
    paddingHorizontal: 2,
    gap: spacing.sm,
  },
  chip: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipPressed: {
    backgroundColor: colors.border,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textBody,
  },
});
