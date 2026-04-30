import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useChildProfile } from './ChildProfileContext';
import { useLanguage } from './LanguageContext';
import { generateMealPlanByAi } from '../services/api';

type Ingredient = {
  ingredientId?: number;
  mealId?: string;
  ingredientOrder?: number;
  ingredientName?: string;
  measure?: string;
  normalizedName?: string;
  gramsEstimated?: number;
  foodNameEn?: string;
  foodNameCn?: string;
  foodNameMs?: string;
  foodGroup?: string;
  energyKcal?: number;
  proteinG?: number;
  carbohydrateG?: number;
  fatG?: number;
};

type MealRecipe = {
  id?: number;
  idMeal: string;
  strMeal: string;
  strMealAlternate?: string | null;
  strCategory?: string | null;
  strArea?: string | null;
  strInstructions?: string | null;
  strMealThumb?: string | null;
  strTags?: string | null;
  strYoutube?: string | null;
  strSource?: string | null;
  totalEnergyKcal?: number;
  totalProteinG?: number;
  totalCarbohydrateG?: number;
  totalFatG?: number;
  ingredients?: Ingredient[];
  [key: string]: any;
};

type MealSlotKey = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
type MealPlanForDay = Partial<Record<MealSlotKey, MealRecipe>>;
type ShoppingCategory = 'vegetables' | 'protein' | 'carbs' | 'others';

type ShoppingItem = {
  id: string;
  name: string;
  quantity: string;
  category: ShoppingCategory;
  source: string;
  mealId: string;
  checked: boolean;
};

type OpenAiMealPlanModalOptions = {
  startDate?: Date;
  defaultPrompt?: string;
  defaultDays?: number;
};

type AiMealPlanGenerationContextValue = {
  openAiMealPlanModal: (options?: OpenAiMealPlanModalOptions) => void;
  isGeneratingMealPlan: boolean;
  isMealPlanReady: boolean;
  lastGeneratedAt: number;
};

const AiMealPlanGenerationContext = createContext<AiMealPlanGenerationContextValue | null>(null);

const MEAL_PLANS_STORAGE_KEY = 'JOMHEALTHY_MEAL_PLANS_BY_OWNER_V1';
const SHOPPING_LIST_STORAGE_KEY = 'JOMHEALTHY_SHOPPING_LIST_BY_OWNER_V1';
const SLOT_ORDER: MealSlotKey[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const DEFAULT_TARGETS = {
  carbs: 155,
  protein: 32,
  fat: 28,
};

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, offset: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function safeNumber(value: any) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function isValidImageUrl(url?: string | null) {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (!lower.startsWith('https://')) return false;
  if (lower.includes('example.com')) return false;
  if (lower.includes('placeholder')) return false;
  if (lower.includes('chicken-rice.jpg')) return false;
  return lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('.png') || lower.includes('.webp');
}

function isValidYoutubeUrl(url?: string | null) {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (!lower.startsWith('https://')) return false;
  if (lower.includes('example')) return false;
  return lower.includes('youtube.com/watch') || lower.includes('youtu.be/') || lower.includes('youtube.com/results?search_query=');
}

function normalizeLanguageCode(language?: string | null) {
  const text = String(language || 'en').toLowerCase();

  if (text === 'zh' || text === 'cn' || text.startsWith('zh-') || text.includes('chinese')) {
    return 'zh';
  }

  if (text === 'ms' || text === 'my' || text.startsWith('ms-') || text.includes('malay')) {
    return 'ms';
  }

  return 'en';
}

function translateMealName(name: string, language: string) {
  const lang = normalizeLanguageCode(language);
  const text = String(name || '').trim();

  if (!text || lang === 'en') return text;

  const replacements = lang === 'zh'
    ? [
        [/\bfried rice\b/gi, '炒饭'],
        [/\bchicken rice\b/gi, '鸡饭'],
        [/\bfried noodle(s)?\b/gi, '炒面'],
        [/\bnoodle(s)?\b/gi, '面'],
        [/\brice\b/gi, '米饭'],
        [/\bchicken\b/gi, '鸡肉'],
        [/\bbeef\b/gi, '牛肉'],
        [/\bfish\b/gi, '鱼'],
        [/\begg(s)?\b/gi, '鸡蛋'],
        [/\bvegetable(s)?\b/gi, '蔬菜'],
        [/\bsoup\b/gi, '汤'],
        [/\bporridge\b/gi, '粥'],
        [/\bsalad\b/gi, '沙拉'],
        [/\bsandwich\b/gi, '三明治'],
        [/\bbread\b/gi, '面包'],
        [/\bpasta\b/gi, '意面'],
        [/\bcurry\b/gi, '咖喱'],
        [/\bgrilled\b/gi, '烤'],
        [/\bsteamed\b/gi, '蒸'],
        [/\bbaked\b/gi, '烘烤'],
        [/\bstir fried\b/gi, '炒'],
        [/\bhealthy\b/gi, '健康'],
      ]
    : [
        [/\bfried rice\b/gi, 'nasi goreng'],
        [/\bchicken rice\b/gi, 'nasi ayam'],
        [/\bfried noodle(s)?\b/gi, 'mi goreng'],
        [/\bnoodle(s)?\b/gi, 'mi'],
        [/\brice\b/gi, 'nasi'],
        [/\bchicken\b/gi, 'ayam'],
        [/\bbeef\b/gi, 'daging lembu'],
        [/\bfish\b/gi, 'ikan'],
        [/\begg(s)?\b/gi, 'telur'],
        [/\bvegetable(s)?\b/gi, 'sayur-sayuran'],
        [/\bsoup\b/gi, 'sup'],
        [/\bporridge\b/gi, 'bubur'],
        [/\bsalad\b/gi, 'salad'],
        [/\bsandwich\b/gi, 'sandwic'],
        [/\bbread\b/gi, 'roti'],
        [/\bpasta\b/gi, 'pasta'],
        [/\bcurry\b/gi, 'kari'],
        [/\bgrilled\b/gi, 'panggang'],
        [/\bsteamed\b/gi, 'kukus'],
        [/\bbaked\b/gi, 'bakar'],
        [/\bstir fried\b/gi, 'tumis'],
        [/\bhealthy\b/gi, 'sihat'],
      ];

  return replacements.reduce((current, [pattern, replacement]) => current.replace(pattern as RegExp, replacement as string), text).replace(/\s+/g, ' ').trim();
}

function buildMealLanguageInstruction(language: string) {
  const lang = normalizeLanguageCode(language);

  if (lang === 'zh') {
    return 'Return meal names, categories, ingredients and instructions in Simplified Chinese when possible, while keeping food identifiers accurate.';
  }

  if (lang === 'ms') {
    return 'Return meal names, categories, ingredients and instructions in Malay when possible, while keeping food identifiers accurate.';
  }

  return 'Return meal names, categories, ingredients and instructions in English.';
}

function normalizeAiMeal(meal: any): MealRecipe {
  const rawImageUrl = meal?.strMealThumb || meal?.imageUrl || '';
  const rawYoutubeUrl = meal?.strYoutube || meal?.youtubeUrl || '';
  const sourceName = meal?.strMeal || meal?.name || meal?.strMealEn || meal?.nameEn || 'AI Recommended Meal';
  const sourceCategory = meal?.strCategory || meal?.category || 'AI Meal';
  const sourceArea = meal?.strArea || meal?.area || 'Healthy';

  const mealNameZh = meal?.strMealCn || meal?.strMealCN || meal?.strMealZh || meal?.nameCn || meal?.nameCN || meal?.nameZh || translateMealName(sourceName, 'zh');
  const mealNameMs = meal?.strMealMs || meal?.nameMs || translateMealName(sourceName, 'ms');

  return {
    idMeal: meal?.idMeal || `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    strMeal: sourceName,
    strMealEn: meal?.strMealEn || meal?.strMeal || meal?.nameEn || meal?.name || sourceName,
    strMealCn: mealNameZh,
    strMealMs: mealNameMs,
    nameEn: meal?.nameEn || meal?.strMealEn || meal?.strMeal || meal?.name || sourceName,
    nameCn: meal?.nameCn || meal?.nameCN || meal?.nameZh || mealNameZh,
    nameMs: meal?.nameMs || mealNameMs,
    strCategory: sourceCategory,
    strCategoryEn: meal?.strCategoryEn || meal?.strCategory || meal?.categoryEn || meal?.category || sourceCategory,
    strCategoryCn: meal?.strCategoryCn || meal?.strCategoryCN || meal?.strCategoryZh || meal?.categoryCn || meal?.categoryCN || meal?.categoryZh || translateMealName(sourceCategory, 'zh'),
    strCategoryMs: meal?.strCategoryMs || meal?.categoryMs || translateMealName(sourceCategory, 'ms'),
    strArea: sourceArea,
    strAreaEn: meal?.strAreaEn || meal?.strArea || meal?.areaEn || meal?.area || sourceArea,
    strAreaCn: meal?.strAreaCn || meal?.strAreaCN || meal?.strAreaZh || meal?.areaCn || meal?.areaCN || meal?.areaZh || translateMealName(sourceArea, 'zh'),
    strAreaMs: meal?.strAreaMs || meal?.areaMs || translateMealName(sourceArea, 'ms'),
    strInstructions: meal?.strInstructions || meal?.instructions || '',
    strMealThumb: isValidImageUrl(rawImageUrl) ? rawImageUrl : null,
    strYoutube: isValidYoutubeUrl(rawYoutubeUrl) ? rawYoutubeUrl : null,
    totalEnergyKcal: safeNumber(meal?.totalEnergyKcal || meal?.calories),
    totalProteinG: safeNumber(meal?.totalProteinG || meal?.protein),
    totalCarbohydrateG: safeNumber(meal?.totalCarbohydrateG || meal?.carbs || meal?.carbohydrate),
    totalFatG: safeNumber(meal?.totalFatG || meal?.fat),
    ingredients: Array.isArray(meal?.ingredients)
      ? meal.ingredients.map((item: any, index: number) => ({
          ingredientId: item.ingredientId || index + 1,
          ingredientOrder: item.ingredientOrder || index + 1,
          ingredientName: item.ingredientName || item.name || item.foodNameEn || 'Ingredient',
          measure: item.measure || item.quantity || '',
          normalizedName: item.normalizedName || item.name || item.ingredientName || '',
          gramsEstimated: safeNumber(item.gramsEstimated || item.grams),
          foodNameEn: item.foodNameEn || item.name || item.ingredientName || '',
          foodNameCn: item.foodNameCn || '',
          foodNameMs: item.foodNameMs || '',
          foodGroup: item.foodGroup || 'others',
          energyKcal: safeNumber(item.energyKcal),
          proteinG: safeNumber(item.proteinG),
          carbohydrateG: safeNumber(item.carbohydrateG),
          fatG: safeNumber(item.fatG),
        }))
      : [],
  };
}

function normalizeIngredientName(item: any) {
  return String(item.foodNameEn || item.ingredientName || item.normalizedName || 'Ingredient').trim();
}

function normalizeIngredientQuantity(item: any) {
  if (item.measure) return String(item.measure);
  if (item.gramsEstimated !== undefined && item.gramsEstimated !== null) return `${item.gramsEstimated}g`;
  return '';
}

function classifyIngredientCategory(item: any): ShoppingCategory {
  const name = String(item.foodNameEn || item.ingredientName || item.normalizedName || '').toLowerCase();
  const group = String(item.foodGroup || '').toLowerCase();

  if (
    group.includes('vegetable') ||
    name.includes('vegetable') ||
    name.includes('spinach') ||
    name.includes('lettuce') ||
    name.includes('cucumber') ||
    name.includes('tomato') ||
    name.includes('onion') ||
    name.includes('carrot') ||
    name.includes('broccoli') ||
    name.includes('cabbage')
  ) {
    return 'vegetables';
  }

  if (
    group.includes('meat') ||
    group.includes('fish') ||
    group.includes('seafood') ||
    group.includes('egg') ||
    name.includes('egg') ||
    name.includes('chicken') ||
    name.includes('beef') ||
    name.includes('fish') ||
    name.includes('tofu') ||
    name.includes('lentil') ||
    name.includes('bean') ||
    name.includes('prawn') ||
    name.includes('shrimp')
  ) {
    return 'protein';
  }

  if (
    group.includes('cereal') ||
    group.includes('grain') ||
    group.includes('fruit') ||
    name.includes('rice') ||
    name.includes('bread') ||
    name.includes('pasta') ||
    name.includes('noodle') ||
    name.includes('flour') ||
    name.includes('potato') ||
    name.includes('banana') ||
    name.includes('oat')
  ) {
    return 'carbs';
  }

  return 'others';
}

async function generateShoppingListByOwner(allMealPlans: Record<string, Record<string, MealPlanForDay>>) {
  try {
    const oldRaw = await AsyncStorage.getItem(SHOPPING_LIST_STORAGE_KEY);
    const oldByOwner: Record<string, ShoppingItem[]> = oldRaw ? JSON.parse(oldRaw) : {};
    const nextByOwner: Record<string, ShoppingItem[]> = {};

    Object.entries(allMealPlans).forEach(([ownerKey, mealPlans]) => {
      const oldItems = oldByOwner[ownerKey] || [];
      const checkedMap = new Map<string, boolean>();
      oldItems.forEach((item) => checkedMap.set(item.id, item.checked));

      const mergedMap = new Map<string, ShoppingItem>();

      Object.entries(mealPlans).forEach(([dateKey, dayPlan]) => {
        SLOT_ORDER.forEach((slot) => {
          const meal = dayPlan?.[slot];
          if (!meal || !Array.isArray(meal.ingredients)) return;

          meal.ingredients.forEach((ingredient: any) => {
            const name = normalizeIngredientName(ingredient);
            const quantity = normalizeIngredientQuantity(ingredient);
            const category = classifyIngredientCategory(ingredient);
            const id = `${name.toLowerCase()}-${category}`.replace(/\s+/g, '-');
            const existing = mergedMap.get(id);

            if (existing) {
              existing.quantity = [existing.quantity, quantity].filter(Boolean).join(' + ');
              if (!existing.source.includes(meal.strMeal)) {
                existing.source += `, ${dateKey} · ${slot}: ${meal.strMeal}`;
              }
              return;
            }

            mergedMap.set(id, {
              id,
              name,
              quantity,
              category,
              source: `${dateKey} · ${slot}: ${meal.strMeal}`,
              mealId: meal.idMeal,
              checked: checkedMap.get(id) || false,
            });
          });
        });
      });

      nextByOwner[ownerKey] = Array.from(mergedMap.values());
    });

    await AsyncStorage.setItem(SHOPPING_LIST_STORAGE_KEY, JSON.stringify(nextByOwner));
  } catch (error) {
    console.log('Generate shopping list failed:', error);
  }
}

export function AiMealPlanGenerationProvider({
  children,
  onViewMeal,
  currentRouteName,
}: {
  children: ReactNode;
  onViewMeal?: () => void;
  currentRouteName?: string;
}) {
  const { activeChild, getOwnerKey, nutritionNeeds } = useChildProfile();
  const { language } = useLanguage();

  const [showModal, setShowModal] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [days, setDays] = useState(1);
  const [startDate, setStartDate] = useState(new Date());
  const [generating, setGenerating] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [lastGeneratedAt, setLastGeneratedAt] = useState(0);

  const openAiMealPlanModal = (options?: OpenAiMealPlanModalOptions) => {
    setPrompt(options?.defaultPrompt || '');
    setDays(options?.defaultDays || 1);
    setStartDate(options?.startDate || new Date());
    setError('');
    setShowModal(true);
  };

  const generateMealPlan = async () => {
    if (generating) return;

    setShowModal(false);
    setGenerating(true);
    setReady(false);
    setError('');

    const ownerKey = getOwnerKey ? getOwnerKey() : activeChild?.id ? `child-${activeChild.id}` : 'guest';
    const targets = {
      carbs: nutritionNeeds?.carbs || DEFAULT_TARGETS.carbs,
      protein: nutritionNeeds?.protein || DEFAULT_TARGETS.protein,
      fat: nutritionNeeds?.fat || DEFAULT_TARGETS.fat,
    };

    try {
      const raw = await AsyncStorage.getItem(MEAL_PLANS_STORAGE_KEY);
      const allMealPlans: Record<string, Record<string, MealPlanForDay>> = raw ? JSON.parse(raw) : {};
      const ownerPlans = allMealPlans[ownerKey] || {};

      for (let i = 0; i < days; i += 1) {
        const targetDate = addDays(startDate, i);
        const dateKey = formatDateKey(targetDate);

        const result = await generateMealPlanByAi({
          childName: activeChild?.nickname || 'Guest',
          age: activeChild?.age || 7,
          gender: activeChild?.gender || 'boy',
          heightCm: activeChild?.height || 120,
          weightKg: activeChild?.weight || 20,
          allergies: activeChild?.allergies || [],
          restrictions: activeChild?.restrictions || {},
          targetCarbs: targets.carbs,
          targetProtein: targets.protein,
          targetFat: targets.fat,
          days: 1,
          language: normalizeLanguageCode(language),
          mealPreference: prompt.trim()
            ? `${prompt.trim()} for day ${i + 1}, make it varied from other days. ${buildMealLanguageInstruction(language)}`
            : `Recommend by child profile for day ${i + 1}, make it varied from other days. ${buildMealLanguageInstruction(language)}`,
        });

        if (!result.ok) {
          throw new Error(result.message || 'Failed to generate meal plan.');
        }

        const data = result.data?.data || result.data || {};
        const plan = data.plan || data.mealPlan || data;
        const nextDayPlan: MealPlanForDay = {};

        if (plan.breakfast) nextDayPlan.Breakfast = normalizeAiMeal(plan.breakfast);
        if (plan.lunch) nextDayPlan.Lunch = normalizeAiMeal(plan.lunch);
        if (plan.dinner) nextDayPlan.Dinner = normalizeAiMeal(plan.dinner);
        if (plan.snack) nextDayPlan.Snack = normalizeAiMeal(plan.snack);

        const hasAnyMeal = SLOT_ORDER.some((slot) => !!nextDayPlan[slot]);
        if (!hasAnyMeal) {
          throw new Error('AI did not return a valid meal plan.');
        }

        ownerPlans[dateKey] = nextDayPlan;
      }

      allMealPlans[ownerKey] = ownerPlans;
      await AsyncStorage.setItem(MEAL_PLANS_STORAGE_KEY, JSON.stringify(allMealPlans));
      await generateShoppingListByOwner(allMealPlans);

      setLastGeneratedAt(Date.now());

      if (currentRouteName === 'Meal') {
        setReady(false);
      } else {
        setReady(true);
      }
    } catch (err: any) {
      console.log('Global AI meal plan failed:', err);
      setError(err?.message || 'Network error. Please try again.');
    } finally {
      setGenerating(false);
    }
  };


  const hideFloating = () => {
    const wasReady = ready;
    setReady(false);
    setError('');

    if (wasReady) {
      onViewMeal?.();
    }
  };

  useEffect(() => {
    if (ready && currentRouteName === 'Meal') {
      setReady(false);
      setError('');
    }
  }, [ready, currentRouteName]);

  const value = useMemo(
    () => ({
      openAiMealPlanModal,
      isGeneratingMealPlan: generating,
      isMealPlanReady: ready,
      lastGeneratedAt,
    }),
    [generating, ready, lastGeneratedAt]
  );

  const showFloating = generating || ready || !!error;

  return (
    <AiMealPlanGenerationContext.Provider value={value}>
      <View style={styles.rootWrap}>
        {children}

        {showFloating && (
          <Pressable
            style={[
              styles.floatingButton,
              ready && styles.floatingButtonReady,
              !!error && styles.floatingButtonError,
            ]}
            onPress={() => {
              if (generating) return;
              hideFloating();
            }}
          >
            {generating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name={ready ? 'checkmark-circle' : 'warning'} size={18} color="#FFFFFF" />
            )}

            <Text style={styles.floatingButtonText} numberOfLines={1}>
              {generating
                ? 'Generating your meal plan...'
                : ready
                  ? 'AI meal plan is ready. Tap to view.'
                  : 'Generation failed. Tap to dismiss.'}
            </Text>
          </Pressable>
        )}

        <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <Ionicons name="sparkles" size={22} color="#FFFFFF" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>AI Meal Plan</Text>
                  <Text style={styles.modalSubtitle}>Generate meals and shopping list automatically</Text>
                </View>

                <Pressable style={styles.modalClose} onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={20} color="#64748B" />
                </Pressable>
              </View>

              <View style={styles.promptBox}>
                <Ionicons name="fast-food-outline" size={18} color={colors.primaryDark} />
                <TextInput
                  value={prompt}
                  onChangeText={setPrompt}
                  placeholder="What do you want to eat? e.g. chicken rice"
                  placeholderTextColor="#94A3B8"
                  style={styles.promptInput}
                  multiline
                />
                {prompt.length > 0 && (
                  <Pressable onPress={() => setPrompt('')}>
                    <Ionicons name="close-circle" size={20} color="#94A3B8" />
                  </Pressable>
                )}
              </View>

              <Text style={styles.modalHint}>Leave blank to recommend by child profile.</Text>

              <View style={styles.daySelectorRow}>
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <Pressable
                    key={day}
                    style={[styles.dayChip, days === day && styles.dayChipActive]}
                    onPress={() => setDays(day)}
                  >
                    <Text style={[styles.dayChipText, days === day && styles.dayChipTextActive]}>{day}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable style={styles.generateButton} onPress={generateMealPlan}>
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                <Text style={styles.generateButtonText}>Generate {days} Day{days > 1 ? 's' : ''} Meal Plan</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </AiMealPlanGenerationContext.Provider>
  );
}

export function useAiMealPlanGeneration() {
  const context = useContext(AiMealPlanGenerationContext);

  if (!context) {
    throw new Error('useAiMealPlanGeneration must be used inside AiMealPlanGenerationProvider');
  }

  return context;
}

const styles = StyleSheet.create({
  rootWrap: {
    flex: 1,
  },

  floatingButton: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 92,
    minHeight: 50,
    borderRadius: 22,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    zIndex: 999,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },

  floatingButtonReady: {
    backgroundColor: '#16A34A',
  },

  floatingButtonError: {
    backgroundColor: '#EF4444',
  },

  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    flexShrink: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: 20,
  },

  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
  },

  modalSubtitle: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },

  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  promptBox: {
    marginTop: 16,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: '#F4F6F4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  promptInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    maxHeight: 90,
  },

  modalHint: {
    marginTop: 8,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },

  daySelectorRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 8,
  },

  dayChip: {
    flex: 1,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dayChipActive: {
    backgroundColor: colors.primaryDark,
  },

  dayChipText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '900',
  },

  dayChipTextActive: {
    color: '#FFFFFF',
  },

  generateButton: {
    marginTop: 18,
    height: 50,
    borderRadius: 20,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});
