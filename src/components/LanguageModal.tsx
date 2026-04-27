import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/colors';
import { Card, IconButton, PrimaryButton, SecondaryButton } from './Common';

export default function LanguageModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { language, setLanguage, t } = useLanguage();
  const [pending, setPending] = useState<'en' | 'zh' | 'ms' | null>(null);
  const languages = [
    { code: 'en' as const, name: 'English', nativeName: 'English' },
    { code: 'zh' as const, name: 'Chinese', nativeName: '中文' },
    { code: 'ms' as const, name: 'Malay', nativeName: 'Bahasa Melayu' },
  ];

  const select = (code: 'en' | 'zh' | 'ms') => {
    if (code === language) return onClose();
    setPending(code);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Card style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('selectLanguage')}</Text>
            <IconButton icon="close" onPress={onClose} />
          </View>
          {!pending ? (
            <View style={{ gap: 10 }}>
              {languages.map((item) => {
                const active = item.code === language;
                return (
                  <Pressable key={item.code} onPress={() => select(item.code)} style={[styles.option, active && styles.optionActive]}>
                    <View>
                      <Text style={[styles.optionTitle, active && styles.optionTextActive]}>{item.nativeName}</Text>
                      <Text style={[styles.optionSub, active && styles.optionTextActive]}>{item.name}</Text>
                    </View>
                    {active && <Ionicons name="checkmark" size={22} color="white" />}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              <Text style={styles.confirmText}>Change language to {languages.find((l) => l.code === pending)?.nativeName}?</Text>
              <PrimaryButton title="Confirm" onPress={() => { setLanguage(pending); setPending(null); onClose(); }} />
              <SecondaryButton title={t('cancel')} onPress={() => setPending(null)} />
            </View>
          )}
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  option: { borderRadius: 18, backgroundColor: colors.bg, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionActive: { backgroundColor: colors.primaryDark },
  optionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  optionSub: { color: colors.muted, marginTop: 2 },
  optionTextActive: { color: 'white' },
  confirmText: { color: colors.text, fontSize: 16, lineHeight: 22 },
});
