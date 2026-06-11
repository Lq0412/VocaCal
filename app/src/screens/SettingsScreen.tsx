/**
 * SettingsScreen — iOS 分组设置页
 */

import React, { useCallback } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { useTabBarLayout } from '../navigation/tabBarLayout';
import { API_BASE_URL } from '../services/apiService';
import { clearAllEvents } from '../services/storageService';
import { colors, typography, spacing, radius } from '../styles/theme';

const APP_VERSION = '0.0.1';

export function SettingsScreen() {
  const { scrollBottomPadding } = useTabBarLayout();
  const handleClearData = useCallback(() => {
    Alert.alert(
      '清除所有日程',
      '将删除本机全部日程数据，此操作不可恢复。确定继续？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '清除',
          style: 'destructive',
          onPress: async () => {
            await clearAllEvents();
            Alert.alert('已清除', '所有本地日程已删除。');
          },
        },
      ],
    );
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <ScreenHeader title="设置" />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionHeader}>服务</Text>
          <View style={styles.group}>
            <SettingsRow
              label="后端地址"
              value={API_BASE_URL}
              multiline
            />
            <SettingsRow
              label="说明"
              value="语音识别与 NLU 走后端；日程数据仅存本机"
              multiline
              isLast
            />
          </View>

          <Text style={styles.sectionHeader}>关于</Text>
          <View style={styles.group}>
            <SettingsRow label="应用名称" value="VocaCal" />
            <SettingsRow
              label="简介"
              value="专为中文口语设计的语音优先日历"
              multiline
            />
            <SettingsRow label="版本" value={APP_VERSION} isLast />
          </View>

          <Text style={styles.sectionHeader}>数据</Text>
          <View style={styles.group}>
            <Pressable
              style={({ pressed }) => [
                styles.dangerRow,
                pressed && styles.rowPressed,
              ]}
              onPress={handleClearData}
            >
              <Text style={styles.dangerText}>清除所有日程</Text>
            </Pressable>
          </View>

          <Text style={styles.footer}>
            VocaCal · 七牛云 × XEngineer 暑期实训营
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function SettingsRow({
  label,
  value,
  multiline = false,
  isLast = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[styles.rowValue, multiline && styles.rowValueMultiline]}
        numberOfLines={multiline ? undefined : 1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  scroll: {
    flex: 1,
  },
  sectionHeader: {
    ...typography.footnote,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  row: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  rowPressed: {
    backgroundColor: colors.fill,
  },
  rowLabel: {
    ...typography.footnote,
    marginBottom: 4,
  },
  rowValue: {
    ...typography.body,
  },
  rowValueMultiline: {
    lineHeight: 22,
  },
  dangerRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  dangerText: {
    ...typography.body,
    color: colors.danger,
    fontWeight: '600',
  },
  footer: {
    ...typography.footnote,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});
