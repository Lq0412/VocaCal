/**
 * InsightsScreen — 本地日程洞察
 *
 * 基于 SQLite 事件做轻量统计与温情文案，不调后端。
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { useDatabase } from '../hooks/useDatabase';
import { useTabBarLayout } from '../navigation/tabBarLayout';
import { getAllEvents } from '../services/storageService';
import { colors, typography, spacing, radius } from '../styles/theme';
import { formatDateLabel, getWeekBounds } from '../utils/dateUtils';
import { getCurrentWeekInsights, type WeekInsights } from '../utils/insightsUtils';

export function InsightsScreen() {
  const { ready, error } = useDatabase();
  const { scrollBottomPadding } = useTabBarLayout();
  const [insights, setInsights] = useState<WeekInsights | null>(null);

  const loadInsights = useCallback(async () => {
    if (!ready) return;
    const events = await getAllEvents();
    setInsights(getCurrentWeekInsights(events));
  }, [ready]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  useFocusEffect(
    useCallback(() => {
      loadInsights();
    }, [loadInsights]),
  );

  const weekLabel = formatDateLabel(getWeekBounds().start).replace(/\s.*/, '');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <ScreenHeader
          title="洞察"
          subtitle="基于本机日程的小助手分析"
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={styles.card}>
              <Text style={styles.errorText}>数据库错误：{error}</Text>
            </View>
          ) : null}

          {insights ? (
            <>
              {/* 今日 + 本周数字卡片 */}
              <View style={styles.metricRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>今日</Text>
                  <Text style={styles.metricValue}>{insights.todayCount}</Text>
                  <Text style={styles.metricUnit}>个日程</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>本周</Text>
                  <Text style={styles.metricValue}>{insights.weekTotal}</Text>
                  <Text style={styles.metricUnit}>个日程</Text>
                </View>
              </View>

              {/* AI 助手温度文案 */}
              <View style={styles.tipCard}>
                <Text style={styles.tipEmoji}>✨</Text>
                <Text style={styles.tipTitle}>小助手说</Text>
                <Text style={styles.tipBody}>{insights.tipLine}</Text>
              </View>

              {/* 周洞察摘要 */}
              <Text style={styles.sectionTitle}>本周一览</Text>
              <View style={styles.card}>
                {insights.summaryLines.map((line, index) => (
                  <View
                    key={line}
                    style={[
                      styles.summaryRow,
                      index < insights.summaryLines.length - 1 && styles.summaryBorder,
                    ]}
                  >
                    <Text style={styles.summaryText}>{line}</Text>
                  </View>
                ))}
              </View>

              {/* 详细指标 */}
              <Text style={styles.sectionTitle}>更多细节</Text>
              <View style={styles.card}>
                <InsightRow
                  label="最忙的一天"
                  value={
                    insights.busiestDay
                      ? `${formatDateLabel(insights.busiestDay.date)}（${insights.busiestDay.count} 个）`
                      : '本周暂无日程'
                  }
                />
                <InsightRow
                  label="空闲日"
                  value={
                    insights.freeDays.length > 0
                      ? `${insights.freeDays.length} 天`
                      : '本周每天都有安排'
                  }
                  isLast={insights.eveningBusyDays < 3}
                />
                {insights.eveningBusyDays >= 3 ? (
                  <InsightRow
                    label="晚间忙碌"
                    value={`${insights.eveningBusyDays} 天晚上有安排`}
                    isLast
                  />
                ) : null}
              </View>

              <Text style={styles.footer}>
                数据全部来自本机 SQLite，{weekLabel} 起每周自动更新。
              </Text>
            </>
          ) : (
            <View style={styles.card}>
              <Text style={styles.loadingText}>正在分析你的日程…</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function InsightRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.detailRow, !isLast && styles.summaryBorder]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  metricLabel: {
    ...typography.footnote,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.tint,
    marginTop: spacing.xs,
    lineHeight: 44,
  },
  metricUnit: {
    ...typography.subhead,
    marginTop: 2,
  },
  tipCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  tipEmoji: {
    fontSize: 22,
    marginBottom: spacing.xs,
  },
  tipTitle: {
    ...typography.headline,
    marginBottom: spacing.xs,
  },
  tipBody: {
    ...typography.body,
    lineHeight: 24,
  },
  sectionTitle: {
    ...typography.title2,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  summaryRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  summaryBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  summaryText: {
    ...typography.body,
    lineHeight: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  detailLabel: {
    ...typography.body,
    color: colors.textSecondary,
    flexShrink: 0,
  },
  detailValue: {
    ...typography.body,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  footer: {
    ...typography.footnote,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    ...typography.subhead,
    color: colors.danger,
    padding: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    padding: spacing.lg,
    color: colors.textSecondary,
  },
});
