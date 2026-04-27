import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/colors';
import { Card, Header, PrimaryButton, Screen } from '../components/Common';

export default function HealthCheckScreen() {
  const navigation = useNavigation<any>();
  const { t } = useLanguage();
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bmi, setBmi] = useState<number | null>(null);
  const [status, setStatus] = useState('');

  const calculateBMI = () => {
    const h = Number(height) / 100;
    const w = Number(weight);
    if (h > 0 && w > 0) {
      const value = w / (h * h);
      setBmi(Number(value.toFixed(1)));
      setStatus(value < 14 ? t('underweight') : value < 18 ? t('normal') : t('overweight'));
    }
  };

  const input = (label: string, value: string, setter: (value: string) => void, placeholder: string) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={(text) => { setter(text); setBmi(null); }} placeholder={placeholder} keyboardType="numeric" style={styles.input} />
    </View>
  );

  return (
    <Screen padded={false}>
      <Header title={t('checkChildHealth')} icon="fitness" onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <Card>
          {input(t('ageYears'), age, setAge, t('enterAge'))}
          {input(t('height'), height, setHeight, t('enterHeight'))}
          {input(t('weight'), weight, setWeight, t('enterWeight'))}
          <PrimaryButton title={t('calculateBMI')} onPress={calculateBMI} />
        </Card>
        {bmi !== null && (
          <Card style={styles.resultCard}>
            <Text style={styles.resultLabel}>{t('bmiResult')}</Text>
            <Text style={styles.bmi}>{bmi}</Text>
            <Text style={[styles.status, status === t('normal') ? styles.normal : status === t('underweight') ? styles.under : styles.over]}>{status}</Text>
            <PrimaryButton title={t('saveRecommendations')} icon="save" onPress={() => navigation.goBack()} style={{ marginTop: 18 }} />
          </Card>
        )}
        <Card><Text style={styles.tip}>{t('bmiTip')}</Text></Card>
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  body: { padding: 20, gap: 14 },
  label: { color: colors.text, fontWeight: '800', marginBottom: 8 },
  input: { backgroundColor: colors.bg, borderRadius: 16, paddingHorizontal: 14, minHeight: 50 },
  resultCard: { alignItems: 'center' },
  resultLabel: { color: colors.muted, fontWeight: '700' },
  bmi: { color: colors.text, fontSize: 54, fontWeight: '900', marginVertical: 6 },
  status: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99, fontWeight: '900' },
  normal: { backgroundColor: '#DCFCE7', color: '#16A34A' },
  under: { backgroundColor: '#FEF3C7', color: '#D97706' },
  over: { backgroundColor: '#FEE2E2', color: '#DC2626' },
  tip: { color: colors.muted, lineHeight: 21 },
});
