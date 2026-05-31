/**
 * VoiceButton — 底部悬浮语音按钮
 *
 * 暖柿色，无发光阴影。录音时脉冲用透明度渐变。
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../styles/theme';
import type { VoiceState } from '../services/voiceService';

interface VoiceButtonProps {
  voiceState: VoiceState;
  onPressIn: () => void;
  onPressOut: () => void;
}

export function VoiceButton({ voiceState, onPressIn, onPressOut }: VoiceButtonProps) {
  const [pulseAnim] = useState(new Animated.Value(1));
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

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

  const bgColor =
    voiceState === 'recording'
      ? colors.recording
      : voiceState === 'processing'
        ? colors.processing
        : colors.accent;

  const label =
    voiceState === 'recording'
      ? '松开结束'
      : voiceState === 'processing'
        ? '处理中'
        : '按住说话';

  const icon =
    voiceState === 'recording'
      ? '●'
      : voiceState === 'processing'
        ? '···'
        : '🎙️';

  return (
    <View style={styles.anchor}>
      <Animated.View style={{ opacity: pulseAnim }}>
        <Pressable
          style={[styles.button, { backgroundColor: bgColor }]}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={voiceState === 'processing'}
        >
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.label}>{label}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
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
  icon: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
});
