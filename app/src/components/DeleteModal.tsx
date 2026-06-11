/**
 * DeleteModal — 删除候选弹窗（iOS Action Sheet 风格）
 *
 * 底部弹出分组卡片：标题 + 候选列表，下方独立「取消」按钮。
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
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheetWrap} onPress={() => {}}>
          {/* 分组卡片 */}
          <View style={styles.group}>
            <View style={styles.headerBlock}>
              <Text style={styles.title}>选择要删除的日程</Text>
              <Text style={styles.count}>{candidates.length} 个匹配</Text>
            </View>

            <ScrollView style={styles.list} bounces={false}>
              {candidates.map((event, index) => (
                <Pressable
                  key={event.id}
                  style={({ pressed }) => [
                    styles.item,
                    index < candidates.length - 1 && styles.itemBorder,
                    pressed && styles.itemPressed,
                  ]}
                  onPress={() => onDelete(event)}
                >
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>{event.title}</Text>
                    <Text style={styles.itemTime}>{event.time || '全天'}</Text>
                  </View>
                  <Text style={styles.itemAction}>删除</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* 独立取消按钮 */}
          <Pressable
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.cancelBtnPressed]}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>取消</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
  },
  sheetWrap: {
    width: '100%',
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    maxHeight: '70%',
  },
  headerBlock: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  title: {
    ...typography.headline,
  },
  count: {
    ...typography.footnote,
    marginTop: 2,
  },
  list: {
    maxHeight: 320,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  itemPressed: {
    backgroundColor: colors.fill,
  },
  itemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    ...typography.body,
  },
  itemTime: {
    ...typography.footnote,
    marginTop: 2,
  },
  itemAction: {
    fontSize: 17,
    fontWeight: '400',
    color: colors.danger,
    paddingLeft: spacing.lg,
  },
  cancelBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelBtnPressed: {
    backgroundColor: colors.fill,
  },
  cancelText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.tint,
  },
});
