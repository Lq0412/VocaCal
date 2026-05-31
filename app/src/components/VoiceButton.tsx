/**
 * VoiceButton — 底部悬浮语音按钮
 *
 * 现代 CSS 麦克风图标，支持上滑取消录音。
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
          Animated.timing(pulseAnim, {
            toValue: 0.7,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
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
      pulseAnim.setValue(1);
    }
  }, [voiceState, pulseAnim]);

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
        : colors.accent;

  const label =
    voiceState === 'recording'
      ? isCanceling
        ? '松开取消'
        : '上滑取消'
      : voiceState === 'processing'
        ? '处理中'
        : '按住说话';

  return (
    <View style={styles.anchor} {...panResponder.panHandlers}>
      {/* 录音时的上方 X 取消区域 */}
      {voiceState === 'recording' && (
        <View style={[styles.cancelArea, isCanceling && styles.cancelAreaActive]}>
          <Text style={[styles.cancelIcon, isCanceling && styles.cancelIconActive]}>✕</Text>
        </View>
      )}

      <Animated.View style={{ opacity: pulseAnim }}>
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
          <Text style={styles.label}>{label}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    alignItems: 'center',
  },
  button: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  processingIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 6,
  },
  // CSS Mic Icon
  micIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -2,
  },
  micCapsule: {
    width: 10,
    height: 18,
    backgroundColor: '#ffffff',
    borderRadius: 5,
    zIndex: 2,
  },
  micArc: {
    position: 'absolute',
    top: 6,
    width: 16,
    height: 12,
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
    top: 18,
    width: 2,
    height: 5,
    backgroundColor: '#ffffff',
  },
  // 取消区域
  cancelArea: {
    position: 'absolute',
    top: -80,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EAEAE6',
    justifyContent: 'center',
    alignItems: 'center',
    // 添加一点阴影使其悬浮感更强
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
