import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/colors';
import { Card, Header, Screen, SectionTitle } from '../components/Common';

export default function FoodInfoScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { language } = useLanguage();
  const foodName = route.params?.foodName || 'Nasi Lemak';
  const source = route.params?.source || 'search';
  const getText = (en: string, zh: string, ms: string) => language === 'zh' ? zh : language === 'ms' ? ms : en;
  const nutritionData = {
    calories: 420,
    servingSize: '1 plate (350g)',
    nutrients: {
      carbs: { value: 58, unit: 'g', daily: 19 },
      protein: { value: 12, unit: 'g', daily: 24 },
      fat: { value: 16, unit: 'g', daily: 21 },
      fiber: { value: 3, unit: 'g', daily: 12 },
      sugar: { value: 4, unit: 'g', daily: 8 },
      sodium: { value: 680, unit: 'mg', daily: 30 },
    },
    vitamins: [
      { name: 'Vitamin A', amount: '15%', zh: '维生素A', ms: 'Vitamin A' },
      { name: 'Vitamin C', amount: '8%', zh: '维生素C', ms: 'Vitamin C' },
      { name: 'Calcium', amount: '6%', zh: '钙', ms: 'Kalsium' },
      { name: 'Iron', amount: '12%', zh: '铁', ms: 'Zat Besi' },
    ],
  };
  const ingredients = [
    { name: 'Rice', zh: '米饭', ms: 'Nasi' }, { name: 'Coconut milk', zh: '椰浆', ms: 'Santan' }, { name: 'Egg', zh: '鸡蛋', ms: 'Telur' }, { name: 'Peanuts', zh: '花生', ms: 'Kacang' }, { name: 'Ikan bilis', zh: '江鱼仔', ms: 'Ikan bilis' }, { name: 'Sambal', zh: '参巴酱', ms: 'Sambal' }, { name: 'Cucumber', zh: '黄瓜', ms: 'Timun' },
  ];
  const localName = (item: any) => language === 'zh' ? item.zh : language === 'ms' ? item.ms : item.name;
  return (
    <Screen padded={false}>
      <Header title={getText('Food Information', '食物信息', 'Maklumat Makanan')} subtitle={getText('Detailed nutritional breakdown', '详细营养分析', 'Analisis nutrisi terperinci')} icon="nutrition" onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        {source !== 'search' && (
          <Card style={styles.sourceCard}>
            <Text style={styles.sourceEmoji}>{source === 'voice' ? '🎤' : '📷'}</Text>
            <Text style={styles.sourceText}>{source === 'voice' ? getText('Detected via Voice Search', '通过语音搜索检测', 'Dikesan melalui Carian Suara') : getText('Detected via Camera', '通过相机检测', 'Dikesan melalui Kamera')}</Text>
          </Card>
        )}
        <Card style={styles.heroCard}>
          <Text style={styles.foodEmoji}>🍛</Text>
          <Text style={styles.foodName}>{foodName}</Text>
          <Text style={styles.serving}>{nutritionData.servingSize}</Text>
          <Text style={styles.calories}>{nutritionData.calories}</Text>
          <Text style={styles.serving}>kcal</Text>
        </Card>
        <SectionTitle title="Macronutrients" />
        <View style={styles.grid}>
          {Object.entries(nutritionData.nutrients).map(([key, item]: any) => (
            <Card key={key} style={styles.nutrientCard}>
              <Ionicons name={key === 'protein' ? 'fitness' : key === 'fat' ? 'water' : 'leaf'} color={colors.primaryDark} size={20} />
              <Text style={styles.nutrientKey}>{key}</Text>
              <Text style={styles.nutrientValue}>{item.value}{item.unit}</Text>
              <Text style={styles.nutrientDaily}>{item.daily}% daily</Text>
            </Card>
          ))}
        </View>
        <SectionTitle title="Ingredients" />
        <Card style={styles.tags}>{ingredients.map((item) => <Text key={item.name} style={styles.tag}>{localName(item)}</Text>)}</Card>
        <SectionTitle title="Vitamins & Minerals" />
        <Card>
          {nutritionData.vitamins.map((item: any) => <View key={item.name} style={styles.vitaminRow}><Text style={styles.vitaminName}>{localName(item)}</Text><Text style={styles.vitaminAmount}>{item.amount}</Text></View>)}
        </Card>
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  body: { padding: 20, gap: 12 },
  sourceCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EFF6FF' },
  sourceEmoji: { fontSize: 24 },
  sourceText: { color: '#1E3A8A', fontWeight: '800' },
  heroCard: { alignItems: 'center' },
  foodEmoji: { fontSize: 64 },
  foodName: { color: colors.text, fontSize: 26, fontWeight: '900', marginTop: 8 },
  serving: { color: colors.muted, marginTop: 4 },
  calories: { color: colors.primaryDark, fontSize: 58, fontWeight: '900', marginTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  nutrientCard: { width: '48%', padding: 14 },
  nutrientKey: { color: colors.muted, textTransform: 'capitalize', marginTop: 8 },
  nutrientValue: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 4 },
  nutrientDaily: { color: colors.primaryDark, fontSize: 12, fontWeight: '800', marginTop: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { color: colors.text, backgroundColor: colors.bg, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8, overflow: 'hidden', fontWeight: '700' },
  vitaminRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  vitaminName: { color: colors.text, fontWeight: '800' },
  vitaminAmount: { color: colors.primaryDark, fontWeight: '900' },
});
