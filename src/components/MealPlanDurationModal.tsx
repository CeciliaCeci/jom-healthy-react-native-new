import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, IconButton } from './Common';
import { colors } from '../theme/colors';

export default function MealPlanDurationModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (days: number) => void;
}) {
  const options = [
    { days: 1, label: '1 Day', subtitle: 'Quick plan' },
    { days: 3, label: '3 Days', subtitle: 'Short term' },
    { days: 5, label: '5 Days', subtitle: 'Weekday plan' },
    { days: 7, label: '7 Days', subtitle: 'Full week' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={(event) => event.stopPropagation()}>
          <Card style={styles.sheet}>
            <View style={styles.header}>
              <View style={styles.iconBox}>
                <Ionicons name="calendar" size={24} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Select Meal Plan Duration</Text>
                <Text style={styles.sub}>Choose how many days to plan</Text>
              </View>
              <IconButton icon="close" onPress={onClose} />
            </View>
            <View style={{ gap: 10 }}>
              {options.map((item) => (
                <Pressable
                  key={item.days}
                  style={styles.option}
                  onPress={() => {
                    onSelect(item.days);
                    onClose();
                  }}
                >
                  <View>
                    <Text style={styles.optionTitle}>{item.label}</Text>
                    <Text style={styles.optionSub}>{item.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  iconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, marginTop: 2 },
  option: { borderRadius: 18, backgroundColor: colors.bg, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  optionSub: { color: colors.muted, marginTop: 2 },
});
