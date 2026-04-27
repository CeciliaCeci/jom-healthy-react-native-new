import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Header, Screen } from '../components/Common';
import { colors } from '../theme/colors';
import { searchMeals } from '../services/api';

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
  energyKcal?: number;
  proteinG?: number;
  carbohydrateG?: number;
  fatG?: number;
};

type MealRecipe = {
  id: number;
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

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, offset: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function getSevenDays(centerDate: Date) {
  return [-3, -2, -1, 0, 1, 2, 3].map((offset) =>
    addDays(centerDate, offset)
  );
}

function round(value?: number) {
  return Math.round(Number(value || 0));
}

function getMonthDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startWeekDay = firstDay.getDay();
  const startDate = addDays(firstDay, -startWeekDay);

  return Array.from({ length: 42 }).map((_, index) =>
    addDays(startDate, index)
  );
}

export default function MealScreen() {
  const navigation = useNavigation<any>();

  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [calendarMonth, setCalendarMonth] = useState(today);
  const [showCalendar, setShowCalendar] = useState(false);

  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [results, setResults] = useState<MealRecipe[]>([]);

  const [mealPlans, setMealPlans] = useState<Record<string, MealRecipe[]>>({});

  const selectedKey = formatDateKey(selectedDate);
  const todayKey = formatDateKey(today);
  const dateMeals = mealPlans[selectedKey] || [];

  const dateTabs = useMemo(() => getSevenDays(selectedDate), [selectedDate]);
  const calendarDays = useMemo(
    () => getMonthDays(calendarMonth),
    [calendarMonth]
  );

  const totals = useMemo(() => {
    return dateMeals.reduce(
      (acc, meal) => {
        acc.calories += Number(meal.totalEnergyKcal || 0);
        acc.protein += Number(meal.totalProteinG || 0);
        acc.carbs += Number(meal.totalCarbohydrateG || 0);
        acc.fat += Number(meal.totalFatG || 0);
        return acc;
      },
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      }
    );
  }, [dateMeals]);

  const handleSearch = async () => {
    const query = keyword.trim();

    if (!query) {
      setSearchError('Please enter a recipe keyword.');
      return;
    }

    setLoading(true);
    setSearchError('');

    const result = await searchMeals(query);

    if (!result.ok) {
      setResults([]);
      setSearchError(result.message);
      setLoading(false);
      return;
    }

    const list = Array.isArray(result.data?.data) ? result.data.data : [];
    setResults(list);
    setLoading(false);
  };

  const addMealToPlan = (meal: MealRecipe) => {
    setMealPlans((prev) => {
      const current = prev[selectedKey] || [];
      const exists = current.some((item) => item.idMeal === meal.idMeal);

      if (exists) {
        return prev;
      }

      return {
        ...prev,
        [selectedKey]: [...current, meal],
      };
    });
  };

  const deleteMealFromPlan = (mealId: string) => {
    setMealPlans((prev) => {
      const current = prev[selectedKey] || [];

      return {
        ...prev,
        [selectedKey]: current.filter((meal) => meal.idMeal !== mealId),
      };
    });
  };

  const replaceMeal = (oldMealId: string, newMeal: MealRecipe) => {
    setMealPlans((prev) => {
      const current = prev[selectedKey] || [];

      return {
        ...prev,
        [selectedKey]: current.map((meal) =>
          meal.idMeal === oldMealId ? newMeal : meal
        ),
      };
    });
  };

  const openRecipeDetail = (meal: MealRecipe) => {
    navigation.navigate('RecipeDetail', { meal });
  };

  const goPrevMonth = () => {
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
    );
  };

  const goNextMonth = () => {
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
    );
  };

  const selectCalendarDate = (date: Date) => {
    setSelectedDate(date);
    setCalendarMonth(date);
    setShowCalendar(false);
  };

  return (
    <Screen padded={false}>
      <Header
        title="Meal Plan"
        subtitle="Search recipes and build daily plans"
        icon="restaurant"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dateHeaderRow}>
          <Text style={styles.dateHeaderTitle}>
            {selectedDate.toLocaleDateString('en-MY', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>

          <Pressable
            style={styles.calendarButton}
            onPress={() => setShowCalendar(true)}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.calendarButtonText}>Calendar</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateRow}
        >
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

                <Text
                  style={[styles.dateNumber, isSelected && styles.dateTextActive]}
                >
                  {date.getDate()}
                </Text>

                <Text style={[styles.dateMonth, isSelected && styles.dateTextActive]}>
                  {date.toLocaleDateString('en-US', { month: 'short' })}
                </Text>

                {isToday && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayText}>Today</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.nutritionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Today's Nutrition</Text>
            <Text style={styles.cardSubtitle}>{dateMeals.length} meals</Text>
          </View>

          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{round(totals.calories)}</Text>
              <Text style={styles.nutritionLabel}>kcal</Text>
            </View>

            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{round(totals.protein)}g</Text>
              <Text style={styles.nutritionLabel}>Protein</Text>
            </View>

            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{round(totals.carbs)}g</Text>
              <Text style={styles.nutritionLabel}>Carbs</Text>
            </View>

            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{round(totals.fat)}g</Text>
              <Text style={styles.nutritionLabel}>Fat</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchCard}>
          <Text style={styles.sectionTitle}>Search Recipes</Text>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={20} color={colors.primaryDark} />

            <TextInput
              value={keyword}
              onChangeText={setKeyword}
              placeholder="Search recipe e.g. banana, chicken"
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />

            {keyword.length > 0 && (
              <Pressable
                style={styles.clearButton}
                onPress={() => {
                  setKeyword('');
                  setResults([]);
                  setSearchError('');
                }}
              >
                <Ionicons name="close" size={18} color={colors.muted} />
              </Pressable>
            )}

            <Pressable style={styles.searchButton} onPress={handleSearch}>
              <Text style={styles.searchButtonText}>Search</Text>
            </Pressable>
          </View>

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primaryDark} />
              <Text style={styles.loadingText}>Searching recipes...</Text>
            </View>
          )}

          {!!searchError && !loading && (
            <View style={styles.errorBox}>
              <Ionicons name="warning-outline" size={18} color="#B91C1C" />
              <Text style={styles.errorText}>{searchError}</Text>
            </View>
          )}
        </View>

        {dateMeals.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Meal Plan for Selected Date</Text>

            {dateMeals.map((meal) => (
              <View key={meal.idMeal} style={styles.mealPlanCard}>
                <Pressable
                  style={styles.mealMain}
                  onPress={() => openRecipeDetail(meal)}
                >
                  {meal.strMealThumb ? (
                    <Image source={{ uri: meal.strMealThumb }} style={styles.mealImage} />
                  ) : (
                    <View style={styles.mealImageFallback}>
                      <Text style={styles.fallbackEmoji}>🍽️</Text>
                    </View>
                  )}

                  <View style={styles.mealInfo}>
                    <Text style={styles.mealTitle} numberOfLines={2}>
                      {meal.strMeal}
                    </Text>

                    <Text style={styles.mealMeta}>
                      {meal.strCategory || 'Recipe'} · {meal.strArea || 'Meal'}
                    </Text>

                    <Text style={styles.mealNutrition}>
                      {round(meal.totalEnergyKcal)} kcal · P{' '}
                      {round(meal.totalProteinG)}g · C{' '}
                      {round(meal.totalCarbohydrateG)}g · F{' '}
                      {round(meal.totalFatG)}g
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.muted}
                  />
                </Pressable>

                <View style={styles.mealActions}>
                  <Pressable
                    style={styles.secondaryAction}
                    onPress={() => {
                      const candidate = results.find(
                        (item) => item.idMeal !== meal.idMeal
                      );
                      if (candidate) replaceMeal(meal.idMeal, candidate);
                    }}
                  >
                    <Ionicons
                      name="swap-horizontal"
                      size={16}
                      color={colors.primaryDark}
                    />
                    <Text style={styles.secondaryActionText}>Replace</Text>
                  </Pressable>

                  <Pressable
                    style={styles.deleteAction}
                    onPress={() => deleteMealFromPlan(meal.idMeal)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={styles.deleteActionText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <View>
          <Text style={styles.sectionTitle}>Search Results</Text>

          {results.length === 0 && !loading ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>Search for recipes</Text>
              <Text style={styles.emptyText}>
                Results from your meal database will appear here.
              </Text>
            </View>
          ) : (
            results.map((meal) => (
              <View key={meal.idMeal} style={styles.resultCard}>
                <Pressable
                  style={styles.mealMain}
                  onPress={() => openRecipeDetail(meal)}
                >
                  {meal.strMealThumb ? (
                    <Image
                      source={{ uri: meal.strMealThumb }}
                      style={styles.resultImage}
                    />
                  ) : (
                    <View style={styles.resultImageFallback}>
                      <Text style={styles.fallbackEmoji}>🍽️</Text>
                    </View>
                  )}

                  <View style={styles.mealInfo}>
                    <Text style={styles.mealTitle} numberOfLines={2}>
                      {meal.strMeal}
                    </Text>

                    <Text style={styles.mealMeta}>
                      {meal.strCategory || 'Recipe'} · {meal.strArea || 'Meal'}
                    </Text>

                    <Text style={styles.mealNutrition}>
                      {round(meal.totalEnergyKcal)} kcal · Protein{' '}
                      {round(meal.totalProteinG)}g
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.muted}
                  />
                </Pressable>

                <Pressable
                  style={styles.addButton}
                  onPress={() => addMealToPlan(meal)}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>Add to Plan</Text>
                </Pressable>
              </View>
            ))
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
            <View style={styles.calendarHeader}>
              <Pressable style={styles.monthButton} onPress={goPrevMonth}>
                <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
              </Pressable>

              <Text style={styles.calendarTitle}>
                {calendarMonth.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>

              <Pressable style={styles.monthButton} onPress={goNextMonth}>
                <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <Text key={day} style={styles.weekText}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((date) => {
                const key = formatDateKey(date);
                const isCurrentMonth =
                  date.getMonth() === calendarMonth.getMonth();
                const isSelected = key === selectedKey;
                const isToday = key === todayKey;

                return (
                  <Pressable
                    key={key}
                    style={[
                      styles.calendarDate,
                      isSelected && styles.calendarDateSelected,
                    ]}
                    onPress={() => selectCalendarDate(date)}
                  >
                    <Text
                      style={[
                        styles.calendarDateText,
                        !isCurrentMonth && styles.calendarDateMuted,
                        isSelected && styles.calendarDateTextSelected,
                      ]}
                    >
                      {date.getDate()}
                    </Text>

                    {isToday && !isSelected && <View style={styles.todayDot} />}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 120,
    gap: 18,
  },

  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dateHeaderTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 18,
  },

  calendarButton: {
    height: 38,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  calendarButtonText: {
    color: colors.primaryDark,
    fontWeight: '900',
    fontSize: 13,
  },

  dateRow: {
    gap: 10,
  },

  dateCard: {
    width: 72,
    height: 94,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  dateCardActive: {
    backgroundColor: colors.primaryDark,
  },

  dateDay: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '700',
  },

  dateNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    marginTop: 3,
  },

  dateMonth: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '700',
    marginTop: 2,
  },

  dateTextActive: {
    color: '#FFFFFF',
  },

  todayBadge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  todayText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '800',
  },

  nutritionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  cardTitle: {
    fontSize: 20,
    color: colors.text,
    fontWeight: '900',
  },

  cardSubtitle: {
    color: colors.muted,
    fontWeight: '700',
  },

  nutritionGrid: {
    flexDirection: 'row',
    gap: 10,
  },

  nutritionItem: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },

  nutritionValue: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },

  nutritionLabel: {
    marginTop: 4,
    fontSize: 11,
    color: colors.muted,
  },

  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 12,
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 18,
    paddingHorizontal: 12,
    minHeight: 54,
    gap: 8,
  },

  searchInput: {
    flex: 1,
    color: colors.text,
  },

  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2F7',
  },

  searchButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  loadingRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  loadingText: {
    color: colors.muted,
    fontWeight: '700',
  },

  errorBox: {
    marginTop: 14,
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  errorText: {
    color: '#B91C1C',
    fontWeight: '700',
    flex: 1,
  },

  mealPlanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  mealMain: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },

  mealImage: {
    width: 76,
    height: 76,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
  },

  mealImageFallback: {
    width: 76,
    height: 76,
    borderRadius: 18,
    backgroundColor: '#EAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  resultImage: {
    width: 84,
    height: 84,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },

  resultImageFallback: {
    width: 84,
    height: 84,
    borderRadius: 20,
    backgroundColor: '#EAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fallbackEmoji: {
    fontSize: 28,
  },

  mealInfo: {
    flex: 1,
  },

  mealTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 15,
  },

  mealMeta: {
    color: colors.muted,
    marginTop: 4,
    fontSize: 12,
  },

  mealNutrition: {
    color: colors.primaryDark,
    marginTop: 6,
    fontSize: 12,
    fontWeight: '800',
  },

  addButton: {
    marginTop: 12,
    backgroundColor: colors.primaryDark,
    height: 42,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  mealActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },

  secondaryAction: {
    flex: 1,
    height: 40,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  secondaryActionText: {
    color: colors.primaryDark,
    fontWeight: '900',
  },

  deleteAction: {
    flex: 1,
    height: 40,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  deleteActionText: {
    color: '#EF4444',
    fontWeight: '900',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },

  emptyEmoji: {
    fontSize: 40,
  },

  emptyTitle: {
    marginTop: 10,
    color: colors.text,
    fontWeight: '900',
    fontSize: 17,
  },

  emptyText: {
    marginTop: 6,
    color: colors.muted,
    textAlign: 'center',
  },

  calendarBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  calendarModal: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#1F2937',
    borderRadius: 24,
    padding: 18,
  },

  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  monthButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  calendarTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },

  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },

  weekText: {
    flex: 1,
    color: '#D1D5DB',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  calendarDate: {
    width: `${100 / 7}%`,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendarDateSelected: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
  },

  calendarDateText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  calendarDateMuted: {
    color: '#6B7280',
  },

  calendarDateTextSelected: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#60A5FA',
    marginTop: 2,
  },
});