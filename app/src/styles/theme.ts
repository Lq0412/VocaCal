/**
 * VocaCal 设计系统 — 统一 token
 *
 * 色彩：灰阶为主 + 唯一暖色强调
 * 字阶：4 级（标题 / 副标题 / 正文 / 标注）
 * 间距：4px 倍数
 */

export const colors = {
  /** 主文字 / 选中态 */
  primary: '#2D2D2D',
  /** 唯一强调色 — 语音按钮、时间标记 */
  accent: '#E8804A',
  /** 页面底色（暖灰白） */
  background: '#F6F5F2',
  /** 卡片/输入框底色 */
  surface: '#FFFFFF',
  /** 边线 */
  border: '#EAEAE6',
  /** 次要文字 */
  textSecondary: '#8C8C88',
  /** 弱文字 */
  textTertiary: '#B5B5B0',
  /** 正文 */
  textBody: '#4A4A48',
  /** 危险操作 */
  danger: '#D4503A',
  /** 录音态 */
  recording: '#D4503A',
  /** 处理态 */
  processing: '#8C8C88',

  /** 时间段色彩（事件色条） */
  timeMorning: '#7EAAA2',   // 上午：沉稳青
  timeAfternoon: '#E8804A', // 下午：暖柿
  timeEvening: '#C4654A',   // 晚上：深柿
  timeAllDay: '#B5B5B0',    // 全天：灰
} as const;

export const typography = {
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: colors.textBody,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: colors.textSecondary,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;
