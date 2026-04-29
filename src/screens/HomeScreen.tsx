import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
  Modal,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { useChildProfile } from '../context/ChildProfileContext';
import { colors } from '../theme/colors';
import {
  Card,
  Chip,
  EmptyState,
  Header,
  IconButton,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '../components/Common';
import ChildAvatar from '../components/ChildAvatar';
import DigitalTwin from '../components/DigitalTwin';
import LanguageModal from '../components/LanguageModal';
import AddChildModal from '../components/AddChildModal';
import ChildrenProfilesModal from '../components/ChildrenProfilesModal';
import Markdown from 'react-native-markdown-display';
import { FileText, X, ExternalLink } from 'lucide-react-native';
import { generateMealPlanByAi } from '../services/api';

type FoodSuggestion = {
  label: string;
  query: string;
};

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

const BASE_URL = 'https://jom-healthy-java.onrender.com';
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

  return (
    lower.includes('.jpg') ||
    lower.includes('.jpeg') ||
    lower.includes('.png') ||
    lower.includes('.webp')
  );
}

function isValidYoutubeUrl(url?: string | null) {
  if (!url) return false;

  const lower = url.toLowerCase();

  if (!lower.startsWith('https://')) return false;
  if (lower.includes('example')) return false;

  return (
    lower.includes('youtube.com/watch') ||
    lower.includes('youtu.be/') ||
    lower.includes('youtube.com/results?search_query=')
  );
}

function normalizeAiMeal(meal: any): MealRecipe {
  const rawImageUrl = meal?.strMealThumb || meal?.imageUrl || '';
  const rawYoutubeUrl = meal?.strYoutube || meal?.youtubeUrl || '';

  return {
    idMeal:
      meal?.idMeal ||
      `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    strMeal: meal?.strMeal || meal?.name || 'AI Recommended Meal',
    strCategory: meal?.strCategory || meal?.category || 'AI Meal',
    strArea: meal?.strArea || meal?.area || 'Healthy',
    strInstructions: meal?.strInstructions || meal?.instructions || '',
    strMealThumb: isValidImageUrl(rawImageUrl) ? rawImageUrl : null,
    strYoutube: isValidYoutubeUrl(rawYoutubeUrl) ? rawYoutubeUrl : null,
    totalEnergyKcal: safeNumber(meal?.totalEnergyKcal || meal?.calories),
    totalProteinG: safeNumber(meal?.totalProteinG || meal?.protein),
    totalCarbohydrateG: safeNumber(
      meal?.totalCarbohydrateG || meal?.carbs || meal?.carbohydrate
    ),
    totalFatG: safeNumber(meal?.totalFatG || meal?.fat),
    ingredients: Array.isArray(meal?.ingredients)
      ? meal.ingredients.map((item: any, index: number) => ({
          ingredientId: item.ingredientId || index + 1,
          ingredientOrder: item.ingredientOrder || index + 1,
          ingredientName:
            item.ingredientName || item.name || item.foodNameEn || 'Ingredient',
          measure: item.measure || item.quantity || '',
          normalizedName:
            item.normalizedName || item.name || item.ingredientName || '',
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
  return String(
    item.foodNameEn ||
      item.ingredientName ||
      item.normalizedName ||
      'Ingredient'
  ).trim();
}

function normalizeIngredientQuantity(item: any) {
  if (item.measure) return String(item.measure);

  if (item.gramsEstimated !== undefined && item.gramsEstimated !== null) {
    return `${item.gramsEstimated}g`;
  }

  return '';
}

function classifyIngredientCategory(item: any): ShoppingCategory {
  const name = String(
    item.foodNameEn || item.ingredientName || item.normalizedName || ''
  ).toLowerCase();

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

async function generateShoppingListByOwner(
  allMealPlans: Record<string, Record<string, MealPlanForDay>>
) {
  try {
    const oldRaw = await AsyncStorage.getItem(SHOPPING_LIST_STORAGE_KEY);
    const oldByOwner: Record<string, ShoppingItem[]> = oldRaw
      ? JSON.parse(oldRaw)
      : {};

    const nextByOwner: Record<string, ShoppingItem[]> = {};

    Object.entries(allMealPlans).forEach(([ownerKey, mealPlans]) => {
      const oldItems = oldByOwner[ownerKey] || [];
      const checkedMap = new Map<string, boolean>();

      oldItems.forEach((item) => {
        checkedMap.set(item.id, item.checked);
      });

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
              existing.quantity = [existing.quantity, quantity]
                .filter(Boolean)
                .join(' + ');

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

    await AsyncStorage.setItem(
      SHOPPING_LIST_STORAGE_KEY,
      JSON.stringify(nextByOwner)
    );
  } catch (error) {
    console.log('Generate shopping list failed:', error);
  }
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { language, t } = useLanguage();
  const {
    children,
    activeChild,
    switchToChild,
    nutritionProgress,
    nutritionNeeds,
    getTip,
    getOwnerKey,
  } = useChildProfile();

  const [showLanguage, setShowLanguage] = useState(false);
  const [showAiMealPlan, setShowAiMealPlan] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showChildren, setShowChildren] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [allTopics, setAllTopics] = useState<any[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [showTopicModal, setShowTopicModal] = useState(false);

  const [aiMealPrompt, setAiMealPrompt] = useState('');
  const [aiMealDays, setAiMealDays] = useState(1);
  const [aiMealGenerating, setAiMealGenerating] = useState(false);
  const [aiMealGenerateError, setAiMealGenerateError] = useState('');

  const langCode = language === 'zh' ? 'ZH' : language === 'ms' ? 'MS' : 'EN';

  const allGoalsMet =
    nutritionProgress.carbs.current >= nutritionProgress.carbs.target &&
    nutritionProgress.protein.current >= nutritionProgress.protein.target &&
    nutritionProgress.fat.current >= nutritionProgress.fat.target;

  const lastCheckDate = useMemo(
    () =>
      new Date().toLocaleDateString('en-MY', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    []
  );

  const getText = (en: string, zh: string, ms: string) => {
    if (language === 'zh') return zh;
    if (language === 'ms') return ms;
    return en;
  };

  const getChildChipLabel = (child: any) => {
    return child.avatarImageUri ? child.nickname : `${child.avatar} ${child.nickname}`;
  };

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/topics/all`);
        if (response.ok) {
          const data = await response.json();
          setAllTopics(data);
        }
      } catch (error) {
        console.error('Topics Fetch Error:', error);
      } finally {
        setTopicsLoading(false);
      }
    };
    fetchTopics();
  }, []);

  useEffect(() => {
    const query = searchText.trim();

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

        const nextSuggestions: FoodSuggestion[] = data.slice(0, 6).map((item: any) => {
          const label =
            language === 'zh'
              ? item.foodNameCn || item.foodNameOriginal || item.foodNameEn || item.foodNameMs
              : language === 'ms'
                ? item.foodNameMs || item.foodNameOriginal || item.foodNameEn || item.foodNameCn
                : item.foodNameEn || item.foodNameOriginal || item.foodNameMs || item.foodNameCn;

          const backendQuery =
            item.foodNameCombine ||
            item.foodNameOriginal ||
            item.foodNameEn ||
            item.foodNameMs ||
            item.foodNameCn ||
            label;

          return {
            label: label || query,
            query: backendQuery || query,
          };
        });

        setSuggestions(nextSuggestions);
        setShowSuggestions(true);
      } catch (error: any) {
        console.log('Food suggestion search failed:', error);
        setSearchError(
          getText(
            'Network error. Please try again.',
            '网络错误，请稍后再试。',
            'Ralat rangkaian. Cuba lagi.'
          )
        );
        setSuggestions([]);
        setShowSuggestions(true);
      } finally {
        setSearchLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText, language]);

  const reportTopics = allTopics.filter(t => t.category === 'REPORT');
  const dietTopics = allTopics.filter(t => t.category === 'DIET');
  const sportTopics = allTopics.filter(t => t.category === 'SPORT');
  const habitTopics = allTopics.filter(t => t.category === 'HABIT');
  const displayTopics = [...reportTopics, ...habitTopics, ...sportTopics, ...dietTopics];

  const handleFoodSearch = (value?: string) => {
    const foodName = (value ?? searchText).trim();

    if (!foodName) {
      Alert.alert(
        getText('Enter a food name', '请输入食物名称', 'Masukkan nama makanan')
      );
      return;
    }

    setSearchHistory((prev) =>
      [
        foodName,
        ...prev.filter(
          (item) => item.toLowerCase() !== foodName.toLowerCase()
        ),
      ].slice(0, 6)
    );

    setSearchText('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchError('');

    navigation.navigate('FoodInfo', {
      foodName,
      source: 'search',
    });
  };

  const openAiMealPlanModal = () => {
    setAiMealGenerateError('');
    setShowAiMealPlan(true);
  };

  const closeAiMealPlanModal = () => {
    if (aiMealGenerating) return;
    setShowAiMealPlan(false);
  };

  const generateAiMealPlanFromHome = async () => {
    if (aiMealGenerating) return;

    setAiMealGenerating(true);
    setAiMealGenerateError('');

    const ownerKey = getOwnerKey ? getOwnerKey() : 'guest';

    const currentTargets = {
      carbs: nutritionNeeds?.carbs || DEFAULT_TARGETS.carbs,
      protein: nutritionNeeds?.protein || DEFAULT_TARGETS.protein,
      fat: nutritionNeeds?.fat || DEFAULT_TARGETS.fat,
    };

    try {
      const raw = await AsyncStorage.getItem(MEAL_PLANS_STORAGE_KEY);
      const allMealPlans: Record<string, Record<string, MealPlanForDay>> = raw
        ? JSON.parse(raw)
        : {};

      const ownerPlans = allMealPlans[ownerKey] || {};
      const today = new Date();

      for (let i = 0; i < aiMealDays; i += 1) {
        const targetDate = addDays(today, i);
        const dateKey = formatDateKey(targetDate);

        const result = await generateMealPlanByAi({
          childName: activeChild?.nickname || 'Guest',
          age: activeChild?.age || 7,
          gender: activeChild?.gender || 'boy',
          heightCm: activeChild?.height || 120,
          weightKg: activeChild?.weight || 20,
          allergies: activeChild?.allergies || [],
          restrictions: activeChild?.restrictions || {},
          targetCarbs: currentTargets.carbs,
          targetProtein: currentTargets.protein,
          targetFat: currentTargets.fat,
          days: 1,
          mealPreference: aiMealPrompt.trim()
            ? `${aiMealPrompt.trim()} for day ${i + 1}`
            : '',
        });

        if (!result.ok) {
          throw new Error(result.message || 'Failed to generate meal plan.');
        }

        const data = result.data?.data || result.data || {};
        const plan = data.plan || data.mealPlan || data;

        const nextDayPlan: MealPlanForDay = {};

        if (plan.breakfast) {
          nextDayPlan.Breakfast = normalizeAiMeal(plan.breakfast);
        }

        if (plan.lunch) {
          nextDayPlan.Lunch = normalizeAiMeal(plan.lunch);
        }

        if (plan.dinner) {
          nextDayPlan.Dinner = normalizeAiMeal(plan.dinner);
        }

        if (plan.snack) {
          nextDayPlan.Snack = normalizeAiMeal(plan.snack);
        }

        const hasAnyMeal = SLOT_ORDER.some((slot) => !!nextDayPlan[slot]);

        if (!hasAnyMeal) {
          throw new Error('AI did not return a valid meal plan.');
        }

        ownerPlans[dateKey] = nextDayPlan;
      }

      allMealPlans[ownerKey] = ownerPlans;

      await AsyncStorage.setItem(
        MEAL_PLANS_STORAGE_KEY,
        JSON.stringify(allMealPlans)
      );

      await generateShoppingListByOwner(allMealPlans);

      setShowAiMealPlan(false);
      navigation.navigate('Meal');
    } catch (error: any) {
      console.log('Home AI meal plan failed:', error);
      setAiMealGenerateError(
        error?.message ||
          getText(
            'Network error. Please try again.',
            '网络错误，请稍后再试。',
            'Ralat rangkaian. Cuba lagi.'
          )
      );
    } finally {
      setAiMealGenerating(false);
    }
  };

  return (
    <>
      <Screen padded={false}>
        <Header
          title={t('appName')}
          subtitle={t('tagline')}
          icon="heart"
          right={
            <Pressable
              style={styles.langButton}
              onPress={() => setShowLanguage(true)}
            >
              <Text style={styles.langText}>{langCode}</Text>
            </Pressable>
          }
        />

        <View style={styles.body}>
          {/* Search */}
          <Card>
            <View style={styles.searchWrap}>
              <Ionicons
                name="search"
                size={22}
                color={colors.primaryDark}
              />

              <TextInput
                value={searchText}
                onChangeText={(text) => {
                  setSearchText(text);
                  setShowSuggestions(true);
                }}
                placeholder={t('searchPlaceholder')}
                placeholderTextColor="#B8BEC8"
                style={styles.searchInput}
                returnKeyType="search"
                autoCorrect={false}
                onSubmitEditing={() => handleFoodSearch()}
              />

              {searchText.length > 0 && (
                <IconButton
                  icon="close"
                  size={34}
                  onPress={() => {
                    setSearchText('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                    setSearchError('');
                  }}
                />
              )}

              <IconButton
                icon="mic"
                size={38}
                onPress={() => navigation.navigate('VoiceSearch')}
              />

              <IconButton
                icon="camera"
                size={38}
                onPress={() => navigation.navigate('CameraSearch')}
              />
            </View>

            {searchText.trim().length > 0 && showSuggestions && (
              <View style={styles.suggestionBox}>
                {searchLoading ? (
                  <View style={styles.suggestionStatus}>
                    <ActivityIndicator size="small" color={colors.primaryDark} />
                    <Text style={styles.suggestionStatusText}>
                      {getText('Searching...', '搜索中...', 'Mencari...')}
                    </Text>
                  </View>
                ) : searchError ? (
                  <View style={styles.suggestionStatus}>
                    <Ionicons name="warning-outline" size={18} color="#EF4444" />
                    <Text style={styles.suggestionError}>{searchError}</Text>
                  </View>
                ) : suggestions.length > 0 ? (
                  suggestions.map((item, index) => (
                    <Pressable
                      key={`${item.label}-${index}`}
                      style={[
                        styles.suggestionItem,
                        index === suggestions.length - 1 && styles.suggestionItemLast,
                      ]}
                      onPress={() => handleFoodSearch(item.query)}
                    >
                      <Ionicons
                        name="restaurant-outline"
                        size={17}
                        color={colors.primaryDark}
                      />
                      <Text style={styles.suggestionText}>{item.label}</Text>
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.suggestionStatus}>
                    <Text style={styles.suggestionStatusText}>
                      {getText(
                        'No matching food found',
                        '没有找到匹配食物',
                        'Tiada makanan ditemui'
                      )}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {searchText.trim().length === 0 && searchHistory.length > 0 && (
              <>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyTitle}>
                    {getText('Search History', '搜索记录', 'Sejarah Carian')}
                  </Text>

                  <Pressable onPress={() => setSearchHistory([])}>
                    <Text style={styles.clearHistory}>
                      {getText('Clear', '清空', 'Kosongkan')}
                    </Text>
                  </Pressable>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.suggestionsRow}
                >
                  {searchHistory.map((food) => (
                    <Chip
                      key={food}
                      label={food}
                      onPress={() => handleFoodSearch(food)}
                    />
                  ))}
                </ScrollView>
              </>
            )}
          </Card>

          {/* Child Profile */}
          {!activeChild ? (
            <EmptyState
              emoji="👶"
              title={getText(
                'No child profile yet',
                '还没有创建小孩档案',
                'Belum ada profil kanak-kanak'
              )}
              subtitle={getText(
                'You can still use food search, growth overview and health insights. Create a profile to unlock personalized meal plans.',
                '你仍然可以使用食品搜索、成长概览和健康建议。创建档案后可生成个性化食谱。',
                'Anda masih boleh guna carian makanan, gambaran pertumbuhan dan panduan kesihatan. Cipta profil untuk pelan makanan peribadi.'
              )}
              action={
                <PrimaryButton
                  title={getText('Create Profile', '创建档案', 'Cipta Profil')}
                  icon="add"
                  onPress={() => setShowAddChild(true)}
                />
              }
            />
          ) : (
            <>
              <Card style={styles.profileSummaryCard}>
                <View style={styles.profileSummaryTop}>
                  <Pressable onPress={() => setShowChildren(true)}>
                    <ChildAvatar
                      avatar={activeChild.avatar}
                      avatarImageUri={activeChild.avatarImageUri}
                      size={58}
                      style={styles.profileAvatar}
                    />
                  </Pressable>

                  <View style={styles.profileInfo}>
                    <View style={styles.profileNameRow}>
                      <Text style={styles.profileAge}>{activeChild.age}</Text>
                      <View style={styles.onlineDot} />
                    </View>

                    <Text style={styles.profileMeta}>
                      {activeChild.gender === 'boy'
                        ? getText('Boy', '男孩', 'Lelaki')
                        : getText('Girl', '女孩', 'Perempuan')}{' '}
                      · {activeChild.height}cm, {activeChild.weight}kg
                    </Text>

                    <Text style={styles.profileLastCheck}>
                      {t('lastCheck')}: {lastCheckDate}
                    </Text>
                  </View>

                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>
                      {activeChild.status || 'Normal'}
                    </Text>
                  </View>
                </View>

                {children.length > 1 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.childSwitcher}
                  >
                    {children.map((child: any) => (
                      <Chip
                        key={child.id}
                        label={getChildChipLabel(child)}
                        selected={child.id === activeChild.id}
                        onPress={() => switchToChild(child.id)}
                      />
                    ))}
                  </ScrollView>
                )}

                <View style={styles.profileActions}>
                  <Pressable
                    style={styles.mealPlanButton}
                    onPress={openAiMealPlanModal}
                  >
                    <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                    <Text style={styles.mealPlanButtonText}>AI Meal Plan</Text>
                  </Pressable>

                  <Pressable
                    style={styles.checkHealthButton}
                    onPress={() => navigation.navigate('HealthCheck')}
                  >
                    <Ionicons
                      name="pulse"
                      size={17}
                      color={colors.primaryDark}
                    />
                    <Text style={styles.checkHealthButtonText}>
                      {t('checkHealth')}
                    </Text>
                  </Pressable>
                </View>
              </Card>

              <DigitalTwin
                tip={getTip()}
                nickname={`${activeChild.nickname}'s Twin`}
                isComplete={allGoalsMet}
              />
            </>
          )}

          {/* Growth Overview */}
          <Pressable
            style={styles.growthOverviewCard}
            onPress={() => navigation.navigate('Growth')}
          >
            <View style={styles.growthHeaderRow}>
              <Text style={styles.growthTitle}>{t('growthOverview')}</Text>

              <View style={styles.growthArrow}>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.primaryDark}
                />
              </View>
            </View>

            <View style={styles.growthLineWrap}>
              <View style={styles.growthDottedLine} />
              <View style={[styles.growthDot, { left: '0%' }]} />
              <View style={[styles.growthDot, { left: '32%' }]} />
              <View style={[styles.growthDot, { left: '64%' }]} />
              <View style={[styles.growthDot, { right: 0 }]} />
            </View>

            <Text style={styles.growthHint}>
              {activeChild
                ? getText(
                    'Tap to view detailed growth chart',
                    '点击查看详细成长图表',
                    'Ketik untuk lihat carta pertumbuhan'
                  )
                : getText(
                    'Create profile to track growth',
                    '创建档案以追踪成长',
                    'Cipta profil untuk jejak pertumbuhan'
                  )}
            </Text>
          </Pressable>

          {/* Health Insights - JJ Recovered */}
          <SectionTitle title={t('Health Insights')} />

          {topicsLoading ? (
            <ActivityIndicator size="small" color={colors.primaryDark} style={{ paddingVertical: 20 }} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.displayTopicsScroll}
            >
              {displayTopics.map((topic) => (
                <Pressable
                  key={topic.id || topic.title}
                  style={styles.topicCard}
                  onPress={() => {
                    setSelectedTopic(topic);
                    setShowTopicModal(true);
                  }}
                >
                  <View style={styles.topicCategoryBadge}>
                    <Text style={styles.topicCategoryText}>
                      {topic?.category || 'INSIGHT'}
                    </Text>
                  </View>

                  <Image
                    source={{ uri: topic.imageUrl }}
                    style={styles.topicImage}
                    resizeMode="cover"
                  />

                  <View style={styles.topicTextContainer}>
                    <Text style={styles.topicTitle} numberOfLines={2}>
                      {topic.title}
                    </Text>
                    <Text style={styles.topicSummary} numberOfLines={2}>
                      {topic.summary}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </Screen>

      <Modal visible={showAiMealPlan} transparent animationType="fade" onRequestClose={closeAiMealPlanModal}>
        <View style={styles.aiModalOverlay}>
          <View style={styles.aiModalContent}>
            <View style={styles.aiModalHeader}>
              <View style={styles.aiModalIconBox}>
                <Ionicons name="sparkles" size={22} color="#FFFFFF" />
              </View>

              <View style={styles.aiModalTitleWrap}>
                <Text style={styles.aiModalTitle}>AI Meal Plan</Text>
                <Text style={styles.aiModalSubtitle}>
                  Generate meals and shopping list automatically
                </Text>
              </View>

              <Pressable style={styles.aiModalCloseButton} onPress={closeAiMealPlanModal} disabled={aiMealGenerating}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.aiModalBody}>
              <Text style={styles.aiModalLabel}>What do you want to eat?</Text>

              <View style={styles.aiPromptBox}>
                <Ionicons name="fast-food-outline" size={18} color={colors.primaryDark} />
                <TextInput
                  value={aiMealPrompt}
                  onChangeText={setAiMealPrompt}
                  placeholder="e.g. chicken rice, egg, banana"
                  placeholderTextColor="#94A3B8"
                  style={styles.aiPromptInput}
                  multiline
                  editable={!aiMealGenerating}
                />
                {aiMealPrompt.length > 0 && !aiMealGenerating && (
                  <Pressable onPress={() => setAiMealPrompt('')}>
                    <Ionicons name="close-circle" size={20} color="#94A3B8" />
                  </Pressable>
                )}
              </View>

              <Text style={styles.aiModalHint}>
                Leave blank to recommend by child profile.
              </Text>

              <Text style={styles.aiModalLabel}>How many days?</Text>

              <View style={styles.daySelectorRow}>
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <Pressable
                    key={day}
                    style={[
                      styles.dayChip,
                      aiMealDays === day && styles.dayChipActive,
                    ]}
                    onPress={() => setAiMealDays(day)}
                    disabled={aiMealGenerating}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        aiMealDays === day && styles.dayChipTextActive,
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.aiInfoCard}>
                <Ionicons name="cart-outline" size={18} color={colors.primaryDark} />
                <Text style={styles.aiInfoText}>
                  Ingredients will be saved to Shopping automatically.
                </Text>
              </View>

              {!!aiMealGenerateError && (
                <Text style={styles.aiMealPlanError}>{aiMealGenerateError}</Text>
              )}
            </ScrollView>

            <View style={styles.aiModalFooter}>
              <Pressable
                style={[
                  styles.generateMealPlanButton,
                  aiMealGenerating && styles.generateMealPlanButtonLoading,
                ]}
                onPress={generateAiMealPlanFromHome}
                disabled={aiMealGenerating}
              >
                {aiMealGenerating ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.generateMealPlanButtonText}>
                      Generating {aiMealDays} day{aiMealDays > 1 ? 's' : ''}...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                    <Text style={styles.generateMealPlanButtonText}>
                      Generate Meal Plan
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={styles.viewMealPageButton}
                onPress={() => {
                  setShowAiMealPlan(false);
                  navigation.navigate('Meal');
                }}
                disabled={aiMealGenerating}
              >
                <Text style={styles.viewMealPageButtonText}>Go to Meal Page</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showTopicModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          {selectedTopic && (
            <View style={styles.modalContent}>
              <View style={styles.modalImageWrap}>
                <Image source={{ uri: selectedTopic.imageUrl }} style={styles.modalImage} resizeMode="cover" />
                <TouchableOpacity onPress={() => setShowTopicModal(false)} style={styles.modalCloseBtn}>
                  <X color="#FFFFFF" size={20} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalBody}>
                <View style={styles.modalTagRow}>
                  <FileText color={colors.primaryDark} size={18} />
                  <Text style={styles.modalTagText}>Health Insights</Text>
                </View>

                <Text style={styles.modalTitle}>{selectedTopic.title}</Text>

                <Markdown
                  style={{
                    body: { color: '#475569', fontSize: 16, lineHeight: 24 },
                    strong: { fontWeight: 'bold', color: '#2F3A3A' },
                    ordered_list_icon: { color: colors.primaryDark, fontWeight: 'bold' },
                  }}
                >
                  {selectedTopic.content}
                </Markdown>
              </ScrollView>

              {selectedTopic.sourceUrl && (
                <View style={styles.modalFooter}>
                  <TouchableOpacity onPress={() => Linking.openURL(selectedTopic.sourceUrl)} style={styles.modalActionBtn}>
                    <ExternalLink color="#3B82F6" size={18} />
                    <Text style={styles.modalActionText}>Read Original</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>

      <LanguageModal
        visible={showLanguage}
        onClose={() => setShowLanguage(false)}
      />

      <AddChildModal
        visible={showAddChild}
        onClose={() => setShowAddChild(false)}
      />

      <ChildrenProfilesModal
        visible={showChildren}
        onClose={() => setShowChildren(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: 20,
    gap: 14,
    paddingBottom: 110,
  },

  langButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  langText: {
    color: 'white',
    fontWeight: '800',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bg,
    borderRadius: 18,
    paddingHorizontal: 12,
    minHeight: 56,
  },

  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 10,
  },

  suggestionBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },

  suggestionItem: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },

  suggestionItemLast: {
    borderBottomWidth: 0,
  },

  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },

  suggestionStatus: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  suggestionStatusText: {
    fontSize: 13,
    color: colors.muted,
  },

  suggestionError: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },

  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },

  historyTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 13,
  },

  clearHistory: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 12,
  },

  suggestionsRow: {
    marginTop: 10,
  },

  profileSummaryCard: {
    padding: 18,
    borderRadius: 24,
  },

  profileSummaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  profileAvatar: {
    marginRight: 14,
  },

  profileInfo: {
    flex: 1,
  },

  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  profileAge: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },

  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },

  profileMeta: {
    marginTop: 4,
    fontSize: 13,
    color: colors.text,
  },

  profileLastCheck: {
    marginTop: 4,
    fontSize: 12,
    color: colors.muted,
  },

  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DDFBE8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusBadgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },

  childSwitcher: {
    marginTop: 14,
  },

  profileActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },

  mealPlanButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  mealPlanButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  checkHealthButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  checkHealthButtonText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '800',
  },

  growthOverviewCard: {
    backgroundColor: 'white',
    borderRadius: 22,
    padding: 16,
    minHeight: 150,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 2,
  },

  growthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  growthTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },

  growthArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  growthLineWrap: {
    height: 44,
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
  },

  growthDottedLine: {
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D3D8E0',
  },

  growthDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C6CDD8',
    top: 19,
  },

  growthHint: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },

  aiModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },

  aiModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '86%',
    overflow: 'hidden',
  },

  aiModalHeader: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  aiModalIconBox: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiModalTitleWrap: {
    flex: 1,
  },

  aiModalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },

  aiModalSubtitle: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },

  aiModalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiModalBody: {
    padding: 20,
  },

  aiModalLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 10,
  },

  aiPromptBox: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#F4F6F4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  aiPromptInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    maxHeight: 90,
  },

  aiModalHint: {
    marginTop: 8,
    marginBottom: 18,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },

  daySelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
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

  aiInfoCard: {
    borderRadius: 18,
    backgroundColor: '#EAF7F0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  aiInfoText: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },

  aiMealPlanError: {
    marginTop: 12,
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  aiModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    gap: 10,
  },

  generateMealPlanButton: {
    height: 50,
    borderRadius: 20,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  generateMealPlanButtonLoading: {
    opacity: 0.85,
  },

  generateMealPlanButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  viewMealPageButton: {
    height: 46,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  viewMealPageButtonText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '900',
  },

  displayTopicsScroll: {
    paddingBottom: 8,
    gap: 16,
  },

  topicCard: {
    width: 256,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },

  topicCategoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  topicCategoryText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  topicImage: {
    width: '100%',
    height: 160,
  },

  topicTextContainer: {
    padding: 16,
  },

  topicTitle: {
    fontWeight: 'bold',
    color: '#2F3A3A',
    fontSize: 16,
    marginBottom: 4,
  },

  topicSummary: {
    fontSize: 12,
    color: '#7A8A8A',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    maxHeight: '85%',
  },

  modalImageWrap: { width: '100%', height: 180, position: 'relative' },

  modalImage: { width: '100%', height: '100%' },

  modalCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 8,
    borderRadius: 24,
  },

  modalBody: { padding: 24 },

  modalTagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },

  modalTagText: { color: colors.primaryDark, fontWeight: '600', fontSize: 14 },

  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#2F3A3A', marginBottom: 16, lineHeight: 32 },

  modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#F9FAFB' },

  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'white',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  modalActionText: { color: '#3B82F6', fontWeight: 'bold', fontSize: 16 },

  nutritionIconBox: {
    backgroundColor: '#E8F5E9',
  },

  hydrationIconBox: {
    backgroundColor: '#EFF6FF',
  },

  activityIconBox: {
    backgroundColor: '#FAF5FF',
  },

  insightEmoji: {
    fontSize: 18,
  },

  insightTitle: {
    color: colors.text,
    fontWeight: '800',
    marginTop: 12,
  },

  insightDesc: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
    marginTop: 8,
  },
});
