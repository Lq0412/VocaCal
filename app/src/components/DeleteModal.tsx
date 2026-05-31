/**
 * DeleteModal — 删除候选弹窗
 *
 * 左对齐标题，列表风格和 EventItem 一致，取消用文字链接。
 */

import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing, radius } from '../styles/theme';
import type { CalendarEvent } from '../types/event';

interface DeleteModalProps {
  visible: boolean;
  candidates: CalendarEvent[];
  onDelete: (event: CalendarEvent) => void;
  onClose: () => void;
}

export function DeleteModal({ visible, candidates, onDelete, onClose }: DeleteModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>选择要删除的日程</Text>
          <Text style={styles.count}>{candidates.length} 个匹配</Text>

          <ScrollView style={styles.list}>
            {candidates.map((event, index) => (
              <Pressable
                key={event.id}
                style={[
                  styles.item,
                  index < candidates.length - 1 && styles.itemBorder,
                ]}
                onPress={() => onDelete(event)}
              >
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTime}>{event.time || '全天'}</Text>
                  <Text style={styles.itemTitle}>{event.title}</Text>
                </View>
                <Text style={styles.itemAction}>删除</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>取消</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    maxHeight: '70%',
  },
  title: {
    ...typography.subtitle,
  },
  count: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  list: {
    maxHeight: 300,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  itemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemInfo: {
    flex: 1,
  },
  itemTime: {
    ...typography.caption,
    color: colors.accent,
  },
  itemTitle: {
    ...typography.body,
    marginTop: 2,
  },
  itemAction: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
    paddingLeft: spacing.lg,
  },
  cancelBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
