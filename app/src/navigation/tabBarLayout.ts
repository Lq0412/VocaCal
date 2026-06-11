/**
 * Tab 栏布局常量 — 统一底部留白与安全区计算
 */

import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../styles/theme';

/** Tab 栏内容区高度（图标 + 标签，不含 home indicator） */
export const TAB_BAR_CONTENT_HEIGHT =
  Platform.select({ ios: 49, default: 56 }) ?? 56;

/** VoiceButton 占位高度（按钮 + 标签胶囊及间距，与 VoiceButton 样式同步） */
const VOICE_BUTTON_BLOCK_HEIGHT = 72 + 10 + 28;

export function useTabBarLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + insets.bottom;
  const scrollBottomPadding = tabBarHeight + spacing.md;
  const voiceButtonBottomOffset = tabBarHeight + spacing.sm;
  const scrollBottomPaddingWithVoice =
    voiceButtonBottomOffset + VOICE_BUTTON_BLOCK_HEIGHT + spacing.md;

  return {
    tabBarHeight,
    scrollBottomPadding,
    voiceButtonBottomOffset,
    scrollBottomPaddingWithVoice,
  };
}
