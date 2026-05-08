import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { Header, Screen } from '../components/Common';
import { useLanguage } from '../context/LanguageContext';

const BASE_URL = 'https://jom-healthy-java.onrender.com';

type FoodStatus = 'healthy' | 'moderate' | 'unhealthy';

type FoodNutrition = {
  foodNameEn?: string;
  foodNameCn?: string;
  foodNameMs?: string;
  foodNameOriginal?: string;
  foodNameCombine?: string;

  energyKcal?: number;
  calories?: number;
  sugarG?: number;
  sugar?: number;
  fatG?: number;
  fat?: number;
  proteinG?: number;
  protein?: number;
  carbohydrateG?: number;
  carbs?: number;
  picUrl?: string;

  healthScore?: number;
  healthGrade?: string;
  healthLabel?: string;
  healthReasonEn?: string;
  healthReasonCn?: string;
  healthReasonMs?: string;
  parentTipsEn?: string[];
  parentTipsCn?: string[];
  parentTipsMs?: string[];
};

function pickNumber(...values: any[]) {
  for (const value of values) {
    const num = Number(value);

    if (!Number.isNaN(num) && value !== null && value !== undefined) {
      return num;
    }
  }

  return 0;
}

function getFoodDisplayName(
  food: FoodNutrition | null,
  fallback: string,
  language: string
) {
  if (language === 'zh') {
    return (
      food?.foodNameCn ||
      food?.foodNameOriginal ||
      food?.foodNameEn ||
      food?.foodNameMs ||
      fallback ||
      'Food'
    );
  }

  if (language === 'ms') {
    return (
      food?.foodNameMs ||
      food?.foodNameOriginal ||
      food?.foodNameEn ||
      food?.foodNameCn ||
      fallback ||
      'Food'
    );
  }

  return (
    food?.foodNameEn ||
    food?.foodNameOriginal ||
    food?.foodNameCombine ||
    food?.foodNameMs ||
    food?.foodNameCn ||
    fallback ||
    'Food'
  );
}

function getFallbackFoodStatus(food: FoodNutrition | null): FoodStatus {
  const calories = pickNumber(food?.energyKcal, food?.calories);
  const sugar = pickNumber(food?.sugarG, food?.sugar);
  const fat = pickNumber(food?.fatG, food?.fat);

  if (sugar >= 18 || fat >= 25 || calories >= 650) {
    return 'unhealthy';
  }

  if (sugar >= 8 || fat >= 15 || calories >= 350) {
    return 'moderate';
  }

  return 'healthy';
}

function getStatusByScore(food: FoodNutrition | null): FoodStatus {
  const score = Number(food?.healthScore);

  if (!Number.isNaN(score) && food?.healthScore !== undefined) {
    if (score >= 80) return 'healthy';
    if (score >= 50) return 'moderate';
    return 'unhealthy';
  }

  const grade = String(food?.healthGrade || '').toUpperCase();

  if (grade === 'A' || grade === 'B') return 'healthy';
  if (grade === 'C') return 'moderate';
  if (grade === 'D' || grade === 'E' || grade === 'F') return 'unhealthy';

  return getFallbackFoodStatus(food);
}

export default function FoodInfoScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { language } = useLanguage();
  const getText = (en: string, zh: string, ms: string) => language === 'zh' ? zh : language === 'ms' ? ms : en;

  const foodName =
    route.params?.foodName ||
    route.params?.query ||
    route.params?.name ||
    'Nasi Lemak';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [food, setFood] = useState<FoodNutrition | null>(null);

  const loadFood = useCallback(async () => {
    const query = String(foodName || '').trim();

    if (!query) {
      setError(getText('Please enter a food name.', '请输入食物名称。', 'Sila masukkan nama makanan.'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${BASE_URL}/food/getFoodNutrition?name=${encodeURIComponent(query)}`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Server error ${response.status}`);
      }

      const payload = await response.json();
      const data = Array.isArray(payload?.data) ? payload.data : [];

      if (!data.length) {
        setFood(null);
        setError(getText('No nutrition data found for this food.', '没有找到该食物的营养数据。', 'Tiada data nutrisi ditemui untuk makanan ini.'));
        return;
      }

      setFood(data[0]);
    } catch (e) {
      console.log('Food nutrition fetch failed:', e);
      setFood(null);
      setError(getText('Network error. Please check your connection and try again.', '网络错误。请检查网络连接后重试。', 'Ralat rangkaian. Sila semak sambungan anda dan cuba lagi.'));
    } finally {
      setLoading(false);
    }
  }, [foodName]);

  useEffect(() => {
    loadFood();
  }, [loadFood]);

  const displayName = getFoodDisplayName(food, foodName, language);
  const status = getStatusByScore(food);

  const nutrition = useMemo(() => {
    return {
      calories: pickNumber(food?.energyKcal, food?.calories),
      sugar: pickNumber(food?.sugarG, food?.sugar),
      fat: pickNumber(food?.fatG, food?.fat),
      protein: pickNumber(food?.proteinG, food?.protein),
      carbs: pickNumber(food?.carbohydrateG, food?.carbs),
    };
  }, [food]);

  const healthReason =
    language === 'zh'
      ? food?.healthReasonCn || food?.healthReasonEn
      : language === 'ms'
        ? food?.healthReasonMs || food?.healthReasonEn
        : food?.healthReasonEn;

  const parentTips =
    language === 'zh'
      ? food?.parentTipsCn || food?.parentTipsEn
      : language === 'ms'
        ? food?.parentTipsMs || food?.parentTipsEn
        : food?.parentTipsEn;

  const tips =
    Array.isArray(parentTips) && parentTips.length > 0
      ? parentTips
      : [
          'Pair with fresh vegetables or fruit for more nutrients.',
          'Serve an age-appropriate portion for your child.',
          'Choose grilled, steamed, or boiled options when possible.',
        ];

  const statusConfig = {
    healthy: {
      icon: 'checkmark-circle' as const,
      emoji: '✅',
      label: food?.healthLabel || 'Healthy Choice',
      description: healthReason || 'This is a healthy choice for children.',
      color: '#4CAF7A',
      bg: '#EAF7F0',
    },
    moderate: {
      icon: 'alert-circle' as const,
      emoji: '⚠️',
      label: food?.healthLabel || 'Moderate',
      description:
        healthReason || 'Okay in moderation. Balance with healthier options.',
      color: '#D99A00',
      bg: '#FFF9E6',
    },
    unhealthy: {
      icon: 'alert-circle' as const,
      emoji: '❌',
      label: food?.healthLabel || 'High in Sugar/Fat',
      description:
        healthReason || 'Try to limit this food. Choose healthier alternatives.',
      color: '#EF4444',
      bg: '#FFE8E8',
    },
  }[status];

  const nutritionInfo = [
    {
      icon: 'flame' as const,
      label: 'Calories',
      value: `${nutrition.calories || '-'} kcal`,
      color: '#FF9F6E',
      bg: '#FFE8DC',
    },
    {
      icon: 'cube' as const,
      label: 'Sugar',
      value: `${nutrition.sugar || 0}g`,
      color: '#FF8C8C',
      bg: '#FFE8E8',
    },
    {
      icon: 'water' as const,
      label: 'Fat',
      value: `${nutrition.fat || 0}g`,
      color: '#7EC8E3',
      bg: '#EAF6FB',
    },
  ];

  return (
    <Screen padded={false}>
      <Header
        title={getText('Food Analysis', '食物分析', 'Analisis Makanan')}
        subtitle={getText('Nutrition result', '营养结果', 'Keputusan nutrisi')}
        icon="restaurant"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primaryDark} />
            <Text style={styles.loadingText}>{getText('Loading nutrition data...', '正在加载营养数据...', 'Memuatkan data nutrisi...')}</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Ionicons name="wifi-outline" size={36} color="#EF4444" />
            <Text style={styles.errorTitle}>{getText('Unable to load food data', '无法加载食物数据', 'Tidak dapat memuatkan data makanan')}</Text>
            <Text style={styles.errorText}>{error}</Text>

            <Pressable style={styles.retryButton} onPress={loadFood}>
              <Text style={styles.retryText}>{getText('Retry', '重试', 'Cuba lagi')}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.foodCard}>
              {food?.picUrl ? (
                <Image source={{ uri: food.picUrl }} style={styles.foodImage} />
              ) : (
                <View style={styles.foodImageFallback}>
                  <Text style={styles.foodEmoji}>🍽️</Text>
                </View>
              )}

              <View style={styles.foodNameWrap}>
                <Text style={styles.foodName}>{displayName}</Text>
              </View>
            </View>

            <View style={[styles.statusCard, { backgroundColor: statusConfig.bg }]}>
              <View style={styles.statusTopRow}>
                <Ionicons
                  name={statusConfig.icon}
                  size={30}
                  color={statusConfig.color}
                />

                <View style={styles.statusTitleWrap}>
                  <Text style={[styles.statusTitle, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>

                  {food?.healthGrade || food?.healthScore !== undefined ? (
                    <Text style={styles.scoreText}>
                      Grade {food?.healthGrade || '-'} · Score{' '}
                      {food?.healthScore ?? '-'}
                    </Text>
                  ) : null}
                </View>

                <Text style={styles.statusEmoji}>{statusConfig.emoji}</Text>
              </View>

              <Text style={styles.statusDescription}>
                {statusConfig.description}
              </Text>
            </View>

            <View>
              <Text style={styles.sectionTitle}>{getText('Nutrition Facts', '营养成分', 'Fakta Nutrisi')}</Text>

              <View style={styles.nutritionGrid}>
                {nutritionInfo.map((item) => (
                  <View key={item.label} style={styles.nutritionCard}>
                    <View
                      style={[
                        styles.nutritionIconBox,
                        { backgroundColor: item.bg },
                      ]}
                    >
                      <Ionicons name={item.icon} size={22} color={item.color} />
                    </View>

                    <Text style={styles.nutritionLabel}>{item.label}</Text>
                    <Text style={styles.nutritionValue}>{item.value}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.additionalCard}>
                <View style={styles.additionalItem}>
                  <Text style={styles.additionalLabel}>{getText('Protein', '蛋白质', 'Protein')}</Text>
                  <Text style={styles.additionalValue}>
                    {nutrition.protein || 0}g
                  </Text>
                </View>

                <View style={styles.additionalDivider} />

                <View style={styles.additionalItem}>
                  <Text style={styles.additionalLabel}>{getText('Carbs', '碳水', 'Karbohidrat')}</Text>
                  <Text style={styles.additionalValue}>
                    {nutrition.carbs || 0}g
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.tipsCard}>
              <View style={styles.tipsTitleRow}>
                <Text style={styles.tipsEmoji}>💡</Text>
                <Text style={styles.tipsTitle}>{getText('Tips for Parents', '给家长的建议', 'Petua untuk Ibu Bapa')}</Text>
              </View>

              {tips.map((tip, index) => (
                <View key={`${tip}-${index}`} style={styles.tipRow}>
                  <View style={styles.tipNumber}>
                    <Text style={styles.tipNumberText}>{index + 1}</Text>
                  </View>

                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>

            <Pressable
              style={styles.checkAnotherButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.checkAnotherText}>{getText('Check Another Food', '检查其他食物', 'Semak Makanan Lain')}</Text>
            </Pressable>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                {getText(
                  'ℹ️ Nutrition values are approximate. Actual values may vary by preparation and serving size.',
                  'ℹ️ 营养数值仅供参考。实际数值可能因做法和份量而不同。',
                  'ℹ️ Nilai nutrisi adalah anggaran. Nilai sebenar mungkin berbeza mengikut penyediaan dan saiz hidangan.'
                )}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 120,
    gap: 18,
  },

  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  loadingText: {
    marginTop: 12,
    color: colors.muted,
    fontWeight: '700',
  },

  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 26,
    padding: 24,
    alignItems: 'center',
  },

  errorTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '900',
    color: '#991B1B',
  },

  errorText: {
    marginTop: 8,
    color: '#7F1D1D',
    textAlign: 'center',
    lineHeight: 20,
  },

  retryButton: {
    marginTop: 16,
    backgroundColor: '#EF4444',
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },

  retryText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  foodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  foodImage: {
    width: '100%',
    height: 190,
    backgroundColor: '#E5E7EB',
  },

  foodImageFallback: {
    width: '100%',
    height: 190,
    backgroundColor: '#EAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  foodEmoji: {
    fontSize: 64,
  },

  foodNameWrap: {
    padding: 22,
  },

  foodName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2F3A3A',
    textAlign: 'center',
  },

  statusCard: {
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  statusTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },

  statusTitleWrap: {
    flex: 1,
  },

  statusTitle: {
    fontSize: 18,
    fontWeight: '900',
  },

  scoreText: {
    marginTop: 3,
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
  },

  statusEmoji: {
    fontSize: 24,
  },

  statusDescription: {
    color: '#2F3A3A',
    fontSize: 14,
    lineHeight: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2F3A3A',
    marginBottom: 14,
    paddingHorizontal: 4,
  },

  nutritionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },

  nutritionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  nutritionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  nutritionLabel: {
    fontSize: 12,
    color: '#7A8A8A',
    marginBottom: 4,
    textAlign: 'center',
  },

  nutritionValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#2F3A3A',
    textAlign: 'center',
  },

  additionalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  additionalItem: {
    flex: 1,
  },

  additionalDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 14,
  },

  additionalLabel: {
    fontSize: 12,
    color: '#7A8A8A',
    marginBottom: 5,
  },

  additionalValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#2F3A3A',
  },

  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  tipsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },

  tipsEmoji: {
    fontSize: 22,
  },

  tipsTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#2F3A3A',
  },

  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 12,
  },

  tipNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tipNumberText: {
    color: '#4CAF7A',
    fontSize: 12,
    fontWeight: '900',
  },

  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#2F3A3A',
    lineHeight: 20,
  },

  checkAnotherButton: {
    backgroundColor: '#4CAF7A',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#4CAF7A',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  checkAnotherText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },

  infoBox: {
    backgroundColor: '#EAF6FB',
    borderRadius: 16,
    padding: 14,
  },

  infoText: {
    color: '#7A8A8A',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});