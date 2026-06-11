/**
 * VocaCal 设计系统 — iOS 风格 token
 *
 * 设计语言对齐 Apple HIG：
 * - 单一系统蓝 tint，大面积留白
 * - 分组灰底 + 纯白卡片，靠底色分层（几乎不用阴影）
 * - hairline 分隔线 + inset 分组列表
 * - SF 风字阶，字重对比强（Large Title 34 ↔ 正文 17）
 */

export const colors = {
  /** iOS 系统蓝 — 唯一强调色（按钮 / 链接 / 选中态） */
  tint: '#007AFF',
  /** 兼容旧引用，统一指向系统蓝 */
  accent: '#007AFF',

  /** 主文字（label） */
  primary: '#000000',
  /** 正文（label） */
  textBody: '#1C1C1E',
  /** 次要文字（secondaryLabel） */
  textSecondary: '#8E8E93',
  /** 弱文字（tertiaryLabel） */
  textTertiary: '#C7C7CC',

  /** 分组页面底色（systemGroupedBackground） */
  background: '#F2F2F7',
  /** 卡片 / 列表底色（secondarySystemGroupedBackground） */
  surface: '#FFFFFF',
  /** 输入框底色（tertiarySystemFill 近似） */
  fill: '#E9E9EB',

  /** 边线（separator 近似实色） */
  border: '#E5E5EA',
  /** hairline 分隔线（opaqueSeparator 半透明） */
  separator: 'rgba(60,60,67,0.20)',

  /** 危险操作（systemRed） */
  danger: '#FF3B30',
  /** 录音态（systemRed） */
  recording: '#FF3B30',
  /** 处理态（systemGray） */
  processing: '#8E8E93',
  /** 成功（systemGreen） */
  success: '#34C759',

  /** 半透明底栏材质（模拟毛玻璃） */
  barMaterial: 'rgba(249,249,249,0.92)',

  /** 时间段色彩（iOS 系统色） */
  timeMorning: '#34C759',   // 上午：systemGreen
  timeAfternoon: '#FF9500', // 下午：systemOrange
  timeEvening: '#5856D6',   // 晚上：systemIndigo
  timeAllDay: '#C7C7CC',    // 全天：systemGray3
} as const;

export const typography = {
  /** iOS Large Title 34pt */
  largeTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    color: colors.primary,
    letterSpacing: 0.37,
  },
  /** Title 28pt */
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.primary,
    letterSpacing: 0.36,
  },
  /** Title2 22pt */
  title2: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  /** Headline 17pt 600 */
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  /** 兼容旧引用：subtitle ≈ headline */
  subtitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  /** Body 17pt */
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
    color: colors.textBody,
  },
  /** Subhead 15pt */
  subhead: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
  /** Footnote 13pt */
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
  /** Caption 12pt */
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
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
  /** iOS 卡片标准圆角 */
  md: 12,
  /** iOS 大卡片 / 分组列表圆角 */
  lg: 16,
  full: 999,
} as const;
