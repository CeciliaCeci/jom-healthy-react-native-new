import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export default function DigitalTwin({ tip, nickname, isComplete }: { tip: string; nickname: string; isComplete: boolean }) {
  return (
    <View style={styles.card}>
      <View style={styles.avatarWrap}>
        {isComplete && <Text style={styles.sparkle}>✨</Text>}
        <View style={[styles.avatar, isComplete && styles.avatarComplete]}>
          <Text style={styles.avatarText}>🧒</Text>
          <View style={[styles.cheek, { left: 12 }]} />
          <View style={[styles.cheek, { right: 12 }]} />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{nickname || 'Digital Twin'}</Text>
        <View style={styles.bubble}>
          <Text style={styles.tip}>{tip}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  avatarWrap: { width: 66, alignItems: 'center', justifyContent: 'center' },
  sparkle: { position: 'absolute', top: -10, left: 0, fontSize: 16, zIndex: 2 },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#BFE0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarComplete: { borderWidth: 3, borderColor: '#FDE68A' },
  avatarText: { fontSize: 30 },
  cheek: { position: 'absolute', top: 36, width: 8, height: 8, borderRadius: 4, backgroundColor: '#F9A8D4', opacity: 0.75 },
  name: { fontSize: 12, fontWeight: '800', color: colors.text, marginBottom: 5 },
  bubble: { backgroundColor: '#F5F1E6', borderRadius: 16, paddingVertical: 9, paddingHorizontal: 12 },
  tip: { color: colors.text, fontSize: 13, lineHeight: 18 },
});
