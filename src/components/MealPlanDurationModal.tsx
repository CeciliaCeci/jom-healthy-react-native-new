import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, IconButton } from './Common';
import { useLanguage } from '../context/LanguageContext';
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
  const { language } = useLanguage();
  const getText = (en: string, zh: string, ms: string) => language === 'zh' ? zh : language === 'ms' ? ms : en;

  const options = [
    { days: 1, label: getText('1 Day', '1 天', '1 Hari'), subtitle: getText('Quick plan', '快速计划', 'Pelan pantas') },
    { days: 3, label: getText('3 Days', '3 天', '3 Hari'), subtitle: getText('Short term', '短期', 'Jangka pendek') },
    { days: 5, label: getText('5 Days', '5 天', '5 Hari'), subtitle: getText('Weekday plan', '工作日计划', 'Pelan hari bekerja') },
    { days: 7, label: getText('7 Days', '7 天', '7 Hari'), subtitle: getText('Full week', '整周', 'Seminggu penuh') },
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
                <Text style={styles.title}>{getText('Select Meal Plan Duration', '选择膳食计划时长', 'Pilih Tempoh Pelan Makanan')}</Text>
                <Text style={styles.sub}>{getText('Choose how many days to plan', '选择要规划的天数', 'Pilih bilangan hari untuk dirancang')}</Text>
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
