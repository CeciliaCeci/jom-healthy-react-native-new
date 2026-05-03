import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Header, Screen } from '../components/Common';
import { colors } from '../theme/colors';
import { searchMeals } from '../services/api';
import { useChildProfile } from '../context/ChildProfileContext';
import { useAiMealPlanGeneration } from '../context/AiMealPlanGenerationContext';
import { useLanguage } from '../context/LanguageContext';

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
  strMealEn?: string | null;
  strMealCn?: string | null;
  strMealCN?: string | null;
  strMealZh?: string | null;
  strMealMs?: string | null;
  nameEn?: string | null;
  nameCn?: string | null;
  nameCN?: string | null;
  nameZh?: string | null;
  nameMs?: string | null;
  strMealAlternate?: string | null;
  strCategory?: string | null;
  strCategoryEn?: string | null;
  strCategoryCn?: string | null;
  strCategoryCN?: string | null;
  strCategoryZh?: string | null;
  strCategoryMs?: string | null;
  categoryEn?: string | null;
  categoryCn?: string | null;
  categoryCN?: string | null;
  categoryZh?: string | null;
  categoryMs?: string | null;
  strArea?: string | null;
  strAreaEn?: string | null;
  strAreaCn?: string | null;
  strAreaCN?: string | null;
  strAreaZh?: string | null;
  strAreaMs?: string | null;
  areaEn?: string | null;
  areaCn?: string | null;
  areaCN?: string | null;
  areaZh?: string | null;
  areaMs?: string | null;
  strInstructions?: string | null;
  strInstructionsEn?: string | null;
  strInstructionsCn?: string | null;
  strInstructionsCN?: string | null;
  strInstructionsZh?: string | null;
  strInstructionsMs?: string | null;
  instructionsEn?: string | null;
  instructionsCn?: string | null;
  instructionsCN?: string | null;
  instructionsZh?: string | null;
  instructionsMs?: string | null;
  strMealThumb?: string | null;
  mealIconEmoji?: string | null;
  mealIconName?: string | null;
  mealIconPrompt?: string | null;
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
  nameEn?: string;
  nameCn?: string;
  nameMs?: string;
  quantity: string;
  category: ShoppingCategory;
  source: string;
  sourceEn?: string;
  sourceCn?: string;
  sourceMs?: string;
  mealId: string;
  checked: boolean;
};

type CalendarNutritionStatus = 'tooMuch' | 'good' | 'tooLittle' | 'none';

const MEAL_PLANS_STORAGE_KEY = 'JOMHEALTHY_MEAL_PLANS_BY_OWNER_V1';
const SHOPPING_LIST_STORAGE_KEY = 'JOMHEALTHY_SHOPPING_LIST_BY_OWNER_V1';
const SLOT_ORDER: MealSlotKey[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const DEFAULT_TARGETS = {
  carbs: 155,
  protein: 32,
  fat: 28,
};

const STATUS_COLORS: Record<CalendarNutritionStatus, string> = {
  tooMuch: '#FF6B6B',
  good: '#18C37E',
  tooLittle: '#FACC15',
  none: '#E5E7EB',
};

function safeNumber(value: any) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function round(value?: number) {
  return Math.round(safeNumber(value));
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = String(dateKey).split('-').map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

function addDays(date: Date, offset: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function getWeekStart(date: Date) {
  const day = date.getDay();
  const mondayBasedOffset = (day + 6) % 7;
  return addDays(date, -mondayBasedOffset);
}

function getScrollableDateStripDays(weekStartDate: Date) {
  return Array.from({ length: 21 }).map((_, index) => addDays(weekStartDate, index - 7));
}

function getCenteredSevenDays(selectedDate: Date) {
  return [-3, -2, -1, 0, 1, 2, 3].map((offset) => addDays(selectedDate, offset));
}

function getMonthDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const mondayBasedWeekDay = (firstDay.getDay() + 6) % 7;
  const startDate = addDays(firstDay, -mondayBasedWeekDay);
  return Array.from({ length: 42 }).map((_, index) => addDays(startDate, index));
}

function getMealPlanTotals(dayPlan: MealPlanForDay) {
  const meals = SLOT_ORDER.map((slot) => dayPlan[slot]).filter(Boolean) as MealRecipe[];
  return meals.reduce(
    (acc, meal) => {
      acc.carbs += safeNumber(meal.totalCarbohydrateG);
      acc.protein += safeNumber(meal.totalProteinG);
      acc.fat += safeNumber(meal.totalFatG);
      acc.calories += safeNumber(meal.totalEnergyKcal);
      acc.count += 1;
      return acc;
    },
    { carbs: 0, protein: 0, fat: 0, calories: 0, count: 0 }
  );
}

function getCalendarStatus(
  dayPlan: MealPlanForDay | undefined,
  targets: { carbs: number; protein: number; fat: number }
): { status: CalendarNutritionStatus; progress: number } {
  if (!dayPlan) return { status: 'none', progress: 0 };

  const totals = getMealPlanTotals(dayPlan);
  if (totals.count === 0) return { status: 'none', progress: 0 };

  const carbRatio = totals.carbs / Math.max(targets.carbs, 1);
  const proteinRatio = totals.protein / Math.max(targets.protein, 1);
  const fatRatio = totals.fat / Math.max(targets.fat, 1);
  const averageRatio = (carbRatio + proteinRatio + fatRatio) / 3;

  if (averageRatio > 1.15) return { status: 'tooMuch', progress: Math.min(averageRatio, 1) };
  if (averageRatio < 0.75) return { status: 'tooLittle', progress: Math.max(averageRatio, 0.18) };
  return { status: 'good', progress: Math.min(averageRatio, 1) };
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
  ) return 'vegetables';

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
  ) return 'protein';

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
  ) return 'carbs';

  return 'others';
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

function guessMealEmoji(name?: string | null, category?: string | null) {
  const text = `${name || ''} ${category || ''}`.toLowerCase();

  if (text.includes('nasi lemak')) return '🍛';
  if (text.includes('fried rice')) return '🍛';
  if (text.includes('rice') || text.includes('nasi') || text.includes('biryani') || text.includes('porridge') || text.includes('congee')) return '🍚';
  if (text.includes('noodle') || text.includes('mee') || text.includes('laksa') || text.includes('ramen') || text.includes('udon') || text.includes('pasta') || text.includes('spaghetti')) return '🍜';
  if (text.includes('soup') || text.includes('stew') || text.includes('broth')) return '🍲';
  if (text.includes('salad') || text.includes('vegetable') || text.includes('veggie')) return '🥗';
  if (text.includes('sandwich') || text.includes('burger') || text.includes('toast')) return '🥪';
  if (text.includes('bread') || text.includes('roti') || text.includes('bun')) return '🍞';
  if (text.includes('pizza')) return '🍕';
  if (text.includes('taco') || text.includes('wrap')) return '🌮';
  if (text.includes('chicken') || text.includes('ayam')) return '🍗';
  if (text.includes('beef') || text.includes('steak')) return '🥩';
  if (text.includes('fish') || text.includes('salmon') || text.includes('tuna')) return '🐟';
  if (text.includes('shrimp') || text.includes('prawn') || text.includes('seafood')) return '🦐';
  if (text.includes('egg') || text.includes('omelette') || text.includes('omelet')) return '🥚';
  if (text.includes('tofu') || text.includes('bean') || text.includes('lentil')) return '🫘';
  if (text.includes('curry')) return '🍛';
  if (text.includes('satay')) return '🍢';
  if (text.includes('sushi')) return '🍣';
  if (text.includes('dumpling')) return '🥟';
  if (text.includes('potato') || text.includes('fries')) return '🥔';
  if (text.includes('corn')) return '🌽';
  if (text.includes('carrot')) return '🥕';
  if (text.includes('broccoli')) return '🥦';
  if (text.includes('tomato')) return '🍅';
  if (text.includes('avocado')) return '🥑';
  if (text.includes('banana')) return '🍌';
  if (text.includes('apple')) return '🍎';
  if (text.includes('orange')) return '🍊';
  if (text.includes('mango')) return '🥭';
  if (text.includes('strawberry') || text.includes('berry')) return '🍓';
  if (text.includes('fruit')) return '🍎';
  if (text.includes('yogurt') || text.includes('oat') || text.includes('cereal') || text.includes('granola')) return '🥣';
  if (text.includes('milk') || text.includes('smoothie')) return '🥛';
  if (text.includes('juice')) return '🧃';
  if (text.includes('snack')) return '🍪';

  return '🍽️';
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

function cleanLocalizedValue(value: any) {
  if (value === undefined || value === null) return '';
  const text = String(value).trim();
  return text.length > 0 ? text : '';
}

function pickLocalizedValue(
  language: string,
  enValue?: any,
  cnValue?: any,
  msValue?: any,
  fallback?: any
) {
  const lang = normalizeLanguageCode(language);

  if (lang === 'zh') {
    return cleanLocalizedValue(cnValue) || cleanLocalizedValue(enValue) || cleanLocalizedValue(msValue) || cleanLocalizedValue(fallback);
  }

  if (lang === 'ms') {
    return cleanLocalizedValue(msValue) || cleanLocalizedValue(enValue) || cleanLocalizedValue(cnValue) || cleanLocalizedValue(fallback);
  }

  return cleanLocalizedValue(enValue) || cleanLocalizedValue(fallback) || cleanLocalizedValue(cnValue) || cleanLocalizedValue(msValue);
}

function translateMealName(name: string, language: string) {
  const lang = normalizeLanguageCode(language);
  const text = String(name || '').trim();

  if (!text || lang === 'en') return text;

  const replacements = lang === 'zh'
    ? [
        [/\bfried rice\b/gi, '炒饭'], [/\bchicken rice\b/gi, '鸡饭'], [/\bfried noodle(s)?\b/gi, '炒面'], [/\bnoodle(s)?\b/gi, '面'],
        [/\brice\b/gi, '米饭'], [/\bchicken\b/gi, '鸡肉'], [/\bbeef\b/gi, '牛肉'], [/\bfish\b/gi, '鱼'], [/\begg(s)?\b/gi, '鸡蛋'],
        [/\bvegetable(s)?\b/gi, '蔬菜'], [/\bsoup\b/gi, '汤'], [/\bporridge\b/gi, '粥'], [/\bsalad\b/gi, '沙拉'], [/\bsandwich\b/gi, '三明治'],
        [/\bbread\b/gi, '面包'], [/\bpasta\b/gi, '意面'], [/\bcurry\b/gi, '咖喱'], [/\bgrilled\b/gi, '烤'], [/\bsteamed\b/gi, '蒸'], [/\bbaked\b/gi, '烘烤'], [/\bstir fried\b/gi, '炒'], [/\bhealthy\b/gi, '健康'],
      ]
    : [
        [/\bfried rice\b/gi, 'nasi goreng'], [/\bchicken rice\b/gi, 'nasi ayam'], [/\bfried noodle(s)?\b/gi, 'mi goreng'], [/\bnoodle(s)?\b/gi, 'mi'],
        [/\brice\b/gi, 'nasi'], [/\bchicken\b/gi, 'ayam'], [/\bbeef\b/gi, 'daging lembu'], [/\bfish\b/gi, 'ikan'], [/\begg(s)?\b/gi, 'telur'],
        [/\bvegetable(s)?\b/gi, 'sayur-sayuran'], [/\bsoup\b/gi, 'sup'], [/\bporridge\b/gi, 'bubur'], [/\bsalad\b/gi, 'salad'], [/\bsandwich\b/gi, 'sandwic'],
        [/\bbread\b/gi, 'roti'], [/\bpasta\b/gi, 'pasta'], [/\bcurry\b/gi, 'kari'], [/\bgrilled\b/gi, 'panggang'], [/\bsteamed\b/gi, 'kukus'], [/\bbaked\b/gi, 'bakar'], [/\bstir fried\b/gi, 'tumis'], [/\bhealthy\b/gi, 'sihat'],
      ];

  return replacements.reduce((current, [pattern, replacement]) => current.replace(pattern as RegExp, replacement as string), text).replace(/\s+/g, ' ').trim();
}

function getMealName(meal: any, language: string) {
  const localized = pickLocalizedValue(
    language,
    meal?.strMealEn || meal?.nameEn || meal?.strMeal || meal?.name,
    meal?.strMealCn || meal?.strMealCN || meal?.strMealZh || meal?.nameCn || meal?.nameCN || meal?.nameZh,
    meal?.strMealMs || meal?.nameMs,
    meal?.strMeal || meal?.name || 'Meal'
  );

  if (normalizeLanguageCode(language) === 'zh' || normalizeLanguageCode(language) === 'ms') {
    if (localized === (meal?.strMealEn || meal?.nameEn || meal?.strMeal || meal?.name)) {
      return translateMealName(localized, language);
    }
  }

  return localized;
}

function getMealCategory(meal: any, language: string, fallback: string) {
  return pickLocalizedValue(
    language,
    meal?.strCategoryEn || meal?.categoryEn || meal?.strCategory || meal?.category,
    meal?.strCategoryCn || meal?.strCategoryCN || meal?.strCategoryZh || meal?.categoryCn || meal?.categoryCN || meal?.categoryZh,
    meal?.strCategoryMs || meal?.categoryMs,
    fallback
  );
}

function getMealArea(meal: any, language: string, fallback: string) {
  return pickLocalizedValue(
    language,
    meal?.strAreaEn || meal?.areaEn || meal?.strArea || meal?.area,
    meal?.strAreaCn || meal?.strAreaCN || meal?.strAreaZh || meal?.areaCn || meal?.areaCN || meal?.areaZh,
    meal?.strAreaMs || meal?.areaMs,
    fallback
  );
}

function getMealInstructions(meal: any, language: string) {
  return pickLocalizedValue(
    language,
    meal?.strInstructionsEn || meal?.instructionsEn || meal?.strInstructions || meal?.instructions,
    meal?.strInstructionsCn || meal?.strInstructionsCN || meal?.strInstructionsZh || meal?.instructionsCn || meal?.instructionsCN || meal?.instructionsZh,
    meal?.strInstructionsMs || meal?.instructionsMs,
    meal?.strInstructions || meal?.instructions || ''
  );
}

function getIngredientNameByLanguage(item: any, language: string) {
  return pickLocalizedValue(
    language,
    item?.foodNameEn || item?.nameEn || item?.ingredientName || item?.name,
    item?.foodNameCn || item?.foodNameCN || item?.foodNameZh || item?.nameCn || item?.nameCN || item?.nameZh,
    item?.foodNameMs || item?.nameMs,
    normalizeIngredientName(item)
  );
}

function normalizeAiMeal(meal: any): MealRecipe {
  const rawImageUrl = meal?.strMealThumb || meal?.imageUrl || '';
  const rawYoutubeUrl = meal?.strYoutube || meal?.youtubeUrl || '';

  return {
    idMeal: meal?.idMeal || `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    strMeal: meal?.strMeal || meal?.strMealEn || meal?.name || 'AI Recommended Meal',
    strMealEn: meal?.strMealEn || meal?.strMeal || meal?.nameEn || meal?.name || 'AI Recommended Meal',
    strMealCn: meal?.strMealCn || meal?.strMealCN || meal?.strMealZh || meal?.nameCn || meal?.nameCN || meal?.nameZh || '',
    strMealMs: meal?.strMealMs || meal?.nameMs || '',
    nameEn: meal?.nameEn || meal?.strMealEn || meal?.strMeal || meal?.name || '',
    nameCn: meal?.nameCn || meal?.nameCN || meal?.nameZh || meal?.strMealCn || meal?.strMealCN || meal?.strMealZh || '',
    nameMs: meal?.nameMs || meal?.strMealMs || '',
    strCategory: meal?.strCategory || meal?.strCategoryEn || meal?.category || 'AI Meal',
    strCategoryEn: meal?.strCategoryEn || meal?.strCategory || meal?.categoryEn || meal?.category || 'AI Meal',
    strCategoryCn: meal?.strCategoryCn || meal?.strCategoryCN || meal?.strCategoryZh || meal?.categoryCn || meal?.categoryCN || meal?.categoryZh || '',
    strCategoryMs: meal?.strCategoryMs || meal?.categoryMs || '',
    categoryEn: meal?.categoryEn || meal?.strCategoryEn || meal?.strCategory || meal?.category || '',
    categoryCn: meal?.categoryCn || meal?.categoryCN || meal?.categoryZh || meal?.strCategoryCn || meal?.strCategoryCN || meal?.strCategoryZh || '',
    categoryMs: meal?.categoryMs || meal?.strCategoryMs || '',
    strArea: meal?.strArea || meal?.strAreaEn || meal?.area || 'Healthy',
    strAreaEn: meal?.strAreaEn || meal?.strArea || meal?.areaEn || meal?.area || 'Healthy',
    strAreaCn: meal?.strAreaCn || meal?.strAreaCN || meal?.strAreaZh || meal?.areaCn || meal?.areaCN || meal?.areaZh || '',
    strAreaMs: meal?.strAreaMs || meal?.areaMs || '',
    areaEn: meal?.areaEn || meal?.strAreaEn || meal?.strArea || meal?.area || '',
    areaCn: meal?.areaCn || meal?.areaCN || meal?.areaZh || meal?.strAreaCn || meal?.strAreaCN || meal?.strAreaZh || '',
    areaMs: meal?.areaMs || meal?.strAreaMs || '',
    strInstructions: meal?.strInstructions || meal?.strInstructionsEn || meal?.instructions || '',
    strInstructionsEn: meal?.strInstructionsEn || meal?.strInstructions || meal?.instructionsEn || meal?.instructions || '',
    strInstructionsCn: meal?.strInstructionsCn || meal?.strInstructionsCN || meal?.strInstructionsZh || meal?.instructionsCn || meal?.instructionsCN || meal?.instructionsZh || '',
    strInstructionsMs: meal?.strInstructionsMs || meal?.instructionsMs || '',
    instructionsEn: meal?.instructionsEn || meal?.strInstructionsEn || meal?.strInstructions || meal?.instructions || '',
    instructionsCn: meal?.instructionsCn || meal?.instructionsCN || meal?.instructionsZh || meal?.strInstructionsCn || meal?.strInstructionsCN || meal?.strInstructionsZh || '',
    instructionsMs: meal?.instructionsMs || meal?.strInstructionsMs || '',
    strMealThumb: isValidImageUrl(rawImageUrl) ? rawImageUrl : null,
    mealIconEmoji: meal?.mealIconEmoji || guessMealEmoji(meal?.strMeal || meal?.name, meal?.strCategory || meal?.category),
    mealIconName: meal?.mealIconName || null,
    mealIconPrompt: meal?.mealIconPrompt || null,
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
          foodNameEn: item.foodNameEn || item.nameEn || item.name || item.ingredientName || '',
          foodNameCn: item.foodNameCn || item.foodNameCN || item.foodNameZh || item.nameCn || item.nameCN || item.nameZh || '',
          foodNameMs: item.foodNameMs || item.nameMs || '',
          foodGroup: item.foodGroup || 'others',
          energyKcal: safeNumber(item.energyKcal),
          proteinG: safeNumber(item.proteinG),
          carbohydrateG: safeNumber(item.carbohydrateG),
          fatG: safeNumber(item.fatG),
        }))
      : [],
  };
}


function normalizeDayPlan(dayPlan: any): MealPlanForDay {
  const normalized: MealPlanForDay = {};

  if (!dayPlan || typeof dayPlan !== 'object') {
    return normalized;
  }

  if (dayPlan.Breakfast || dayPlan.breakfast) {
    normalized.Breakfast = normalizeAiMeal(dayPlan.Breakfast || dayPlan.breakfast);
  }

  if (dayPlan.Lunch || dayPlan.lunch) {
    normalized.Lunch = normalizeAiMeal(dayPlan.Lunch || dayPlan.lunch);
  }

  if (dayPlan.Dinner || dayPlan.dinner) {
    normalized.Dinner = normalizeAiMeal(dayPlan.Dinner || dayPlan.dinner);
  }

  if (dayPlan.Snack || dayPlan.snack) {
    normalized.Snack = normalizeAiMeal(dayPlan.Snack || dayPlan.snack);
  }

  return normalized;
}

function cloneMealPlanForCopy(dayPlan: MealPlanForDay): MealPlanForDay {
  try {
    return normalizeDayPlan(JSON.parse(JSON.stringify(dayPlan || {})));
  } catch {
    return normalizeDayPlan(dayPlan || {});
  }
}

function normalizeMealPlansByOwner(raw: any): Record<string, Record<string, MealPlanForDay>> {
  const normalized: Record<string, Record<string, MealPlanForDay>> = {};

  if (!raw || typeof raw !== 'object') {
    return normalized;
  }

  Object.entries(raw).forEach(([ownerKey, ownerPlans]) => {
    if (!ownerPlans || typeof ownerPlans !== 'object') {
      return;
    }

    normalized[ownerKey] = {};

    Object.entries(ownerPlans as Record<string, any>).forEach(([dateKey, dayPlan]) => {
      normalized[ownerKey][dateKey] = normalizeDayPlan(dayPlan);
    });
  });

  return normalized;
}

async function generateShoppingListByOwner(
  allMealPlans: Record<string, Record<string, MealPlanForDay>>
) {
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
            const nameEn = getIngredientNameByLanguage(ingredient, 'en');
            const nameCn = getIngredientNameByLanguage(ingredient, 'zh');
            const nameMs = getIngredientNameByLanguage(ingredient, 'ms');
            const name = nameEn;
            const quantity = normalizeIngredientQuantity(ingredient);
            const category = classifyIngredientCategory(ingredient);
            const id = `${name.toLowerCase()}-${category}`.replace(/\s+/g, '-');
            const existing = mergedMap.get(id);
            const mealNameEn = getMealName(meal, 'en');
            const mealNameCn = getMealName(meal, 'zh');
            const mealNameMs = getMealName(meal, 'ms');
            const sourceEn = `${dateKey} · ${slot}: ${mealNameEn}`;
            const sourceCn = `${dateKey} · ${slot}: ${mealNameCn}`;
            const sourceMs = `${dateKey} · ${slot}: ${mealNameMs}`;

            if (existing) {
              existing.quantity = [existing.quantity, quantity].filter(Boolean).join(' + ');
              if (!existing.source.includes(mealNameEn)) {
                existing.source += `, ${sourceEn}`;
                existing.sourceEn = [existing.sourceEn, sourceEn].filter(Boolean).join(', ');
                existing.sourceCn = [existing.sourceCn, sourceCn].filter(Boolean).join(', ');
                existing.sourceMs = [existing.sourceMs, sourceMs].filter(Boolean).join(', ');
              }
              return;
            }

            mergedMap.set(id, {
              id,
              name,
              nameEn,
              nameCn,
              nameMs,
              quantity,
              category,
              source: sourceEn,
              sourceEn,
              sourceCn,
              sourceMs,
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

function NutritionRing({ value, target, color, label }: { value: number; target: number; color: string; label: string }) {
  const size = 86;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeTarget = target > 0 ? target : 1;
  const progress = Math.min(value / safeTarget, 1);
  const dashOffset = circumference * (1 - progress);

  return (
    <View style={styles.ringBlock}>
      <View style={styles.ringWrap}>
        <Svg width={size} height={size}>
          <Circle stroke="#E5E7EB" fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
          <Circle
            stroke={color}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={styles.ringValueText}>{round(value)}g</Text>
        </View>
      </View>
      <Text style={styles.ringLabel}>{label}</Text>
      <Text style={styles.ringTarget}>/{round(target)}g</Text>
    </View>
  );
}

function CalendarDateCell({
  date,
  isCurrentMonth,
  isSelected,
  isToday,
  status,
  progress,
  isCopySource,
  isCopyTarget,
  onPress,
  onLongPress,
  onPressOut,
  setCellRef,
  onLayout,
}: {
  date: Date;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  status: CalendarNutritionStatus;
  progress: number;
  isCopySource?: boolean;
  isCopyTarget?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onPressOut?: (event: any) => void;
  setCellRef?: (node: any) => void;
  onLayout?: () => void;
}) {
  const hasStatus = status !== 'none';
  const statusColor = STATUS_COLORS[status];
  const size = 38;
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(progress, 1));

  return (
    <Pressable
      ref={setCellRef as any}
      style={styles.calendarCell}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressOut={onPressOut}
      onLayout={onLayout}
      delayLongPress={420}
    >
      <View style={[styles.calendarDateWrap, isCopySource && styles.calendarDateWrapCopySource, isCopyTarget && styles.calendarDateWrapCopyTarget]}>
        {hasStatus && !isSelected ? (
          <>
            <Svg width={size} height={size} style={styles.calendarRingSvg}>
              <Circle stroke="#F1F5F9" fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
              <Circle
                stroke={statusColor}
                fill="none"
                cx={size / 2}
                cy={size / 2}
                r={radius}
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${size / 2}, ${size / 2}`}
              />
            </Svg>
            <View style={styles.calendarRingNumber}>
              <Text style={[styles.calendarDateText, !isCurrentMonth && styles.calendarDateMuted, isToday && styles.calendarDateTodayText]}>
                {date.getDate()}
              </Text>
            </View>
          </>
        ) : (
          <View style={[styles.calendarDateCircle, isToday && styles.calendarDateToday, isSelected && styles.calendarDateSelected]}>
            <Text
              style={[
                styles.calendarDateText,
                !isCurrentMonth && styles.calendarDateMuted,
                isToday && styles.calendarDateTodayText,
                isSelected && styles.calendarDateTextSelected,
              ]}
            >
              {date.getDate()}
            </Text>
          </View>
        )}
        {hasStatus && <View style={[styles.calendarNutritionDot, { backgroundColor: statusColor }]} />}
      </View>
    </Pressable>
  );
}

export default function MealScreen() {
  const navigation = useNavigation<any>();
  const { language } = useLanguage();
  const { openAiMealPlanModal, isGeneratingMealPlan, lastGeneratedAt } = useAiMealPlanGeneration();
  const { activeChild, getOwnerKey, nutritionNeeds } = useChildProfile();
  const ownerKey = getOwnerKey();
  const today = useMemo(() => new Date(), []);
  const locale = normalizeLanguageCode(language) === 'zh' ? 'zh-CN' : normalizeLanguageCode(language) === 'ms' ? 'ms-MY' : 'en-US';

  const getText = (en: string, zh: string, ms: string) => {
    const lang = normalizeLanguageCode(language);
    if (lang === 'zh') return zh;
    if (lang === 'ms') return ms;
    return en;
  };

  const getSlotLabel = (slot: MealSlotKey) => {
    const labels: Record<MealSlotKey, string> = {
      Breakfast: getText('Breakfast', '早餐', 'Sarapan'),
      Lunch: getText('Lunch', '午餐', 'Makan Tengah Hari'),
      Dinner: getText('Dinner', '晚餐', 'Makan Malam'),
      Snack: getText('Snack', '加餐', 'Snek'),
    };
    return labels[slot];
  };

  const dateStripRef = useRef<ScrollView>(null);
  const dateCardRefs = useRef<Record<string, any>>({});
  const dateCardLayoutsRef = useRef<Record<string, { x: number; y: number; width: number; height: number }>>({});

  const [selectedDate, setSelectedDate] = useState(today);
  const [dateStripStart, setDateStripStart] = useState(getWeekStart(today));
  const [calendarMonth, setCalendarMonth] = useState(today);
  const [showCalendar, setShowCalendar] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [suggestions, setSuggestions] = useState<MealRecipe[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allMealPlans, setAllMealPlans] = useState<Record<string, Record<string, MealPlanForDay>>>({});
  const [mealPlansLoaded, setMealPlansLoaded] = useState(false);
  const [copySourceKey, setCopySourceKey] = useState<string | null>(null);
  const [copyTargetKeys, setCopyTargetKeys] = useState<string[]>([]);

  const selectedKey = formatDateKey(selectedDate);
  const todayKey = formatDateKey(today);
  const mealPlans = allMealPlans[ownerKey] || {};
  const selectedDayPlan: MealPlanForDay = mealPlans[selectedKey] || {};

  const currentTargets = {
    carbs: nutritionNeeds?.carbs || DEFAULT_TARGETS.carbs,
    protein: nutritionNeeds?.protein || DEFAULT_TARGETS.protein,
    fat: nutritionNeeds?.fat || DEFAULT_TARGETS.fat,
  };

  const dateTabs = useMemo(() => getScrollableDateStripDays(dateStripStart), [dateStripStart]);
  const calendarDays = useMemo(() => getMonthDays(calendarMonth), [calendarMonth]);
  const calendarWeeks = useMemo(() => {
    const weeks: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) weeks.push(calendarDays.slice(i, i + 7));
    return weeks;
  }, [calendarDays]);

  const totals = useMemo(() => getMealPlanTotals(selectedDayPlan), [selectedDayPlan]);

  const setDateCardRef = useCallback((dateKey: string, node: any) => {
    if (node) {
      dateCardRefs.current[dateKey] = node;
    } else {
      delete dateCardRefs.current[dateKey];
      delete dateCardLayoutsRef.current[dateKey];
    }
  }, []);

  const measureDateCard = useCallback((dateKey: string) => {
    requestAnimationFrame(() => {
      const node = dateCardRefs.current[dateKey];

      if (node && typeof node.measureInWindow === 'function') {
        node.measureInWindow((x: number, y: number, width: number, height: number) => {
          dateCardLayoutsRef.current[dateKey] = { x, y, width, height };
        });
      }
    });
  }, []);

  const findDateKeyFromScreenPoint = useCallback((pageX?: number, pageY?: number) => {
    if (pageX === undefined || pageY === undefined) return null;

    const entries = Object.entries(dateCardLayoutsRef.current);
    const matched = entries.find(([, rect]) => (
      pageX >= rect.x &&
      pageX <= rect.x + rect.width &&
      pageY >= rect.y &&
      pageY <= rect.y + rect.height
    ));

    return matched?.[0] || null;
  }, []);

  const formatCopyDateLabel = useCallback((dateKey: string) => {
    return parseDateKey(dateKey).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [locale]);

  const loadStoredMealPlans = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(MEAL_PLANS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setAllMealPlans(normalizeMealPlansByOwner(parsed));
      } else {
        setAllMealPlans({});
      }
    } catch (error) {
      console.log('Load meal plans failed:', error);
      setAllMealPlans({});
    } finally {
      setMealPlansLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStoredMealPlans();
    }, [loadStoredMealPlans])
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      const now = new Date();
      setSelectedDate(now);
      setDateStripStart(getWeekStart(now));
      setCalendarMonth(now);
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const { width } = Dimensions.get('window');
      const diffTime = selectedDate.getTime() - dateStripStart.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      const index = 7 + diffDays;
      const targetX = (index * 58) + 29 - (width / 2);
      dateStripRef.current?.scrollTo({ x: Math.max(0, targetX), animated: false });
    }, 80);

    return () => clearTimeout(timer);
  }, [dateStripStart]);

  useEffect(() => {
    if (lastGeneratedAt > 0) {
      loadStoredMealPlans();
    }
  }, [lastGeneratedAt, loadStoredMealPlans]);

  useEffect(() => {
    if (!mealPlansLoaded) return;
    const saveMealPlans = async () => {
      try {
        const normalizedPlans = normalizeMealPlansByOwner(allMealPlans);
        await AsyncStorage.setItem(MEAL_PLANS_STORAGE_KEY, JSON.stringify(normalizedPlans));
        await generateShoppingListByOwner(normalizedPlans);
      } catch (error) {
        console.log('Save meal plans failed:', error);
      }
    };
    saveMealPlans();
  }, [allMealPlans, mealPlansLoaded]);

  useEffect(() => {
    const query = keyword.trim();
    if (!query) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchError('');
      setSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError('');
      setShowSuggestions(true);
      const result = await searchMeals(query);
      if (!result.ok) {
        setSuggestions([]);
        setSearchError(result.message);
        setSearchLoading(false);
        return;
      }
      const list = Array.isArray(result.data?.data) ? result.data.data : [];
      setSuggestions(list.slice(0, 8));
      setSearchLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [keyword]);

  const updateCurrentOwnerMealPlans = (
    updater: (prev: Record<string, MealPlanForDay>) => Record<string, MealPlanForDay>
  ) => {
    setAllMealPlans((prev) => {
      const currentOwnerPlans = prev[ownerKey] || {};
      return { ...prev, [ownerKey]: updater(currentOwnerPlans) };
    });
  };

  const dayHasMealPlan = useCallback((dateKey: string) => {
    const dayPlan = mealPlans[dateKey];
    return SLOT_ORDER.some((slot) => !!dayPlan?.[slot]);
  }, [mealPlans]);

  const startCopyMealPlan = useCallback((date: Date) => {
    const sourceKey = formatDateKey(date);

    if (!dayHasMealPlan(sourceKey)) {
      Alert.alert(
        getText('No Meal Plan', '没有膳食计划', 'Tiada Pelan Makanan'),
        getText('This date does not have a meal plan to copy.', '这个日期没有可以复制的膳食计划。', 'Tarikh ini tiada pelan makanan untuk disalin.')
      );
      return;
    }

    setCopySourceKey(sourceKey);
    setCopyTargetKeys([]);
  }, [dayHasMealPlan]);

  const cancelCopyMealPlan = useCallback(() => {
    setCopySourceKey(null);
    setCopyTargetKeys([]);
  }, []);

  const toggleCopyTargetDate = useCallback((date: Date) => {
    if (!copySourceKey) return;

    const targetKey = formatDateKey(date);

    if (targetKey === copySourceKey) {
      return;
    }

    setCopyTargetKeys((prev) => (
      prev.includes(targetKey)
        ? prev.filter((item) => item !== targetKey)
        : [...prev, targetKey]
    ));
  }, [copySourceKey]);

  const addCopyTargetByKey = useCallback((targetKey: string) => {
    if (!copySourceKey || targetKey === copySourceKey) return;

    setCopyTargetKeys((prev) => (
      prev.includes(targetKey) ? prev : [...prev, targetKey]
    ));
  }, [copySourceKey]);

  const confirmCopyMealPlanToTargets = useCallback((targetKeys: string[] = copyTargetKeys, closeCalendarAfterCopy = false) => {
    if (!copySourceKey) return;

    const uniqueTargets = Array.from(new Set(targetKeys)).filter((key) => key && key !== copySourceKey);

    if (uniqueTargets.length === 0) {
      Alert.alert(
        getText('Choose target dates', '请选择目标日期', 'Pilih tarikh sasaran'),
        getText('Select one or more dates to copy this meal plan to.', '请选择一个或多个要复制到的日期。', 'Pilih satu atau lebih tarikh untuk menyalin pelan makanan ini.')
      );
      return;
    }

    const sourcePlan = mealPlans[copySourceKey];

    if (!SLOT_ORDER.some((slot) => !!sourcePlan?.[slot])) {
      Alert.alert(
        getText('No Meal Plan', '没有膳食计划', 'Tiada Pelan Makanan'),
        getText('The source date does not have a meal plan to copy.', '来源日期没有可以复制的膳食计划。', 'Tarikh sumber tiada pelan makanan untuk disalin.')
      );
      cancelCopyMealPlan();
      return;
    }

    const sourceLabel = formatCopyDateLabel(copySourceKey);
    const targetLabels = uniqueTargets.map(formatCopyDateLabel).join(', ');
    const overwriteCount = uniqueTargets.filter(dayHasMealPlan).length;

    Alert.alert(
      getText('Copy Meal Plan', '复制膳食计划', 'Salin Pelan Makanan'),
      overwriteCount > 0
        ? getText(
            `Copy meal plan from ${sourceLabel} to ${uniqueTargets.length} selected date(s): ${targetLabels}? ${overwriteCount} target date(s) already have a plan and will be replaced.`,
            `要将 ${sourceLabel} 的膳食计划复制到已选择的 ${uniqueTargets.length} 个日期吗：${targetLabels}？其中 ${overwriteCount} 个日期已有计划，会被替换。`,
            `Salin pelan makanan dari ${sourceLabel} ke ${uniqueTargets.length} tarikh dipilih: ${targetLabels}? ${overwriteCount} tarikh sasaran sudah ada pelan dan akan digantikan.`
          )
        : getText(
            `Copy meal plan from ${sourceLabel} to ${uniqueTargets.length} selected date(s): ${targetLabels}?`,
            `要将 ${sourceLabel} 的膳食计划复制到已选择的 ${uniqueTargets.length} 个日期吗：${targetLabels}？`,
            `Salin pelan makanan dari ${sourceLabel} ke ${uniqueTargets.length} tarikh dipilih: ${targetLabels}?`
          ),
      [
        {
          text: getText('Cancel', '取消', 'Batal'),
          style: 'cancel',
        },
        {
          text: getText('Confirm', '确认', 'Sahkan'),
          onPress: () => {
            updateCurrentOwnerMealPlans((prev) => {
              const source = prev[copySourceKey] || sourcePlan;
              const next = { ...prev };

              uniqueTargets.forEach((targetKey) => {
                next[targetKey] = cloneMealPlanForCopy(source);
              });

              return next;
            });

            const lastTargetDate = parseDateKey(uniqueTargets[uniqueTargets.length - 1]);
            setSelectedDate(lastTargetDate);
            setDateStripStart(getWeekStart(lastTargetDate));
            setCalendarMonth(lastTargetDate);

            if (closeCalendarAfterCopy) {
              setShowCalendar(false);
            }

            cancelCopyMealPlan();
          },
        },
      ]
    );
  }, [cancelCopyMealPlan, copySourceKey, copyTargetKeys, dayHasMealPlan, formatCopyDateLabel, mealPlans]);

  const handleDatePress = useCallback((date: Date, closeCalendarAfterCopy = false) => {
    if (copySourceKey) {
      toggleCopyTargetDate(date);
      return;
    }

    if (closeCalendarAfterCopy) {
      setSelectedDate(date);
      setDateStripStart(getWeekStart(date));
      setCalendarMonth(date);
      setShowCalendar(false);
      return;
    }

    setSelectedDate(date);
  }, [copySourceKey, toggleCopyTargetDate]);

  const handleCopyPressOut = useCallback((sourceKey: string, event: any) => {
    if (copySourceKey !== sourceKey) return;

    const targetKey = findDateKeyFromScreenPoint(event?.nativeEvent?.pageX, event?.nativeEvent?.pageY);

    if (!targetKey || targetKey === sourceKey) return;

    addCopyTargetByKey(targetKey);
  }, [addCopyTargetByKey, copySourceKey, findDateKeyFromScreenPoint]);

  const addMealToPlan = (meal: MealRecipe) => {
    const normalizedMeal = normalizeAiMeal(meal);

    updateCurrentOwnerMealPlans((prev) => {
      const current = prev[selectedKey] || {};
      const existingMealIds = SLOT_ORDER.map((slot) => current[slot]?.idMeal).filter(Boolean);
      if (existingMealIds.includes(normalizedMeal.idMeal)) {
        Alert.alert(getText('Already Added', '已添加', 'Sudah Ditambah'), getText('This recipe is already in your meal plan.', '这个食谱已经在你的膳食计划里。', 'Resipi ini sudah ada dalam pelan makanan anda.'));
        return prev;
      }
      const emptySlot = SLOT_ORDER.find((slot) => !current[slot]);
      if (!emptySlot) {
        Alert.alert(getText('Meal Plan Full', '膳食计划已满', 'Pelan Makanan Penuh'), getText('You already have 4 meals for this day.', '这一天已经有 4 餐了。', 'Anda sudah mempunyai 4 hidangan untuk hari ini.'));
        return prev;
      }
      return { ...prev, [selectedKey]: { ...current, [emptySlot]: normalizedMeal } };
    });
    setKeyword('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchError('');
  };

  const deleteMealFromPlan = (slot: MealSlotKey) => {
    updateCurrentOwnerMealPlans((prev) => {
      const current = { ...(prev[selectedKey] || {}) };
      delete current[slot];
      return { ...prev, [selectedKey]: current };
    });
  };

  const replaceMealInSlot = (slot: MealSlotKey, meal: MealRecipe) => {
    const normalizedMeal = normalizeAiMeal(meal);
    updateCurrentOwnerMealPlans((prev) => ({ ...prev, [selectedKey]: { ...(prev[selectedKey] || {}), [slot]: normalizedMeal } }));
    setKeyword('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchError('');
  };

  const clearSelectedDayPlan = () => {
    const hasMeals = SLOT_ORDER.some((slot) => !!selectedDayPlan[slot]);

    if (!hasMeals) {
      Alert.alert(getText('No Meals', '没有餐食', 'Tiada Hidangan'), getText('There are no meals to clear for this date.', '这个日期没有可以清空的餐食。', 'Tiada hidangan untuk dikosongkan pada tarikh ini.'));
      return;
    }

    Alert.alert(getText('Clear Meal Plan', '清空膳食计划', 'Kosongkan Pelan Makanan'), getText('Remove all meals for the selected date?', '要删除所选日期的所有餐食吗？', 'Buang semua hidangan untuk tarikh yang dipilih?'), [
      { text: getText('Cancel', '取消', 'Batal'), style: 'cancel' },
      {
        text: getText('Clear All', '全部清空', 'Kosongkan Semua'),
        style: 'destructive',
        onPress: () => {
          updateCurrentOwnerMealPlans((prev) => ({ ...prev, [selectedKey]: {} }));
        },
      },
    ]);
  };

  const openRecipeDetail = (meal: MealRecipe) => navigation.navigate('RecipeDetail', { meal: normalizeAiMeal(meal) });

  const openYoutube = async (url?: string | null) => {
    if (!url) {
      Alert.alert(getText('No Tutorial', '没有教程', 'Tiada Tutorial'), getText('This recipe does not have a tutorial link.', '这个食谱没有教程链接。', 'Resipi ini tiada pautan tutorial.'));
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert(getText('Cannot Open Link', '无法打开链接', 'Tidak Dapat Buka Pautan'), getText('Unable to open the tutorial link.', '无法打开教程链接。', 'Tidak dapat membuka pautan tutorial.'));
    } catch (error) {
      console.log('Open tutorial failed:', error);
      Alert.alert(getText('Error', '错误', 'Ralat'), getText('Unable to open the tutorial link.', '无法打开教程链接。', 'Tidak dapat membuka pautan tutorial.'));
    }
  };

  const selectCalendarDate = (date: Date) => {
    setSelectedDate(date);
    setDateStripStart(getWeekStart(date));
    setCalendarMonth(date);
    setShowCalendar(false);
  };

  const goToday = () => {
    const nextToday = new Date();
    setSelectedDate(nextToday);
    setDateStripStart(getWeekStart(nextToday));
    setCalendarMonth(nextToday);
    setShowCalendar(false);
  };

  const renderSuggestion = (meal: MealRecipe) => (
    <View key={meal.idMeal} style={styles.suggestionItem}>
      <Pressable style={styles.suggestionMain} onPress={() => openRecipeDetail(meal)}>
        {meal.strMealThumb ? (
          <Image source={{ uri: meal.strMealThumb }} style={styles.suggestionImage} />
        ) : (
          <View style={styles.suggestionImageFallback}><Text style={styles.fallbackEmoji}>{meal.mealIconEmoji || guessMealEmoji(getMealName(meal, language), getMealCategory(meal, language, ''))}</Text></View>
        )}
        <View style={styles.suggestionContent}>
          <Text style={styles.suggestionTitle} numberOfLines={2}>{getMealName(meal, language)}</Text>
          <Text style={styles.suggestionMeta}>{getMealCategory(meal, language, getText('Recipe', '食谱', 'Resipi'))} · {getMealArea(meal, language, getText('Meal', '餐食', 'Hidangan'))}</Text>
          <Text style={styles.suggestionNutrition}>
            {round(meal.totalEnergyKcal)} kcal · {getText('Protein', '蛋白质', 'Protein')} {round(meal.totalProteinG)}g · {getText('Carbs', '碳水', 'Karbo')} {round(meal.totalCarbohydrateG)}g · {getText('Fat', '脂肪', 'Lemak')} {round(meal.totalFatG)}g
          </Text>
        </View>
      </Pressable>
      <View style={styles.suggestionActions}>
        <Pressable style={[styles.suggestionButton, styles.suggestionViewButton]} onPress={() => openRecipeDetail(meal)}>
          <Ionicons name="book-outline" size={15} color="#3BA76D" />
          <Text style={[styles.suggestionButtonText, { color: '#3BA76D' }]}>{getText('View', '查看', 'Lihat')}</Text>
        </Pressable>
        <Pressable style={[styles.suggestionButton, styles.suggestionWatchButton]} onPress={() => openYoutube(meal.strYoutube)}>
          <Ionicons name="logo-youtube" size={15} color="#FF3B30" />
          <Text style={[styles.suggestionButtonText, { color: '#FF3B30' }]}>{getText('Watch', '观看', 'Tonton')}</Text>
        </Pressable>
        <Pressable style={styles.suggestionAddButton} onPress={() => addMealToPlan(meal)}>
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.suggestionAddText}>{getText('Add', '添加', 'Tambah')}</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderMealCard = (slot: MealSlotKey, meal: MealRecipe) => (
    <View key={`${slot}-${meal.idMeal}`} style={styles.mealSection}>
      <View style={styles.mealSectionHeader}>
        <View>
          <Text style={styles.mealSectionTitle}>{getSlotLabel(slot)}</Text>
          <Text style={styles.mealSectionSub}>{getText('1 meal', '1 餐', '1 hidangan')}</Text>
        </View>
        <Pressable style={styles.smallIconButton} onPress={() => deleteMealFromPlan(slot)}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </Pressable>
      </View>

      <View style={styles.mealCard}>
        {meal.strMealThumb ? (
          <Image source={{ uri: meal.strMealThumb }} style={styles.mealImage} />
        ) : (
          <View style={styles.mealImageFallback}><Text style={styles.fallbackEmoji}>{meal.mealIconEmoji || guessMealEmoji(getMealName(meal, language), getMealCategory(meal, language, ''))}</Text></View>
        )}
        <View style={styles.mealContent}>
          <Text style={styles.mealTitle} numberOfLines={2}>{getMealName(meal, language)}</Text>
          <View style={styles.macroTagRow}>
            <View style={[styles.macroTag, styles.macroCarb]}><Text style={[styles.macroTagText, { color: '#F97316' }]}>{round(meal.totalCarbohydrateG)}g {getText('carbs', '碳水', 'karbo')}</Text></View>
            <View style={[styles.macroTag, styles.macroProtein]}><Text style={[styles.macroTagText, { color: '#2563EB' }]}>{round(meal.totalProteinG)}g {getText('protein', '蛋白质', 'protein')}</Text></View>
            <View style={[styles.macroTag, styles.macroFat]}><Text style={[styles.macroTagText, { color: '#16A34A' }]}>{round(meal.totalFatG)}g {getText('fat', '脂肪', 'lemak')}</Text></View>
          </View>
          <View style={styles.mealButtonRow}>
            <Pressable style={[styles.actionButton, styles.viewButton]} onPress={() => openRecipeDetail(meal)}>
              <Ionicons name="book-outline" size={16} color="#3BA76D" />
              <Text style={[styles.actionButtonText, { color: '#3BA76D' }]}>{getText('View Recipe', '查看食谱', 'Lihat Resipi')}</Text>
            </Pressable>
            <Pressable style={[styles.actionButton, styles.watchButton]} onPress={() => openYoutube(meal.strYoutube)}>
              <Ionicons name="logo-youtube" size={16} color="#FF3B30" />
              <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>{getText('Watch Tutorial', '观看教程', 'Tonton Tutorial')}</Text>
            </Pressable>
          </View>
          {suggestions.length > 0 && (
            <Pressable
              style={styles.replaceLink}
              onPress={() => {
                const candidate = suggestions.find((item) => item.idMeal !== meal.idMeal);
                if (candidate) replaceMealInSlot(slot, candidate);
                else Alert.alert(getText('No Alternative', '没有替代食谱', 'Tiada Alternatif'), getText('Search another recipe to replace this one.', '请搜索另一个食谱来替换。', 'Cari resipi lain untuk menggantikannya.'));
              }}
            >
              <Ionicons name="swap-horizontal" size={16} color={colors.primaryDark} />
              <Text style={styles.replaceLinkText}>{getText('Replace meal', '替换餐食', 'Ganti Hidangan')}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <Screen padded={false}>
      <Header title={getText('Meal Plan', '膳食计划', 'Pelan Makanan')} subtitle={activeChild ? `${activeChild.nickname}${getText("'s meal plan", '的膳食计划', ' punya pelan makanan')}` : getText('Guest meal plan', '访客膳食计划', 'Pelan makanan tetamu')} icon="restaurant" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={styles.searchOuterCard}>
          <View style={styles.searchInnerCard}>
            <Ionicons name="search" size={20} color="#63B987" />
            <TextInput
              value={keyword}
              onChangeText={(text) => { setKeyword(text); setShowSuggestions(true); }}
              placeholder={getText('Search recipes...', '搜索食谱...', 'Cari resipi...')}
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              returnKeyType="search"
            />
            {keyword.length > 0 && (
              <Pressable style={styles.searchClear} onPress={() => { setKeyword(''); setSuggestions([]); setSearchError(''); setShowSuggestions(false); }}>
                <Ionicons name="close" size={18} color="#94A3B8" />
              </Pressable>
            )}
          </View>

          {keyword.trim().length > 0 && showSuggestions && (
            <View style={styles.suggestionBox}>
              {searchLoading ? (
                <View style={styles.suggestionStatus}>
                  <ActivityIndicator size="small" color={colors.primaryDark} />
                  <Text style={styles.suggestionStatusText}>{getText('Searching recipes...', '正在搜索食谱...', 'Mencari resipi...')}</Text>
                </View>
              ) : searchError ? (
                <View style={styles.suggestionStatus}>
                  <Ionicons name="warning-outline" size={18} color="#B91C1C" />
                  <Text style={styles.suggestionErrorText}>{searchError}</Text>
                </View>
              ) : suggestions.length > 0 ? (
                suggestions.map(renderSuggestion)
              ) : (
                <View style={styles.suggestionStatus}><Text style={styles.suggestionStatusText}>{getText('No matching recipes found', '没有找到匹配的食谱', 'Tiada resipi sepadan ditemui')}</Text></View>
              )}
            </View>
          )}
        </View>

        <View style={styles.dateContainer}>
          <View style={styles.dateTopRow}>
            <View>
              <Text style={styles.dateTitle}>{selectedDate.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
              <Text style={styles.dateSubtitle}>{getText('Swipe left or right to choose dates', '左右滑动选择日期', 'Leret kiri atau kanan untuk pilih tarikh')}</Text>
            </View>
            <View style={styles.dateActionRow}>
              <Pressable style={styles.calendarButton} onPress={() => setShowCalendar(true)}>
                <Ionicons name="calendar-outline" size={17} color={colors.primaryDark} />
                <Text style={styles.calendarButtonText}>{getText('Calendar', '日历', 'Kalendar')}</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView
            ref={dateStripRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollableDateRow}
            decelerationRate="fast"
            snapToInterval={58}
            snapToAlignment="start"
          >
            {dateTabs.map((date) => {
              const key = formatDateKey(date);
              const isSelected = key === selectedKey;
              const isToday = key === todayKey;
              const statusInfo = getCalendarStatus(mealPlans[key], currentTargets);
              const hasPlanStatus = statusInfo.status !== 'none';
              const fillColor = hasPlanStatus ? STATUS_COLORS[statusInfo.status] : undefined;
              const isCopyTarget = copyTargetKeys.includes(key);
              const activeText = isSelected || hasPlanStatus || isCopyTarget;

              return (
                <Pressable
                  key={key}
                  ref={(node) => setDateCardRef(key, node)}
                  onLayout={() => measureDateCard(key)}
                  style={[
                    styles.dateCard,
                    hasPlanStatus && { backgroundColor: fillColor },
                    isSelected && !hasPlanStatus && styles.dateCardActive,
                    isSelected && hasPlanStatus && styles.dateCardSelectedWithPlan,
                    copySourceKey === key && styles.dateCardCopySource,
                    copyTargetKeys.includes(key) && styles.dateCardCopyTarget,
                  ]}
                  onPress={() => handleDatePress(date)}
                  onLongPress={() => startCopyMealPlan(date)}
                  onPressOut={(event) => handleCopyPressOut(key, event)}
                  delayLongPress={420}
                >
                  <Text style={[styles.dateDay, activeText && styles.dateTextActive]}>
                    {date.toLocaleDateString(locale, { weekday: 'short' })}
                  </Text>
                  <Text style={[styles.dateNumber, activeText && styles.dateTextActive]}>{date.getDate()}</Text>
                  {isToday && <Text style={[styles.dateToday, activeText && styles.dateTodayActive]}>{getText('Today', '今天', 'Hari Ini')}</Text>}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.dateLegendRow}>
            <View style={styles.dateLegendItem}><View style={[styles.dateLegendDot, { backgroundColor: STATUS_COLORS.tooMuch }]} /><Text style={styles.dateLegendText}>{getText('Too much', '吃多了', 'Terlalu Banyak')}</Text></View>
            <View style={styles.dateLegendItem}><View style={[styles.dateLegendDot, { backgroundColor: STATUS_COLORS.good }]} /><Text style={styles.dateLegendText}>{getText('Good', '正常', 'Baik')}</Text></View>
            <View style={styles.dateLegendItem}><View style={[styles.dateLegendDot, { backgroundColor: STATUS_COLORS.tooLittle }]} /><Text style={styles.dateLegendText}>{getText('Too little', '吃少了', 'Terlalu Sedikit')}</Text></View>
          </View>

          {copySourceKey && (
            <View style={styles.copyModeBanner}>
              <Ionicons name="copy-outline" size={16} color={colors.primaryDark} />
              <Text style={styles.copyModeText}>
                {getText(
                  `Copying ${formatCopyDateLabel(copySourceKey)}. Tap multiple target dates, then confirm. Selected: ${copyTargetKeys.length}`,
                  `正在复制 ${formatCopyDateLabel(copySourceKey)}，可点选多个目标日期后确认。已选：${copyTargetKeys.length}`,
                  `Sedang menyalin ${formatCopyDateLabel(copySourceKey)}. Ketik beberapa tarikh sasaran, kemudian sahkan. Dipilih: ${copyTargetKeys.length}`
                )}
              </Text>
              <Pressable
                style={[styles.copyConfirmButton, copyTargetKeys.length === 0 && styles.copyConfirmButtonDisabled]}
                onPress={() => confirmCopyMealPlanToTargets(copyTargetKeys, false)}
              >
                <Text style={styles.copyConfirmText}>{getText('Confirm', '确认', 'Sahkan')}</Text>
              </Pressable>
              <Pressable style={styles.copyCancelButton} onPress={cancelCopyMealPlan}>
                <Text style={styles.copyCancelText}>{getText('Cancel', '取消', 'Batal')}</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.nutritionCard}>
          <View style={styles.nutritionHeaderRow}>
            <View>
              <Text style={styles.nutritionTitle}>{getText("Today's Nutrition", '今日营养', 'Nutrisi Hari Ini')}</Text>
              <Text style={styles.nutritionSubtitle}>{activeChild ? getText('Targets loaded from child profile', '目标来自儿童档案', 'Sasaran daripada profil kanak-kanak') : getText('Guest default targets', '访客默认目标', 'Sasaran lalai tetamu')}</Text>
            </View>
            <Text style={styles.nutritionProgressText}>{getText('Progress', '进度', 'Kemajuan')}</Text>
          </View>
          <View style={styles.ringRow}>
            <NutritionRing label={getText('Carbs', '碳水', 'Karbo')} value={totals.carbs} target={currentTargets.carbs} color="#F39B5F" />
            <NutritionRing label={getText('Protein', '蛋白质', 'Protein')} value={totals.protein} target={currentTargets.protein} color="#72C3E6" />
            <NutritionRing label={getText('Fat', '脂肪', 'Lemak')} value={totals.fat} target={currentTargets.fat} color="#56B277" />
          </View>
        </View>

        <View style={styles.planWrapper}>
          <View style={styles.planHeaderRow}>
            <Text style={styles.planTitle}>{getText('Meal Plan', '膳食计划', 'Pelan Makanan')}</Text>
            <Pressable style={styles.clearPlanButton} onPress={clearSelectedDayPlan}>
              <Ionicons name="trash-outline" size={15} color="#EF4444" />
              <Text style={styles.clearPlanButtonText}>{getText('Clear All', '全部清空', 'Kosongkan Semua')}</Text>
            </Pressable>
          </View>

          <Text style={styles.planShoppingText}>☑ {getText('View ingredients in Shopping', '在购物清单查看食材', 'Lihat bahan di Shopping')}</Text>
          <View style={styles.preferenceBanner}><Text style={styles.preferenceBannerText}>✓ {getText('Meals adapted to preferences', '餐食已根据偏好调整', 'Hidangan disesuaikan dengan pilihan')}</Text></View>

          {isGeneratingMealPlan ? (
            <View style={styles.generatingCard}>
              <ActivityIndicator size="large" color={colors.primaryDark} />
              <Text style={styles.generatingTitle}>{getText('Generating your meal plan...', '正在生成你的膳食计划...', 'Sedang menjana pelan makanan anda...')}</Text>
              <Text style={styles.generatingText}>{getText('AI is choosing suitable recipes based on the child profile, nutrition targets and your food preference.', 'AI 正在根据儿童档案、营养目标和食物偏好选择合适的食谱。', 'AI sedang memilih resipi yang sesuai berdasarkan profil kanak-kanak, sasaran nutrisi dan pilihan makanan anda.')}</Text>
            </View>
          ) : SLOT_ORDER.some((slot) => !!selectedDayPlan[slot]) ? (
            SLOT_ORDER.filter((slot) => !!selectedDayPlan[slot]).map((slot) => renderMealCard(slot, selectedDayPlan[slot] as MealRecipe))
          ) : (
            <View style={styles.emptyMealPlanCard}>
              <Text style={styles.emptyMealPlanEmoji}>🍽️</Text>
              <Text style={styles.emptyMealPlanTitle}>{getText('No meals added yet', '还没有添加餐食', 'Belum ada hidangan')}</Text>
              <Text style={styles.emptyMealPlanText}>{getText('Tap the button below to generate an AI meal plan, or search recipes above.', '点击下面按钮生成 AI 膳食计划，或在上方搜索食谱。', 'Ketik butang di bawah untuk menjana pelan makanan AI, atau cari resipi di atas.')}</Text>
              <Pressable style={styles.generatePlanButton} onPress={() => openAiMealPlanModal({ startDate: selectedDate })}>
                <Ionicons name="sparkles" size={17} color="#FFFFFF" />
                <Text style={styles.generatePlanButtonText}>{getText('Generate Meal Plan', '生成膳食计划', 'Jana Pelan Makanan')}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showCalendar} transparent animationType="fade" onRequestClose={() => setShowCalendar(false)}>
        <Pressable style={styles.calendarBackdrop} onPress={() => setShowCalendar(false)}>
          <Pressable style={styles.calendarModal} onPress={() => {}}>
            <View style={styles.calendarHero}>
              <View>
                <Text style={styles.calendarHeroLabel}>{getText('Select date', '选择日期', 'Pilih tarikh')}</Text>
                <Text style={styles.calendarHeroTitle}>{calendarMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</Text>
              </View>
              <Pressable style={styles.calendarCloseButton} onPress={() => setShowCalendar(false)}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.calendarMonthRow}>
              <Pressable style={styles.calendarNavButton} onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
                <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
              </Pressable>
              <Pressable style={styles.calendarTodayButton} onPress={goToday}>
                <Ionicons name="sunny-outline" size={16} color={colors.primaryDark} />
                <Text style={styles.calendarTodayText}>{getText('Today', '今天', 'Hari Ini')}</Text>
              </Pressable>
              <Pressable style={styles.calendarNavButton} onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
                <Ionicons name="chevron-forward" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>

            {copySourceKey && (
              <View style={styles.calendarCopyBanner}>
                <Ionicons name="copy-outline" size={15} color={colors.primaryDark} />
                <Text style={styles.calendarCopyText}>
                  {getText(
                    `Copying ${formatCopyDateLabel(copySourceKey)}. Tap multiple dates. Selected: ${copyTargetKeys.length}`,
                    `正在复制 ${formatCopyDateLabel(copySourceKey)}，可点选多个日期。已选：${copyTargetKeys.length}`,
                    `Sedang menyalin ${formatCopyDateLabel(copySourceKey)}. Ketik beberapa tarikh. Dipilih: ${copyTargetKeys.length}`
                  )}
                </Text>
                <Pressable
                  style={[styles.calendarCopyConfirmButton, copyTargetKeys.length === 0 && styles.copyConfirmButtonDisabled]}
                  onPress={() => confirmCopyMealPlanToTargets(copyTargetKeys, true)}
                >
                  <Text style={styles.calendarCopyConfirmText}>{getText('Confirm', '确认', 'Sahkan')}</Text>
                </Pressable>
                <Pressable onPress={cancelCopyMealPlan}>
                  <Text style={styles.calendarCopyCancelText}>{getText('Cancel', '取消', 'Batal')}</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.weekRow}>
              {[getText('Mon', '周一', 'Isn'), getText('Tue', '周二', 'Sel'), getText('Wed', '周三', 'Rab'), getText('Thu', '周四', 'Kha'), getText('Fri', '周五', 'Jum'), getText('Sat', '周六', 'Sab'), getText('Sun', '周日', 'Aha')].map((day) => <Text key={day} style={styles.weekText}>{day}</Text>)}
            </View>

            <View style={styles.calendarGrid}>
              {calendarWeeks.map((week, weekIndex) => (
                <View key={`week-${weekIndex}`} style={styles.calendarWeekRow}>
                  {week.map((date) => {
                    const key = formatDateKey(date);
                    const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();
                    const isSelected = key === selectedKey;
                    const isToday = key === todayKey;
                    const statusInfo = getCalendarStatus(mealPlans[key], currentTargets);
                    return (
                      <CalendarDateCell
                        key={key}
                        date={date}
                        isCurrentMonth={isCurrentMonth}
                        isSelected={isSelected}
                        isToday={isToday}
                        status={statusInfo.status}
                        progress={statusInfo.progress}
                        isCopySource={copySourceKey === key}
                        isCopyTarget={copyTargetKeys.includes(key)}
                        setCellRef={(node) => setDateCardRef(key, node)}
                        onLayout={() => measureDateCard(key)}
                        onPress={() => handleDatePress(date, true)}
                        onLongPress={() => startCopyMealPlan(date)}
                        onPressOut={(event) => handleCopyPressOut(key, event)}
                      />
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={styles.calendarFooter}>
              <View style={styles.calendarLegendItem}><View style={[styles.calendarLegendStatusDot, { backgroundColor: STATUS_COLORS.tooMuch }]} /><Text style={styles.calendarLegendText}>{getText('Too much', '吃多了', 'Terlalu Banyak')}</Text></View>
              <View style={styles.calendarLegendItem}><View style={[styles.calendarLegendStatusDot, { backgroundColor: STATUS_COLORS.good }]} /><Text style={styles.calendarLegendText}>{getText('Good', '正常', 'Baik')}</Text></View>
              <View style={styles.calendarLegendItem}><View style={[styles.calendarLegendStatusDot, { backgroundColor: STATUS_COLORS.tooLittle }]} /><Text style={styles.calendarLegendText}>{getText('Too little', '吃少了', 'Terlalu Sedikit')}</Text></View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 16 },
  searchOuterCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  searchInnerCard: { minHeight: 48, borderRadius: 18, backgroundColor: '#F4F6F4', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, color: colors.text, fontSize: 15 },
  searchClear: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  suggestionBox: { marginTop: 12, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', backgroundColor: '#FFFFFF' },
  suggestionStatus: { minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  suggestionStatusText: { color: colors.muted, fontWeight: '700' },
  suggestionErrorText: { flex: 1, color: '#B91C1C', fontWeight: '700' },
  suggestionItem: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  suggestionMain: { flexDirection: 'row', gap: 12 },
  suggestionImage: { width: 66, height: 66, borderRadius: 16, backgroundColor: '#E5E7EB' },
  suggestionImageFallback: { width: 66, height: 66, borderRadius: 16, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  suggestionContent: { flex: 1 },
  suggestionTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A', lineHeight: 20 },
  suggestionMeta: { marginTop: 3, color: '#64748B', fontSize: 12 },
  suggestionNutrition: { marginTop: 6, color: colors.primaryDark, fontWeight: '700', fontSize: 12, lineHeight: 17 },
  suggestionActions: { marginTop: 10, flexDirection: 'row', gap: 8 },
  suggestionButton: { flex: 1, height: 38, borderRadius: 999, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#FFFFFF' },
  suggestionViewButton: { borderColor: '#3BA76D' },
  suggestionWatchButton: { borderColor: '#FF3B30' },
  suggestionButtonText: { fontSize: 12, fontWeight: '800' },
  suggestionAddButton: { flex: 1, height: 38, borderRadius: 999, backgroundColor: colors.primaryDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  suggestionAddText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  dateContainer: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  dateTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateTitle: { fontSize: 16, fontWeight: '900', color: '#1F2937' },
  dateSubtitle: { marginTop: 2, fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  dateActionRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  calendarButton: { height: 36, borderRadius: 18, backgroundColor: '#EAF7F0', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
  calendarButtonText: { color: colors.primaryDark, fontWeight: '900', fontSize: 12 },
  fixedDateRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  scrollableDateRow: { gap: 6, paddingRight: 6 },
  dateCard: { width: 52, minHeight: 78, borderRadius: 15, backgroundColor: '#F7F7F5', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  dateCardActive: { backgroundColor: '#57B56E' },
  dateCardSelectedWithPlan: { borderWidth: 2, borderColor: '#0F172A' },
  dateDay: { fontSize: 11, fontWeight: '800', color: '#1F3B5A' },
  dateNumber: { marginTop: 4, fontSize: 21, lineHeight: 24, fontWeight: '900', color: '#334155' },
  dateTextActive: { color: '#FFFFFF' },
  dateToday: { marginTop: 3, fontSize: 9, fontWeight: '800', color: '#57B56E' },
  dateTodayActive: { color: '#FFFFFF' },
  dateLegendRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 12 },
  dateLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateLegendDot: { width: 8, height: 8, borderRadius: 4 },
  dateLegendText: { fontSize: 11, color: '#64748B', fontWeight: '700' },
  nutritionCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  nutritionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nutritionTitle: { fontSize: 18, fontWeight: '900', color: '#1F2937' },
  nutritionSubtitle: { marginTop: 3, color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  nutritionProgressText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  ringRow: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-around' },
  ringBlock: { alignItems: 'center', flex: 1 },
  ringWrap: { width: 86, height: 86, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ringValueText: { fontSize: 16, fontWeight: '900', color: '#1F2937' },
  ringLabel: { marginTop: 6, fontSize: 13, color: '#6B7280', fontWeight: '600' },
  ringTarget: { marginTop: 2, fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  planWrapper: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  planHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  clearPlanButton: { minHeight: 34, borderRadius: 17, backgroundColor: '#FEF2F2', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  clearPlanButtonText: { color: '#EF4444', fontSize: 12, fontWeight: '900' },
  aiHint: { marginTop: 3, fontSize: 12, color: '#94A3B8', fontWeight: '700' },
  refreshButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  refreshButtonGenerating: { backgroundColor: '#EAF7F0', borderColor: '#BBF7D0' },
  preferenceBox: { marginTop: 14, minHeight: 48, borderRadius: 18, backgroundColor: '#F4F6F4', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  preferenceInput: { flex: 1, color: colors.text, fontSize: 14 },
  planShoppingText: { marginTop: 10, color: '#4EA96B', fontSize: 14, fontWeight: '600' },
  preferenceBanner: { marginTop: 14, backgroundColor: '#E7F4EA', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 14 },
  preferenceBannerText: { color: '#2E8B57', fontWeight: '700', fontSize: 14 },
  generatingCard: { marginTop: 18, borderRadius: 22, backgroundColor: '#F8FAFC', padding: 26, alignItems: 'center' },
  generatingTitle: { marginTop: 14, fontSize: 17, fontWeight: '900', color: '#1F2937' },
  generatingText: { marginTop: 8, color: '#64748B', fontSize: 13, lineHeight: 20, textAlign: 'center', fontWeight: '600' },
  generatePlanButton: { marginTop: 18, height: 44, borderRadius: 18, backgroundColor: colors.primaryDark, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  generatePlanButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  generateErrorText: { marginTop: 12, color: '#B91C1C', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  emptyMealPlanCard: { marginTop: 18, borderRadius: 22, backgroundColor: '#F8FAFC', padding: 24, alignItems: 'center' },
  emptyMealPlanEmoji: { fontSize: 40 },
  emptyMealPlanTitle: { marginTop: 10, fontSize: 16, fontWeight: '900', color: '#1F2937' },
  emptyMealPlanText: { marginTop: 6, fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  mealSection: { marginTop: 18 },
  mealSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealSectionTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  mealSectionSub: { marginTop: 2, fontSize: 13, color: '#64748B' },
  smallIconButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2' },
  mealCard: { marginTop: 12, borderRadius: 18, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 14, flexDirection: 'row', gap: 12 },
  mealImage: { width: 80, height: 80, borderRadius: 16, backgroundColor: '#E5E7EB' },
  mealImageFallback: { width: 80, height: 80, borderRadius: 16, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  fallbackEmoji: { fontSize: 30 },
  mealContent: { flex: 1 },
  mealTitle: { fontSize: 15, fontWeight: '900', color: '#0F172A', lineHeight: 22 },
  macroTagRow: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  macroTag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  macroCarb: { backgroundColor: '#FFF1E8' },
  macroProtein: { backgroundColor: '#EEF4FF' },
  macroFat: { backgroundColor: '#EAF8EE' },
  macroTagText: { fontSize: 12, fontWeight: '700' },
  mealButtonRow: { marginTop: 12, flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, minHeight: 42, borderRadius: 999, borderWidth: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFFFFF', paddingHorizontal: 8 },
  viewButton: { borderColor: '#3BA76D' },
  watchButton: { borderColor: '#FF3B30' },
  actionButtonText: { fontSize: 13, fontWeight: '700' },
  replaceLink: { marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 },
  replaceLinkText: { color: colors.primaryDark, fontSize: 13, fontWeight: '700' },
  aiModalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  aiModalCard: { width: '100%', maxWidth: 420, backgroundColor: '#FFFFFF', borderRadius: 28, padding: 18 },
  aiModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiModalIcon: { width: 48, height: 48, borderRadius: 18, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  aiModalTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  aiModalSubtitle: { marginTop: 3, color: colors.muted, fontSize: 12, fontWeight: '600' },
  aiModalClose: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  aiModalLabel: { marginTop: 16, marginBottom: 8, color: colors.text, fontSize: 13, fontWeight: '900' },
  aiPromptBox: { minHeight: 52, borderRadius: 18, backgroundColor: '#F4F6F4', paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiPromptInput: { flex: 1, color: colors.text, fontSize: 14, maxHeight: 90 },
  aiMealPlanHint: { marginTop: 8, color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  daySelectorRow: { flexDirection: 'row', gap: 8 },
  dayChip: { flex: 1, height: 38, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  dayChipActive: { backgroundColor: colors.primaryDark },
  dayChipText: { color: '#64748B', fontSize: 14, fontWeight: '900' },
  dayChipTextActive: { color: '#FFFFFF' },
  generateHomeButton: { marginTop: 16, height: 48, borderRadius: 18, backgroundColor: colors.primaryDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  generateHomeButtonLoading: { opacity: 0.85 },
  generateHomeButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  aiMealPlanError: { marginTop: 10, color: '#B91C1C', fontSize: 12, fontWeight: '700', textAlign: 'center' },

  calendarBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  calendarModal: { width: '100%', maxWidth: 392, backgroundColor: '#FFFFFF', borderRadius: 30, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 28, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  calendarHero: { backgroundColor: colors.primaryDark, paddingHorizontal: 20, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarHeroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '800', marginBottom: 4 },
  calendarHeroTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  calendarCloseButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  calendarMonthRow: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarNavButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#EAF7F0', alignItems: 'center', justifyContent: 'center' },
  calendarTodayButton: { height: 40, borderRadius: 20, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  calendarTodayText: { color: colors.primaryDark, fontSize: 13, fontWeight: '900' },
  weekRow: { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 4, paddingBottom: 8 },
  weekText: { flex: 1, color: '#94A3B8', textAlign: 'center', fontSize: 11, fontWeight: '900' },
  calendarGrid: { paddingHorizontal: 14, paddingBottom: 10 },
  calendarWeekRow: { flexDirection: 'row', width: '100%', height: 48 },
  calendarCell: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center' },
  calendarDateWrap: { width: 42, height: 46, alignItems: 'center', justifyContent: 'center' },
  calendarRingSvg: { position: 'absolute' },
  calendarRingNumber: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  calendarDateCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  calendarDateToday: { borderWidth: 1.8, borderColor: colors.primaryDark, backgroundColor: '#FFFFFF' },
  calendarDateSelected: { backgroundColor: colors.primaryDark, borderWidth: 0 },
  calendarDateText: { color: '#334155', fontSize: 14, fontWeight: '800' },
  calendarDateMuted: { color: '#CBD5E1' },
  calendarDateTodayText: { color: colors.primaryDark, fontWeight: '900' },
  calendarDateTextSelected: { color: '#FFFFFF', fontWeight: '900' },
  calendarNutritionDot: { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
  calendarFooter: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', gap: 14 },
  calendarLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  calendarLegendStatusDot: { width: 10, height: 10, borderRadius: 5 },
  calendarLegendText: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  dateCardCopySource: { borderWidth: 2, borderColor: '#0F172A', transform: [{ scale: 1.03 }] },
  dateCardCopyTarget: { borderWidth: 2, borderColor: colors.primaryDark, backgroundColor: '#22C55E' },
  copyModeBanner: { marginTop: 12, borderRadius: 18, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  copyModeText: { flex: 1, color: colors.primaryDark, fontSize: 12, fontWeight: '800', lineHeight: 17 },
  copyConfirmButton: { minHeight: 28, borderRadius: 14, backgroundColor: colors.primaryDark, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  copyConfirmButtonDisabled: { opacity: 0.45 },
  copyConfirmText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  copyCancelButton: { minHeight: 28, borderRadius: 14, backgroundColor: '#FFFFFF', paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  copyCancelText: { color: '#EF4444', fontSize: 12, fontWeight: '900' },
  calendarDateWrapCopySource: { borderRadius: 21, backgroundColor: '#F0FDF4', borderWidth: 2, borderColor: colors.primaryDark },
  calendarDateWrapCopyTarget: { borderRadius: 21, backgroundColor: '#DCFCE7', borderWidth: 2, borderColor: '#22C55E' },
  calendarCopyBanner: { marginHorizontal: 18, marginBottom: 8, borderRadius: 16, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', paddingHorizontal: 10, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 7 },
  calendarCopyText: { flex: 1, color: colors.primaryDark, fontSize: 11, fontWeight: '800', lineHeight: 16 },
  calendarCopyConfirmButton: { minHeight: 26, borderRadius: 13, backgroundColor: colors.primaryDark, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' },
  calendarCopyConfirmText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  calendarCopyCancelText: { color: '#EF4444', fontSize: 11, fontWeight: '900' },

});
