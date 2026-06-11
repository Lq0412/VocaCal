/**
 * ParseResultCard — 结构化解析反馈卡片
 *
 * 展示 AI 对用户输入的理解：原文 + 意图 + 字段高亮。
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography, radius } from '../styles/theme';
import type { NLUResult, ParsedEventItem } from '../types/intent';

const INTENT_LABELS: Record<string, string> = {
  ADD_EVENT: '添加日程',
  DELETE_EVENT: '删除日程',
  QUERY_EVENT: '查询日程',
  MODIFY_EVENT: '修改日程',
};

interface ParseResultCardProps {
  intent: NLUResult;
}

function formatDateLabel(dateString: string) {
  const d = new Date(dateString + 'T00:00:00');
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekday}`;
}

function FieldRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, highlight && styles.fieldHighlight]}>{value}</Text>
    </View>
  );
}

function EventPreview({ item, index }: { item: ParsedEventItem; index: number }) {
  const parts = [
    item.date ? formatDateLabel(item.date) : null,
    item.time ?? null,
    item.title,
  ].filter(Boolean);

  return (
    <View style={[styles.eventPreviewRow, index > 0 && styles.eventPreviewBorder]}>
      <Text style={styles.eventPreviewIndex}>{index + 1}</Text>
      <Text style={styles.eventPreviewText}>{parts.join(' · ') || '待补充'}</Text>
    </View>
  );
}

export function ParseResultCard({ intent }: ParseResultCardProps) {
  const intentLabel = intent.intent ? INTENT_LABELS[intent.intent] ?? intent.intent : '未识别';
  const multiEvents = intent.events && intent.events.length > 1 ? intent.events : null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>识别原文</Text>
      <Text style={styles.rawText}>"{intent.raw}"</Text>

      <View style={styles.divider} />

      <FieldRow label="意图" value={intentLabel} highlight />

      {multiEvents ? (
        <>
          <Text style={styles.multiTitle}>解析出 {multiEvents.length} 个日程</Text>
          {multiEvents.map((item, index) => (
            <EventPreview key={index} item={item} index={index} />
          ))}
        </>
      ) : (
        <>
          {intent.title ? <FieldRow label="标题" value={intent.title} highlight /> : null}
          {intent.date ? <FieldRow label="日期" value={formatDateLabel(intent.date)} highlight /> : null}
          {intent.time ? <FieldRow label="时间" value={intent.time} highlight /> : null}
          {!intent.time && intent.intent === 'ADD_EVENT' ? (
            <FieldRow label="时间" value="全天" />
          ) : null}
        </>
      )}

      {intent.date_range ? (
        <FieldRow
          label="范围"
          value={`${formatDateLabel(intent.date_range.start)} — ${formatDateLabel(intent.date_range.end)}`}
          highlight
        />
      ) : null}

      {(intent.new_title || intent.new_date || intent.new_time) ? (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>修改为</Text>
          {intent.new_title ? <FieldRow label="新标题" value={intent.new_title} highlight /> : null}
          {intent.new_date ? <FieldRow label="新日期" value={formatDateLabel(intent.new_date)} highlight /> : null}
          {intent.new_time ? <FieldRow label="新时间" value={intent.new_time} highlight /> : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.tint,
  },
  sectionLabel: {
    ...typography.footnote,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  rawText: {
    ...typography.body,
    fontStyle: 'italic',
    color: colors.textSecondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginVertical: spacing.md,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  fieldLabel: {
    ...typography.subhead,
    width: 48,
    color: colors.textTertiary,
  },
  fieldValue: {
    ...typography.body,
    flex: 1,
  },
  fieldHighlight: {
    color: colors.tint,
    fontWeight: '600',
  },
  multiTitle: {
    ...typography.subhead,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  eventPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  eventPreviewBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
  },
  eventPreviewIndex: {
    ...typography.footnote,
    color: colors.tint,
    fontWeight: '700',
    width: 24,
  },
  eventPreviewText: {
    ...typography.body,
    flex: 1,
    color: colors.tint,
    fontWeight: '600',
  },
});
