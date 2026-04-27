import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function Toast({ message, onClose, duration = 2500 }: { message: string; onClose: () => void; duration?: number }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  return (
    <View style={styles.wrap}>
      <View style={styles.toast}>
        <Ionicons name="checkmark-circle" color="white" size={20} />
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 96, zIndex: 100, alignItems: 'center' },
  toast: { backgroundColor: colors.primaryDark, borderRadius: 99, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', gap: 8, alignItems: 'center', shadowColor: colors.primaryDark, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  text: { color: 'white', fontWeight: '800' },
});
