import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/colors';

export default function ProgressRing({ current, target, label, color, size = 82 }: { current: number; target: number; label: string; color: string; size?: number }) {
  const percentage = Math.min(target > 0 ? (current / target) * 100 : 0, 100);
  const strokeWidth = size <= 62 ? 6 : 8;
  const radius = (size - strokeWidth - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#E5E7EB" strokeWidth={strokeWidth} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
        <View style={styles.center}>
          <Text style={styles.current}>{current}g</Text>
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.target}>/{target}g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', flex: 1 },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  current: { color: colors.text, fontSize: 15, fontWeight: '800' },
  label: { color: colors.muted, fontSize: 12, marginTop: 5 },
  target: { color: '#9CA3AF', fontSize: 11, marginTop: 1 },
});
