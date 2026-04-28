import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useNavigation } from '@react-navigation/native';
import { Header, Screen } from '../components/Common';
import { colors } from '../theme/colors';
import { searchMeals } from '../services/api';
import { useChildProfile } from '../context/ChildProfileContext';

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

function addDays(date: Date, offset: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function getCenteredSevenDays(selectedDate: Date) {
  return [-3, -2, -1, 0, 1, 2, 3].map((offset) =>
    addDays(selectedDate, offset)
  );
}

function getMonthDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstDay = new Date(year, month, 1);

  /**
   * JS getDay():
   * Sunday = 0, Monday = 1, Tuesday = 2, ... Saturday = 6
   *
   * Calendar should start from Monday:
   * Monday = 0, Tuesday = 1, ... Sunday = 6
   */
  const mondayBasedWeekDay = (firstDay.getDay() + 6) % 7;
  const startDate = addDays(firstDay, -mondayBasedWeekDay);

  return Array.from({ length: 42 }).map((_, index) =>
    addDays(startDate, index)
  );
}

function getMealPlanTotals(dayPlan: MealPlanForDay) {
  const meals = SLOT_ORDER.map((slot) => dayPlan[slot]).filter(
    Boolean
  ) as MealRecipe[];

  return meals.reduce(
    (acc, meal) => {
      acc.carbs += safeNumber(meal.totalCarbohydrateG);
      acc.protein += safeNumber(meal.totalProteinG);
      acc.fat += safeNumber(meal.totalFatG);
      acc.calories += safeNumber(meal.totalEnergyKcal);
      acc.count += 1;
      return acc;
    },
    {
      carbs: 0,
      protein: 0,
      fat: 0,
      calories: 0,
      count: 0,
    }
  );
}

function getCalendarStatus(
  dayPlan: MealPlanForDay | undefined,
  targets: {
    carbs: number;
    protein: number;
    fat: number;
  }
): {
  status: CalendarNutritionStatus;
  progress: number;
} {
  if (!dayPlan) {
    return {
      status: 'none',
      progress: 0,
    };
  }

  const totals = getMealPlanTotals(dayPlan);

  if (totals.count === 0) {
    return {
      status: 'none',
      progress: 0,
    };
  }

  const carbRatio = totals.carbs / Math.max(targets.carbs, 1);
  const proteinRatio = totals.protein / Math.max(targets.protein, 1);
  const fatRatio = totals.fat / Math.max(targets.fat, 1);

  const averageRatio = (carbRatio + proteinRatio + fatRatio) / 3;

  if (averageRatio > 1.15) {
    return {
      status: 'tooMuch',
      progress: Math.min(averageRatio, 1),
    };
  }

  if (averageRatio < 0.75) {
    return {
      status: 'tooLittle',
      progress: Math.max(averageRatio, 0.18),
    };
  }

  return {
    status: 'good',
    progress: Math.min(averageRatio, 1),
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

function NutritionRing({
  value,
  target,
  color,
  label,
}: {
  value: number;
  target: number;
  color: string;
  label: string;
}) {
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
          <Circle
            stroke="#E5E7EB"
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
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
  onPress,
}: {
  date: Date;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  status: CalendarNutritionStatus;
  progress: number;
  onPress: () => void;
}) {
  const hasStatus = status !== 'none';
  const statusColor = STATUS_COLORS[status];

  const size = 38;
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(progress, 1));

  return (
    <Pressable style={styles.calendarCell} onPress={onPress}>
      <View style={styles.calendarDateWrap}>
        {hasStatus && !isSelected ? (
          <>
            <Svg width={size} height={size} style={styles.calendarRingSvg}>
              <Circle
                stroke="#F1F5F9"
                fill="none"
                cx={size / 2}
                cy={size / 2}
                r={radius}
                strokeWidth={strokeWidth}
              />

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
              <Text
                style={[
                  styles.calendarDateText,
                  !isCurrentMonth && styles.calendarDateMuted,
                  isToday && styles.calendarDateTodayText,
                ]}
              >
                {date.getDate()}
              </Text>
            </View>
          </>
        ) : (
          <View
            style={[
              styles.calendarDateCircle,
              isToday && styles.calendarDateToday,
              isSelected && styles.calendarDateSelected,
            ]}
          >
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

        {hasStatus && (
          <View
            style={[
              styles.calendarNutritionDot,
              { backgroundColor: statusColor },
            ]}
          />
        )}
      </View>
    </Pressable>
  );
}

export default function MealScreen() {
  const navigation = useNavigation<any>();

  const { activeChild, getOwnerKey, nutritionNeeds } = useChildProfile();

  const ownerKey = getOwnerKey();

  const today = useMemo(() => new Date(), []);

  const [selectedDate, setSelectedDate] = useState(today);
  const [calendarMonth, setCalendarMonth] = useState(today);
  const [showCalendar, setShowCalendar] = useState(false);

  const [keyword, setKeyword] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [suggestions, setSuggestions] = useState<MealRecipe[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [allMealPlans, setAllMealPlans] = useState<
    Record<string, Record<string, MealPlanForDay>>
  >({});
  const [mealPlansLoaded, setMealPlansLoaded] = useState(false);

  const selectedKey = formatDateKey(selectedDate);
  const todayKey = formatDateKey(today);

  const mealPlans = allMealPlans[ownerKey] || {};
  const selectedDayPlan: MealPlanForDay = mealPlans[selectedKey] || {};

  const currentTargets = {
    carbs: nutritionNeeds?.carbs || DEFAULT_TARGETS.carbs,
    protein: nutritionNeeds?.protein || DEFAULT_TARGETS.protein,
    fat: nutritionNeeds?.fat || DEFAULT_TARGETS.fat,
  };

  const dateTabs = useMemo(
    () => getCenteredSevenDays(selectedDate),
    [selectedDate]
  );

  const calendarDays = useMemo(
    () => getMonthDays(calendarMonth),
    [calendarMonth]
  );

  const calendarWeeks = useMemo(() => {
    const weeks: Date[][] = [];

    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }

    return weeks;
  }, [calendarDays]);

  const totals = useMemo(() => {
    return getMealPlanTotals(selectedDayPlan);
  }, [selectedDayPlan]);

  useEffect(() => {
    const loadStoredMealPlans = async () => {
      try {
        const raw = await AsyncStorage.getItem(MEAL_PLANS_STORAGE_KEY);

        if (raw) {
          setAllMealPlans(JSON.parse(raw));
        }
      } catch (error) {
        console.log('Load meal plans failed:', error);
      } finally {
        setMealPlansLoaded(true);
      }
    };

    loadStoredMealPlans();
  }, []);

  useEffect(() => {
    if (!mealPlansLoaded) return;

    const saveMealPlans = async () => {
      try {
        await AsyncStorage.setItem(
          MEAL_PLANS_STORAGE_KEY,
          JSON.stringify(allMealPlans)
        );

        await generateShoppingListByOwner(allMealPlans);
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
    updater: (
      prev: Record<string, MealPlanForDay>
    ) => Record<string, MealPlanForDay>
  ) => {
    setAllMealPlans((prev) => {
      const currentOwnerPlans = prev[ownerKey] || {};

      return {
        ...prev,
        [ownerKey]: updater(currentOwnerPlans),
      };
    });
  };

  const addMealToPlan = (meal: MealRecipe) => {
    updateCurrentOwnerMealPlans((prev) => {
      const current = prev[selectedKey] || {};

      const existingMealIds = SLOT_ORDER.map(
        (slot) => current[slot]?.idMeal
      ).filter(Boolean);

      if (existingMealIds.includes(meal.idMeal)) {
        Alert.alert('Already Added', 'This recipe is already in your meal plan.');
        return prev;
      }

      const emptySlot = SLOT_ORDER.find((slot) => !current[slot]);

      if (!emptySlot) {
        Alert.alert('Meal Plan Full', 'You already have 4 meals for this day.');
        return prev;
      }

      return {
        ...prev,
        [selectedKey]: {
          ...current,
          [emptySlot]: meal,
        },
      };
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

      return {
        ...prev,
        [selectedKey]: current,
      };
    });
  };

  const replaceMealInSlot = (slot: MealSlotKey, meal: MealRecipe) => {
    updateCurrentOwnerMealPlans((prev) => ({
      ...prev,
      [selectedKey]: {
        ...(prev[selectedKey] || {}),
        [slot]: meal,
      },
    }));

    setKeyword('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchError('');
  };

  const clearSelectedDayPlan = () => {
    updateCurrentOwnerMealPlans((prev) => ({
      ...prev,
      [selectedKey]: {},
    }));
  };

  const openRecipeDetail = (meal: MealRecipe) => {
    navigation.navigate('RecipeDetail', { meal });
  };

  const openYoutube = async (url?: string | null) => {
    if (!url) {
      Alert.alert('No Tutorial', 'This recipe does not have a tutorial link.');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot Open Link', 'Unable to open the tutorial link.');
      }
    } catch (error) {
      console.log('Open tutorial failed:', error);
      Alert.alert('Error', 'Unable to open the tutorial link.');
    }
  };

  const selectCalendarDate = (date: Date) => {
    setSelectedDate(date);
    setCalendarMonth(date);
    setShowCalendar(false);
  };

  const goToday = () => {
    const nextToday = new Date();
    setSelectedDate(nextToday);
    setCalendarMonth(nextToday);
    setShowCalendar(false);
  };

  const renderSuggestion = (meal: MealRecipe) => {
    return (
      <View key={meal.idMeal} style={styles.suggestionItem}>
        <Pressable
          style={styles.suggestionMain}
          onPress={() => openRecipeDetail(meal)}
        >
          {meal.strMealThumb ? (
            <Image source={{ uri: meal.strMealThumb }} style={styles.suggestionImage} />
          ) : (
            <View style={styles.suggestionImageFallback}>
              <Text style={styles.fallbackEmoji}>🍽️</Text>
            </View>
          )}

          <View style={styles.suggestionContent}>
            <Text style={styles.suggestionTitle} numberOfLines={2}>
              {meal.strMeal}
            </Text>

            <Text style={styles.suggestionMeta}>
              {meal.strCategory || 'Recipe'} · {meal.strArea || 'Meal'}
            </Text>

            <Text style={styles.suggestionNutrition}>
              {round(meal.totalEnergyKcal)} kcal · P {round(meal.totalProteinG)}g
              · C {round(meal.totalCarbohydrateG)}g · F {round(meal.totalFatG)}g
            </Text>
          </View>
        </Pressable>

        <View style={styles.suggestionActions}>
          <Pressable
            style={[styles.suggestionButton, styles.suggestionViewButton]}
            onPress={() => openRecipeDetail(meal)}
          >
            <Ionicons name="book-outline" size={15} color="#3BA76D" />
            <Text style={[styles.suggestionButtonText, { color: '#3BA76D' }]}>
              View
            </Text>
          </Pressable>

          <Pressable
            style={[styles.suggestionButton, styles.suggestionWatchButton]}
            onPress={() => openYoutube(meal.strYoutube)}
          >
            <Ionicons name="logo-youtube" size={15} color="#FF3B30" />
            <Text style={[styles.suggestionButtonText, { color: '#FF3B30' }]}>
              Watch
            </Text>
          </Pressable>

          <Pressable
            style={styles.suggestionAddButton}
            onPress={() => addMealToPlan(meal)}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.suggestionAddText}>Add</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderMealCard = (slot: MealSlotKey, meal: MealRecipe) => {
    return (
      <View key={`${slot}-${meal.idMeal}`} style={styles.mealSection}>
        <View style={styles.mealSectionHeader}>
          <View>
            <Text style={styles.mealSectionTitle}>{slot}</Text>
            <Text style={styles.mealSectionSub}>1 meal</Text>
          </View>

          <Pressable
            style={styles.smallIconButton}
            onPress={() => deleteMealFromPlan(slot)}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </Pressable>
        </View>

        <View style={styles.mealCard}>
          {meal.strMealThumb ? (
            <Image source={{ uri: meal.strMealThumb }} style={styles.mealImage} />
          ) : (
            <View style={styles.mealImageFallback}>
              <Text style={styles.fallbackEmoji}>🍽️</Text>
            </View>
          )}

          <View style={styles.mealContent}>
            <Text style={styles.mealTitle} numberOfLines={2}>
              {meal.strMeal}
            </Text>

            <View style={styles.macroTagRow}>
              <View style={[styles.macroTag, styles.macroCarb]}>
                <Text style={[styles.macroTagText, { color: '#F97316' }]}>
                  {round(meal.totalCarbohydrateG)}g carbs
                </Text>
              </View>

              <View style={[styles.macroTag, styles.macroProtein]}>
                <Text style={[styles.macroTagText, { color: '#2563EB' }]}>
                  {round(meal.totalProteinG)}g protein
                </Text>
              </View>

              <View style={[styles.macroTag, styles.macroFat]}>
                <Text style={[styles.macroTagText, { color: '#16A34A' }]}>
                  {round(meal.totalFatG)}g fat
                </Text>
              </View>
            </View>

            <View style={styles.mealButtonRow}>
              <Pressable
                style={[styles.actionButton, styles.viewButton]}
                onPress={() => openRecipeDetail(meal)}
              >
                <Ionicons name="book-outline" size={16} color="#3BA76D" />
                <Text style={[styles.actionButtonText, { color: '#3BA76D' }]}>
                  View Recipe
                </Text>
              </Pressable>

              <Pressable
                style={[styles.actionButton, styles.watchButton]}
                onPress={() => openYoutube(meal.strYoutube)}
              >
                <Ionicons name="logo-youtube" size={16} color="#FF3B30" />
                <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>
                  Watch Tutorial
                </Text>
              </Pressable>
            </View>

            {suggestions.length > 0 && (
              <Pressable
                style={styles.replaceLink}
                onPress={() => {
                  const candidate = suggestions.find(
                    (item) => item.idMeal !== meal.idMeal
                  );

                  if (candidate) {
                    replaceMealInSlot(slot, candidate);
                  } else {
                    Alert.alert(
                      'No Alternative',
                      'Search another recipe to replace this one.'
                    );
                  }
                }}
              >
                <Ionicons name="swap-horizontal" size={16} color={colors.primaryDark} />
                <Text style={styles.replaceLinkText}>Replace meal</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Screen padded={false}>
      <Header
        title="Meal Plan"
        subtitle={
          activeChild
            ? `${activeChild.nickname}'s meal plan`
            : 'Guest meal plan'
        }
        icon="restaurant"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.searchOuterCard}>
          <View style={styles.searchInnerCard}>
            <Ionicons name="search" size={20} color="#63B987" />

            <TextInput
              value={keyword}
              onChangeText={(text) => {
                setKeyword(text);
                setShowSuggestions(true);
              }}
              placeholder="Search recipes..."
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              returnKeyType="search"
            />

            {keyword.length > 0 && (
              <Pressable
                style={styles.searchClear}
                onPress={() => {
                  setKeyword('');
                  setSuggestions([]);
                  setSearchError('');
                  setShowSuggestions(false);
                }}
              >
                <Ionicons name="close" size={18} color="#94A3B8" />
              </Pressable>
            )}
          </View>

          {keyword.trim().length > 0 && showSuggestions && (
            <View style={styles.suggestionBox}>
              {searchLoading ? (
                <View style={styles.suggestionStatus}>
                  <ActivityIndicator size="small" color={colors.primaryDark} />
                  <Text style={styles.suggestionStatusText}>Searching recipes...</Text>
                </View>
              ) : searchError ? (
                <View style={styles.suggestionStatus}>
                  <Ionicons name="warning-outline" size={18} color="#B91C1C" />
                  <Text style={styles.suggestionErrorText}>{searchError}</Text>
                </View>
              ) : suggestions.length > 0 ? (
                suggestions.map(renderSuggestion)
              ) : (
                <View style={styles.suggestionStatus}>
                  <Text style={styles.suggestionStatusText}>
                    No matching recipes found
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.dateContainer}>
          <View style={styles.dateTopRow}>
            <View>
              <Text style={styles.dateTitle}>
                {selectedDate.toLocaleDateString('en-MY', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
              <Text style={styles.dateSubtitle}>
                Plan your meals for this day
              </Text>
            </View>

            <Pressable
              style={styles.calendarButton}
              onPress={() => setShowCalendar(true)}
            >
              <Ionicons name="calendar-outline" size={17} color={colors.primaryDark} />
              <Text style={styles.calendarButtonText}>Calendar</Text>
            </Pressable>
          </View>

          <View style={styles.fixedDateRow}>
            {dateTabs.map((date) => {
              const key = formatDateKey(date);
              const isSelected = key === selectedKey;
              const isToday = key === todayKey;

              return (
                <Pressable
                  key={key}
                  style={[styles.dateCard, isSelected && styles.dateCardActive]}
                  onPress={() => setSelectedDate(date)}
                >
                  <Text style={[styles.dateDay, isSelected && styles.dateTextActive]}>
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>

                  <Text style={[styles.dateNumber, isSelected && styles.dateTextActive]}>
                    {date.getDate()}
                  </Text>

                  {isToday && (
                    <Text
                      style={[
                        styles.dateToday,
                        isSelected ? styles.dateTodayActive : undefined,
                      ]}
                    >
                      Today
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.nutritionCard}>
          <View style={styles.nutritionHeaderRow}>
            <View>
              <Text style={styles.nutritionTitle}>Today's Nutrition</Text>
              <Text style={styles.nutritionSubtitle}>
                {activeChild
                  ? 'Targets loaded from child profile'
                  : 'Guest default targets'}
              </Text>
            </View>

            <Text style={styles.nutritionProgressText}>Progress</Text>
          </View>

          <View style={styles.ringRow}>
            <NutritionRing
              label="Carbs"
              value={totals.carbs}
              target={currentTargets.carbs}
              color="#F39B5F"
            />
            <NutritionRing
              label="Protein"
              value={totals.protein}
              target={currentTargets.protein}
              color="#72C3E6"
            />
            <NutritionRing
              label="Fat"
              value={totals.fat}
              target={currentTargets.fat}
              color="#56B277"
            />
          </View>
        </View>

        <View style={styles.planWrapper}>
          <View style={styles.planHeaderRow}>
            <Text style={styles.planTitle}>Meal Plan</Text>

            <Pressable style={styles.refreshButton} onPress={clearSelectedDayPlan}>
              <Ionicons name="refresh" size={18} color="#64748B" />
            </Pressable>
          </View>

          <Text style={styles.planShoppingText}>☑ View ingredients in Shopping</Text>

          <View style={styles.preferenceBanner}>
            <Text style={styles.preferenceBannerText}>
              ✓ Meals adapted to preferences:
            </Text>
          </View>

          {SLOT_ORDER.some((slot) => !!selectedDayPlan[slot]) ? (
            SLOT_ORDER.filter((slot) => !!selectedDayPlan[slot]).map((slot) =>
              renderMealCard(slot, selectedDayPlan[slot] as MealRecipe)
            )
          ) : (
            <View style={styles.emptyMealPlanCard}>
              <Text style={styles.emptyMealPlanEmoji}>🍽️</Text>
              <Text style={styles.emptyMealPlanTitle}>No meals added yet</Text>
              <Text style={styles.emptyMealPlanText}>
                Type a recipe name above, then add a result to this day.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <Pressable
          style={styles.calendarBackdrop}
          onPress={() => setShowCalendar(false)}
        >
          <Pressable style={styles.calendarModal} onPress={() => {}}>
            <View style={styles.calendarHero}>
              <View>
                <Text style={styles.calendarHeroLabel}>Select date</Text>
                <Text style={styles.calendarHeroTitle}>
                  {calendarMonth.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>

              <Pressable
                style={styles.calendarCloseButton}
                onPress={() => setShowCalendar(false)}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.calendarMonthRow}>
              <Pressable
                style={styles.calendarNavButton}
                onPress={() =>
                  setCalendarMonth(
                    new Date(
                      calendarMonth.getFullYear(),
                      calendarMonth.getMonth() - 1,
                      1
                    )
                  )
                }
              >
                <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
              </Pressable>

              <Pressable style={styles.calendarTodayButton} onPress={goToday}>
                <Ionicons name="sunny-outline" size={16} color={colors.primaryDark} />
                <Text style={styles.calendarTodayText}>Today</Text>
              </Pressable>

              <Pressable
                style={styles.calendarNavButton}
                onPress={() =>
                  setCalendarMonth(
                    new Date(
                      calendarMonth.getFullYear(),
                      calendarMonth.getMonth() + 1,
                      1
                    )
                  )
                }
              >
                <Ionicons name="chevron-forward" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <Text key={day} style={styles.weekText}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarWeeks.map((week, weekIndex) => (
                <View key={`week-${weekIndex}`} style={styles.calendarWeekRow}>
                  {week.map((date) => {
                    const key = formatDateKey(date);
                    const isCurrentMonth =
                      date.getMonth() === calendarMonth.getMonth();
                    const isSelected = key === selectedKey;
                    const isToday = key === todayKey;
                    const dayPlan = mealPlans[key];
                    const statusInfo = getCalendarStatus(
                      dayPlan,
                      currentTargets
                    );

                    return (
                      <CalendarDateCell
                        key={key}
                        date={date}
                        isCurrentMonth={isCurrentMonth}
                        isSelected={isSelected}
                        isToday={isToday}
                        status={statusInfo.status}
                        progress={statusInfo.progress}
                        onPress={() => selectCalendarDate(date)}
                      />
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={styles.calendarFooter}>
              <View style={styles.calendarLegendItem}>
                <View
                  style={[
                    styles.calendarLegendStatusDot,
                    { backgroundColor: STATUS_COLORS.tooMuch },
                  ]}
                />
                <Text style={styles.calendarLegendText}>Too much</Text>
              </View>

              <View style={styles.calendarLegendItem}>
                <View
                  style={[
                    styles.calendarLegendStatusDot,
                    { backgroundColor: STATUS_COLORS.good },
                  ]}
                />
                <Text style={styles.calendarLegendText}>Good</Text>
              </View>

              <View style={styles.calendarLegendItem}>
                <View
                  style={[
                    styles.calendarLegendStatusDot,
                    { backgroundColor: STATUS_COLORS.tooLittle },
                  ]}
                />
                <Text style={styles.calendarLegendText}>Too little</Text>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 120,
    gap: 16,
  },

  searchOuterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  searchInnerCard: {
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: '#F4F6F4',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },

  searchClear: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  suggestionBox: {
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },

  suggestionStatus: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  suggestionStatusText: {
    color: colors.muted,
    fontWeight: '700',
  },

  suggestionErrorText: {
    flex: 1,
    color: '#B91C1C',
    fontWeight: '700',
  },

  suggestionItem: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },

  suggestionMain: {
    flexDirection: 'row',
    gap: 12,
  },

  suggestionImage: {
    width: 66,
    height: 66,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },

  suggestionImageFallback: {
    width: 66,
    height: 66,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  suggestionContent: {
    flex: 1,
  },

  suggestionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 20,
  },

  suggestionMeta: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12,
  },

  suggestionNutrition: {
    marginTop: 6,
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 17,
  },

  suggestionActions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },

  suggestionButton: {
    flex: 1,
    height: 38,
    borderRadius: 999,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
  },

  suggestionViewButton: {
    borderColor: '#3BA76D',
  },

  suggestionWatchButton: {
    borderColor: '#FF3B30',
  },

  suggestionButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },

  suggestionAddButton: {
    flex: 1,
    height: 38,
    borderRadius: 999,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  suggestionAddText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },

  dateContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  dateTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  dateTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1F2937',
  },

  dateSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },

  calendarButton: {
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EAF7F0',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  calendarButtonText: {
    color: colors.primaryDark,
    fontWeight: '900',
    fontSize: 12,
  },

  fixedDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },

  dateCard: {
    flex: 1,
    minHeight: 78,
    borderRadius: 15,
    backgroundColor: '#F7F7F5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },

  dateCardActive: {
    backgroundColor: '#57B56E',
  },

  dateDay: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1F3B5A',
  },

  dateNumber: {
    marginTop: 4,
    fontSize: 21,
    lineHeight: 24,
    fontWeight: '900',
    color: '#334155',
  },

  dateTextActive: {
    color: '#FFFFFF',
  },

  dateToday: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: '800',
    color: '#57B56E',
  },

  dateTodayActive: {
    color: '#FFFFFF',
  },

  nutritionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  nutritionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  nutritionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1F2937',
  },

  nutritionSubtitle: {
    marginTop: 3,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },

  nutritionProgressText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },

  ringRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  ringBlock: {
    alignItems: 'center',
    flex: 1,
  },

  ringWrap: {
    width: 86,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  ringValueText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1F2937',
  },

  ringLabel: {
    marginTop: 6,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },

  ringTarget: {
    marginTop: 2,
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },

  planWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  planTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },

  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  planShoppingText: {
    marginTop: 10,
    color: '#4EA96B',
    fontSize: 14,
    fontWeight: '600',
  },

  preferenceBanner: {
    marginTop: 14,
    backgroundColor: '#E7F4EA',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },

  preferenceBannerText: {
    color: '#2E8B57',
    fontWeight: '700',
    fontSize: 14,
  },

  emptyMealPlanCard: {
    marginTop: 18,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    padding: 24,
    alignItems: 'center',
  },

  emptyMealPlanEmoji: {
    fontSize: 40,
  },

  emptyMealPlanTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '900',
    color: '#1F2937',
  },

  emptyMealPlanText: {
    marginTop: 6,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  mealSection: {
    marginTop: 18,
  },

  mealSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  mealSectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },

  mealSectionSub: {
    marginTop: 2,
    fontSize: 13,
    color: '#64748B',
  },

  smallIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },

  mealCard: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 14,
    flexDirection: 'row',
    gap: 12,
  },

  mealImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },

  mealImageFallback: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fallbackEmoji: {
    fontSize: 30,
  },

  mealContent: {
    flex: 1,
  },

  mealTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 22,
  },

  macroTagRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  macroTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  macroCarb: {
    backgroundColor: '#FFF1E8',
  },

  macroProtein: {
    backgroundColor: '#EEF4FF',
  },

  macroFat: {
    backgroundColor: '#EAF8EE',
  },

  macroTagText: {
    fontSize: 12,
    fontWeight: '700',
  },

  mealButtonRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },

  actionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
  },

  viewButton: {
    borderColor: '#3BA76D',
  },

  watchButton: {
    borderColor: '#FF3B30',
  },

  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },

  replaceLink: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  replaceLinkText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },

  calendarBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  calendarModal: {
    width: '100%',
    maxWidth: 392,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },

  calendarHero: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  calendarHeroLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },

  calendarHeroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },

  calendarCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendarMonthRow: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  calendarNavButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendarTodayButton: {
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  calendarTodayText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },

  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 8,
  },

  weekText: {
    flex: 1,
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '900',
  },

  calendarGrid: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },

  calendarWeekRow: {
    flexDirection: 'row',
    width: '100%',
    height: 48,
  },

  calendarCell: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendarDateWrap: {
    width: 42,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendarRingSvg: {
    position: 'absolute',
  },

  calendarRingNumber: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendarDateCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendarDateToday: {
    borderWidth: 1.8,
    borderColor: colors.primaryDark,
    backgroundColor: '#FFFFFF',
  },

  calendarDateSelected: {
    backgroundColor: colors.primaryDark,
    borderWidth: 0,
  },

  calendarDateText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '800',
  },

  calendarDateMuted: {
    color: '#CBD5E1',
  },

  calendarDateTodayText: {
    color: colors.primaryDark,
    fontWeight: '900',
  },

  calendarDateTextSelected: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  calendarNutritionDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 1,
  },

  calendarFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },

  calendarLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  calendarLegendStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  legendTodayDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primaryDark,
    backgroundColor: '#FFFFFF',
  },

  legendSelectedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primaryDark,
  },

  calendarLegendText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
});