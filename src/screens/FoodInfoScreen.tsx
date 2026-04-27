import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/colors';
import { Card, Header, Screen, SectionTitle } from '../components/Common';
import { FoodNutrition, getFoodNutrition } from '../services/api';

export default function FoodInfoScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { language } = useLanguage();
  const foodName = route.params?.foodName || 'Nasi Lemak';
  const source = route.params?.source || 'search';

  const [nutritionData, setNutritionData] = useState<FoodNutrition | null>(route.params?.foodData ?? null);
  const [loading, setLoading] = useState(!route.params?.foodData);
  const [error, setError] = useState(route.params?.foodError ?? '');

  const getText = (en: string, zh: string, ms: string) => (language === 'zh' ? zh : language === 'ms' ? ms : en);

  const loadFoodInfo = useCallback(async () => {
    setLoading(true);
    setError('');

    const result = await getFoodNutrition(foodName);

    if (!result.ok) {
      setNutritionData(null);
      setError(result.message);
      setLoading(false);
      return;
    }

    setNutritionData(result.data);
    setLoading(false);
  }, [foodName]);

  useEffect(() => {
    if (route.params?.foodData) return;
    loadFoodInfo();
  }, [loadFoodInfo, route.params?.foodData]);

  const data = nutritionData;

  return (
    <Screen padded={false}>
      <Header
        title={getText('Food Information', '食物信息', 'Maklumat Makanan')}
        subtitle={getText('Detailed nutritional breakdown', '详细营养分析', 'Analisis nutrisi terperinci')}
        icon="nutrition"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.body}>
        {source !== 'search' && (
          <Card style={styles.sourceCard}>
            <Text style={styles.sourceEmoji}>{source === 'voice' ? '🎤' : '📷'}</Text>
            <Text style={styles.sourceText}>
              {source === 'voice'
                ? getText('Detected via Voice Search', '通过语音搜索检测', 'Dikesan melalui Carian Suara')
                : getText('Detected via Camera', '通过相机检测', 'Dikesan melalui Kamera')}
            </Text>
          </Card>
        )}

        {loading ? (
          <Card style={styles.loadingCard}>
            <ActivityIndicator color={colors.primaryDark} />
            <Text style={styles.loadingText}>{getText('Loading nutrition...', '正在加载营养...', 'Memuat nutrisi...')}</Text>
          </Card>
        ) : error ? (
          <Card style={styles.errorBox}>
            <Ionicons name="wifi-outline" size={34} color="#EF4444" />
            <Text style={styles.errorTitle}>{getText('Network Error', '网络错误', 'Ralat Rangkaian')}</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadFoodInfo}>
              <Text style={styles.retryText}>{getText('Retry', '重试', 'Cuba Lagi')}</Text>
            </Pressable>
          </Card>
        ) : data ? (
          <>
            <Card style={styles.heroCard}>
              <Text style={styles.foodEmoji}>🍛</Text>
              <Text style={styles.foodName}>{data.name}</Text>
              <Text style={styles.serving}>{data.servingSize}</Text>
              <Text style={styles.calories}>{Math.round(data.calories || 0)}</Text>
              <Text style={styles.serving}>kcal</Text>
            </Card>

            <SectionTitle title={getText('Macronutrients', '宏量营养素', 'Makronutrien')} />
            <View style={styles.grid}>
              {Object.entries(data.nutrients).map(([key, item]: any) => (
                <Card key={key} style={styles.nutrientCard}>
                  <Ionicons name={key === 'protein' ? 'fitness' : key === 'fat' ? 'water' : 'leaf'} color={colors.primaryDark} size={20} />
                  <Text style={styles.nutrientKey}>{key}</Text>
                  <Text style={styles.nutrientValue}>{Math.round(item.value || 0)}{item.unit}</Text>
                </Card>
              ))}
            </View>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 12, paddingBottom: 110 },
  sourceCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EFF6FF' },
  sourceEmoji: { fontSize: 24 },
  sourceText: { color: '#1E3A8A', fontWeight: '800' },
  loadingCard: { alignItems: 'center', gap: 10 },
  loadingText: { color: colors.muted, fontWeight: '700' },
  errorBox: { backgroundColor: '#FEF2F2', alignItems: 'center', padding: 22 },
  errorTitle: { marginTop: 8, fontSize: 18, fontWeight: '900', color: '#991B1B' },
  errorText: { marginTop: 8, fontSize: 13, color: '#7F1D1D', textAlign: 'center', lineHeight: 19 },
  retryButton: { marginTop: 16, backgroundColor: '#EF4444', paddingHorizontal: 22, paddingVertical: 11, borderRadius: 999 },
  retryText: { color: '#FFFFFF', fontWeight: '900' },
  heroCard: { alignItems: 'center' },
  foodEmoji: { fontSize: 64 },
  foodName: { color: colors.text, fontSize: 26, fontWeight: '900', marginTop: 8, textAlign: 'center' },
  serving: { color: colors.muted, marginTop: 4 },
  calories: { color: colors.primaryDark, fontSize: 58, fontWeight: '900', marginTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  nutrientCard: { width: '48%', padding: 14 },
  nutrientKey: { color: colors.muted, textTransform: 'capitalize', marginTop: 8 },
  nutrientValue: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 4 },
});
