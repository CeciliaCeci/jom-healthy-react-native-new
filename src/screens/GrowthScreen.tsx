import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/colors';
import { Card, Chip, Header, Screen, SectionTitle } from '../components/Common';

type Point = { month: string; value: number; normalMin?: number; normalMax?: number };

function SimpleLineChart({ data, unit }: { data: Point[]; unit: string }) {
  const width = 320;
  const height = 190;
  const padding = 28;
  const values = data.flatMap((d) => [d.value, d.normalMin ?? d.value, d.normalMax ?? d.value]);
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  const x = (i: number) => padding + (i * (width - padding * 2)) / Math.max(1, data.length - 1);
  const y = (v: number) => height - padding - ((v - min) * (height - padding * 2)) / Math.max(1, max - min);
  const points = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const areaTop = data[0].normalMin !== undefined ? data.map((d, i) => `${x(i)},${y(d.normalMax || d.value)}`).join(' ') : '';
  const areaBottom = data[0].normalMin !== undefined ? data.map((d, i) => `${x(i)},${y(d.normalMin || d.value)}`).reverse().join(' ') : '';
  return (
    <View style={styles.chartWrap}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#E5E7EB" strokeWidth="1" />
        <Line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#E5E7EB" strokeWidth="1" />
        {areaTop && <Polyline points={`${areaTop} ${areaBottom}`} fill="rgba(76,175,122,0.12)" stroke="none" />}
        <Polyline points={points} fill="none" stroke={colors.primaryDark} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => <Circle key={d.month} cx={x(i)} cy={y(d.value)} r="5" fill={colors.primaryDark} />)}
        {data.map((d, i) => <SvgText key={`${d.month}-label`} x={x(i)} y={height - 8} fontSize="11" textAnchor="middle" fill="#6B7280">{d.month}</SvgText>)}
        <SvgText x={width - padding} y={20} fontSize="11" textAnchor="end" fill="#6B7280">{unit}</SvgText>
      </Svg>
    </View>
  );
}

export default function GrowthScreen() {
  const navigation = useNavigation<any>();
  const { t } = useLanguage();
  const [selectedTab, setSelectedTab] = useState<'height' | 'weight' | 'bmi'>('height');
  const heightData = [
    { month: 'Jan', value: 110 }, { month: 'Mar', value: 112 }, { month: 'May', value: 115 }, { month: 'Jul', value: 118 },
  ];
  const weightData = [
    { month: 'Jan', value: 20 }, { month: 'Mar', value: 21 }, { month: 'May', value: 22 }, { month: 'Jul', value: 23 },
  ];
  const bmiData = [
    { month: 'Jan', value: 16.2, normalMin: 14.5, normalMax: 18.5 }, { month: 'Mar', value: 16.5, normalMin: 14.5, normalMax: 18.5 }, { month: 'May', value: 16.8, normalMin: 14.5, normalMax: 18.5 }, { month: 'Jul', value: 16.4, normalMin: 14.5, normalMax: 18.5 },
  ];
  const data = selectedTab === 'height' ? heightData : selectedTab === 'weight' ? weightData : bmiData;
  const unit = selectedTab === 'height' ? 'cm' : selectedTab === 'weight' ? 'kg' : 'BMI';
  const records = data.slice().reverse().map((d, index) => ({ date: ['Jul 15, 2026', 'May 10, 2026', 'Mar 05, 2026', 'Jan 02, 2026'][index], value: `${d.value}${selectedTab === 'bmi' ? '' : ` ${unit}`}`, status: 'Normal' }));

  return (
    <Screen padded={false}>
      <Header title={t('growth')} icon="trending-up" onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <Card>
          <View style={styles.tabs}>
            <Chip label="Height" selected={selectedTab === 'height'} onPress={() => setSelectedTab('height')} />
            <Chip label="Weight" selected={selectedTab === 'weight'} onPress={() => setSelectedTab('weight')} />
            <Chip label="BMI" selected={selectedTab === 'bmi'} onPress={() => setSelectedTab('bmi')} />
          </View>
          <Text style={styles.chartTitle}>{selectedTab === 'height' ? t('heightTrend') : selectedTab === 'weight' ? t('weightTrend') : 'BMI Trend'}</Text>
          <SimpleLineChart data={data} unit={unit} />
        </Card>
        <SectionTitle title={t('pastRecords')} />
        {records.map((record) => (
          <Card key={record.date} style={styles.recordRow}>
            <View><Text style={styles.recordDate}>{record.date}</Text><Text style={styles.recordStatus}>{record.status}</Text></View>
            <Text style={styles.recordValue}>{record.value}</Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  body: { padding: 20, gap: 12 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  chartTitle: { color: colors.text, fontWeight: '900', fontSize: 18, marginBottom: 10 },
  chartWrap: { backgroundColor: colors.bg, borderRadius: 18, paddingVertical: 8, alignItems: 'center' },
  recordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  recordDate: { color: colors.text, fontWeight: '800' },
  recordStatus: { color: colors.primaryDark, marginTop: 4, fontWeight: '700', fontSize: 12 },
  recordValue: { color: colors.text, fontWeight: '900', fontSize: 20 },
});
