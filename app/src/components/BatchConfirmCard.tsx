/**
 * BatchConfirmCard — 多事件批量确认卡片
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography, radius } from '../styles/theme';
import type { ParsedEventItem } from '../types/intent';

interface BatchConfirmCardProps {
  events: ParsedEventItem[];
  onConfirm: (selected: ParsedEventItem[]) => void;
  onCancel: () => void;
}

function formatPreview(item: ParsedEventItem) {
  const parts = [item.date, item.time, item.title].filter(Boolean);
  return parts.join(' · ') || '待补充';
}

export function BatchConfirmCard({ events, onConfirm, onCancel }: BatchConfirmCardProps) {
  const [selected, setSelected] = useState<boolean[]>(() => events.map(() => true));

  const toggle = (index: number) => {
    setSelected(prev => prev.map((v, i) => (i === index ? !v : v)));
  };

  const handleConfirm = () => {
    const picked = events.filter((_, i) => selected[i]);
    onConfirm(picked);
  };

  const selectedCount = selected.filter(Boolean).length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>确认添加 {selectedCount} 个日程</Text>
      {events.map((item, index) => (
        <Pressable
          key={index}
          style={[styles.row, index > 0 && styles.rowBorder]}
          onPress={() => toggle(index)}
        >
          <View style={[styles.checkbox, selected[index] && styles.checkboxChecked]}>
            {selected[index] ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={[styles.rowText, !selected[index] && styles.rowTextMuted]}>
            {formatPreview(item)}
          </Text>
        </Pressable>
      ))}
      <View style={styles.actions}>
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>取消</Text>
        </Pressable>
        <Pressable
          style={[styles.confirmButton, selectedCount === 0 && styles.confirmDisabled]}
          onPress={handleConfirm}
          disabled={selectedCount === 0}
        >
          <Text style={styles.confirmText}>确认添加</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  title: {
    ...typography.headline,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.tint,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.tint,
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  rowText: {
    ...typography.body,
    flex: 1,
    color: colors.tint,
    fontWeight: '600',
  },
  rowTextMuted: {
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.fill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    ...typography.headline,
    color: colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmDisabled: {
    opacity: 0.4,
  },
  confirmText: {
    ...typography.headline,
    color: '#ffffff',
  },
});
