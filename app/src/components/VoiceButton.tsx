/**
 * VoiceButton — 底部悬浮语音按钮（iOS 风格）
 *
 * iOS 系统蓝圆形按钮，录音时呼吸光晕，支持上滑取消。
 * 交互逻辑（按住说话 / 上滑取消）保持不变，仅视觉重做。
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { colors } from '../styles/theme';
import type { VoiceState } from '../services/voiceService';

interface VoiceButtonProps {
  voiceState: VoiceState;
  onPressIn: () => void;
  onPressOut: () => void;
  onCancel: () => void;
}

export function VoiceButton({ voiceState, onPressIn, onPressOut, onCancel }: VoiceButtonProps) {
  const [pulseAnim] = useState(new Animated.Value(1));
  const [haloAnim] = useState(new Animated.Value(0));
  const [isCanceling, setIsCanceling] = useState(false);
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  // 用一个 ref 保存最新的 props，避免 PanResponder 的闭包陷阱
  const latestProps = useRef({ voiceState, onPressIn, onPressOut, onCancel });
  useEffect(() => {
    latestProps.current = { voiceState, onPressIn, onPressOut, onCancel };
  });

  useEffect(() => {
    if (voiceState === 'recording') {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(haloAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(haloAnim, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseRef.current = anim;
      anim.start();
    } else {
      if (pulseRef.current) {
        pulseRef.current.stop();
        pulseRef.current = null;
      }
      haloAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [voiceState, pulseAnim, haloAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => latestProps.current.voiceState !== 'processing',
      onMoveShouldSetPanResponder: () => true, // 确保滑动时自己接管，不被 ScrollView 抢走
      onPanResponderTerminationRequest: () => false, // 拒绝交出控制权
      onPanResponderGrant: () => {
        setIsCanceling(false);
        latestProps.current.onPressIn();
      },
      onPanResponderMove: (e, gestureState) => {
        if (latestProps.current.voiceState === 'recording') {
          if (gestureState.dy < -50) {
            setIsCanceling(true);
          } else {
            setIsCanceling(false);
          }
        }
      },
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.dy < -50) {
          latestProps.current.onCancel();
        } else {
          latestProps.current.onPressOut();
        }
        setIsCanceling(false);
      },
      onPanResponderTerminate: () => {
        latestProps.current.onCancel();
        setIsCanceling(false);
      },
    })
  ).current;

  const bgColor =
    voiceState === 'recording'
      ? isCanceling
        ? colors.danger
        : colors.recording
      : voiceState === 'processing'
        ? colors.processing
        : colors.tint;

  const label =
    voiceState === 'recording'
      ? isCanceling
        ? '松开取消'
        : '上滑取消'
      : voiceState === 'processing'
        ? '处理中'
        : '按住说话';

  const haloScale = haloAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.9],
  });
  const haloOpacity = haloAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0],
  });

  return (
    <View style={styles.anchor} {...panResponder.panHandlers}>
      {/* 录音时的上方取消区域 */}
      {voiceState === 'recording' && (
        <View style={[styles.cancelArea, isCanceling && styles.cancelAreaActive]}>
          <Text style={[styles.cancelIcon, isCanceling && styles.cancelIconActive]}>✕</Text>
        </View>
      )}

      {/* 标签胶囊 */}
      <View style={styles.labelPill}>
        <Text style={styles.label}>{label}</Text>
      </View>

      <View style={styles.buttonWrap}>
        {/* 录音呼吸光晕 */}
        {voiceState === 'recording' && (
          <Animated.View
            style={[
              styles.halo,
              {
                backgroundColor: bgColor,
                opacity: haloOpacity,
                transform: [{ scale: haloScale }],
              },
            ]}
          />
        )}
        <View style={[styles.button, { backgroundColor: bgColor }]}>
          {voiceState === 'processing' ? (
            <Text style={styles.processingIcon}>···</Text>
          ) : (
            <View style={styles.micIcon}>
              <View style={styles.micCapsule} />
              <View style={styles.micArc} />
              <View style={styles.micStem} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    alignItems: 'center',
  },
  buttonWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  processingIcon: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  labelPill: {
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.barMaterial,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  // CSS Mic Icon
  micIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -2,
  },
  micCapsule: {
    width: 11,
    height: 19,
    backgroundColor: '#ffffff',
    borderRadius: 5.5,
    zIndex: 2,
  },
  micArc: {
    position: 'absolute',
    top: 6,
    width: 17,
    height: 13,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#ffffff',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    zIndex: 1,
  },
  micStem: {
    position: 'absolute',
    top: 19,
    width: 2,
    height: 5,
    backgroundColor: '#ffffff',
  },
  // 取消区域
  cancelArea: {
    position: 'absolute',
    top: -84,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.fill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelAreaActive: {
    backgroundColor: colors.danger,
    transform: [{ scale: 1.15 }],
  },
  cancelIcon: {
    color: colors.textSecondary,
    fontSize: 20,
    fontWeight: '400',
  },
  cancelIconActive: {
    color: '#ffffff',
  },
});
