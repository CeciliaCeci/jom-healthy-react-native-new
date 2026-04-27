import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useChildProfile } from '../context/ChildProfileContext';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/colors';
import { Card, Chip, EmptyState, Header, IconButton, PrimaryButton, Screen, SecondaryButton, SectionTitle } from '../components/Common';
import LanguageModal from '../components/LanguageModal';
import { getFoodNutritionNeeds } from '../services/api';

const mealIcons = { breakfast: '🍳', lunch: '🍱', dinner: '🍲', snack: '🥤' } as const;
const mealLabels = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' } as const;

const pad2 = (value: number) => String(value).padStart(2, '0');
const toDateKey = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const fromDateKey = (dateString: string) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const addDays = (dateString: string, days: number) => {
  const date = fromDateKey(dateString);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};

const getAgeMonths = (child: any) => {
  if (child?.birthday) {
    const parts = String(child.birthday).replace(/-/g, '/').split('/').map(Number);
    if (parts.length === 3 && parts.every(Boolean)) {
      const birthday = new Date(parts[0], parts[1] - 1, parts[2]);
      const now = new Date();
      let months = (now.getFullYear() - birthday.getFullYear()) * 12 + (now.getMonth() - birthday.getMonth());
      if (now.getDate() < birthday.getDate()) months -= 1;
      return Math.max(0, months);
    }
  }
  return Math.max(0, Math.round(Number(child?.age || 0) * 12));
};

export default function MealScreen() {
  const navigation = useNavigation<any>();
  const { language, t } = useLanguage();
  const {
    activeChild,
    selectedDate,
    setSelectedDate,
    getMealsForDate,
    generateNewMealPlan,
    replaceMeal,
    deleteMeal,
    nutritionProgress,
    setNutritionNeeds,
  } = useChildProfile();
  const [showLanguage, setShowLanguage] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [query, setQuery] = useState('');
  const [loadingNeeds, setLoadingNeeds] = useState(false);
  const [nutritionNeedsError, setNutritionNeedsError] = useState('');
  const langCode = language === 'zh' ? 'ZH' : language === 'ms' ? 'MS' : 'EN';

  const dates = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const offset = index - 3;
      const key = addDays(selectedDate, offset);
      const date = fromDateKey(key);
      return {
        key,
        day: date.toLocaleDateString('en-MY', { weekday: 'short' }),
        date: date.getDate(),
        isToday: key === toDateKey(new Date()),
      };
    });
  }, [selectedDate]);

  const meals = getMealsForDate(selectedDate).filter((meal: any) => !query.trim() || meal.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (!activeChild) return;
    let mounted = true;

    const loadNutritionNeeds = async () => {
      setLoadingNeeds(true);
      setNutritionNeedsError('');

      const result = await getFoodNutritionNeeds({
        heightCm: Number(activeChild.height),
        weightKg: Number(activeChild.weight),
        ageMonths: getAgeMonths(activeChild),
        gender: activeChild.gender === 'boy' ? 1 : 2,
      });

      if (!mounted) return;

      if (!result.ok) {
        setNutritionNeedsError(result.message);
        setLoadingNeeds(false);
        return;
      }

      setNutritionNeeds(result.data);
      setLoadingNeeds(false);
    };

    loadNutritionNeeds();

    return () => {
      mounted = false;
    };
  }, [activeChild?.id, activeChild?.height, activeChild?.weight, activeChild?.birthday, activeChild?.age, activeChild?.gender]);


  const watchTutorial = (mealName: string) => {
    Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(`how to cook ${mealName}`)}`);
  };

  return (
    <>
      <Screen padded={false}>
        <Header
          title={t('mealPlan')}
          subtitle={activeChild ? `${activeChild.nickname}'s meals` : t('basedOnPreferences')}
          icon="restaurant"
          right={
            <Pressable style={styles.langButton} onPress={() => setShowLanguage(true)}>
              <Text style={styles.langText}>{langCode}</Text>
            </Pressable>
          }
        />
        <View style={styles.body}>
          {!activeChild ? (
            <EmptyState emoji="🍱" title="Please Select or Create a Child Profile" subtitle="Go to Profile to create or select a child before generating meal plans." action={<PrimaryButton title="Go to Profile" onPress={() => navigation.navigate('Profile')} />} />
          ) : (
            <>
              <Card>
                <View style={styles.searchWrap}>
                  <Ionicons name="search" size={18} color={colors.primaryDark} />
                  <TextInput value={query} onChangeText={setQuery} placeholder={t('searchRecipes')} style={styles.searchInput} />
                </View>
              </Card>

              <View style={styles.calendarRow}>
                <Text style={styles.selectedDateText}>{fromDateKey(selectedDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                <Pressable style={styles.calendarButton} onPress={() => setShowDatePicker((prev) => !prev)}>
                  <Ionicons name="calendar" size={18} color={colors.primaryDark} />
                  <Text style={styles.calendarButtonText}>Calendar</Text>
                </Pressable>
              </View>

              <CalendarModal
                visible={showDatePicker}
                selectedDate={selectedDate}
                onClose={() => setShowDatePicker(false)}
                onSelect={(dateKey) => {
                  setSelectedDate(dateKey);
                  setShowDatePicker(false);
                }}
              />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesScroll}>
                {dates.map((item) => (
                  <Pressable key={item.key} onPress={() => setSelectedDate(item.key)} style={[styles.dateChip, selectedDate === item.key && styles.dateChipActive]}>
                    <Text style={[styles.dateDay, selectedDate === item.key && styles.dateTextActive]}>{item.day}</Text>
                    <Text style={[styles.dateNum, selectedDate === item.key && styles.dateTextActive]}>{item.date}</Text>
                    {item.isToday && <Text style={[styles.todayText, selectedDate === item.key && styles.dateTextActive]}>Today</Text>}
                  </Pressable>
                ))}
              </ScrollView>

              <Card>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Today's Nutrition</Text>
                  {loadingNeeds ? <ActivityIndicator color={colors.primaryDark} /> : <Text style={styles.cardSubtitle}>API targets</Text>}
                </View>
                {!!nutritionNeedsError && (
                  <View style={styles.inlineErrorBox}>
                    <Ionicons name="wifi-outline" size={18} color="#EF4444" />
                    <Text style={styles.inlineErrorText}>{nutritionNeedsError}</Text>
                  </View>
                )}
                <View style={styles.nutritionGrid}>
                  <NutritionItem label="Calories" current={Math.round(nutritionProgress.calories.current)} target={Math.round(nutritionProgress.calories.target)} unit="kcal" />
                  <NutritionItem label="Carbs" current={Math.round(nutritionProgress.carbs.current)} target={Math.round(nutritionProgress.carbs.target)} unit="g" />
                  <NutritionItem label="Protein" current={Math.round(nutritionProgress.protein.current)} target={Math.round(nutritionProgress.protein.target)} unit="g" />
                  <NutritionItem label="Fat" current={Math.round(nutritionProgress.fat.current)} target={Math.round(nutritionProgress.fat.target)} unit="g" />
                </View>
              </Card>

              <View style={styles.actionRow}>
                <Text style={styles.subHeading}>{t('basedOnPreferences')}</Text>
                <PrimaryButton title="Generate" icon="refresh" onPress={() => generateNewMealPlan(1, selectedDate)} style={styles.generateButton} />
              </View>

              {meals.length === 0 ? (
                <EmptyState emoji="🍽️" title="No meal plan yet" subtitle="Tap Generate to create and save a meal plan for this date." />
              ) : (
                meals.map((meal: any) => (
                  <Card key={meal.id} style={styles.mealCard}>
                    <View style={styles.mealHeader}>
                      <Text style={styles.mealIcon}>{mealIcons[meal.type as keyof typeof mealIcons]}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.mealType}>{mealLabels[meal.type as keyof typeof mealLabels]}</Text>
                        <Text style={styles.mealName}>{meal.name}</Text>
                      </View>
                    </View>
                    <View style={styles.macroRow}>
                      <Chip label={`${meal.carbs}g Carbs`} />
                      <Chip label={`${meal.protein}g Protein`} />
                      <Chip label={`${meal.fat}g Fat`} />
                    </View>
                    <View style={styles.buttonsRow}>
                      <SecondaryButton title="View Recipe" icon="book" onPress={() => navigation.navigate('RecipeDetail', { meal, date: selectedDate })} style={{ flex: 1 }} />
                      <SecondaryButton title="Replace" icon="swap-horizontal" onPress={() => replaceMeal(meal.id, selectedDate)} style={{ flex: 1 }} />
                    </View>
                    <View style={styles.buttonsRow}>
                      <SecondaryButton title="Delete" icon="trash" onPress={() => deleteMeal(meal.id, selectedDate)} style={{ flex: 1 }} />
                      <PrimaryButton title="Watch Tutorial" icon="logo-youtube" onPress={() => watchTutorial(meal.name)} style={{ flex: 1 }} />
                    </View>
                  </Card>
                ))
              )}
            </>
          )}
        </View>
      </Screen>
      <LanguageModal visible={showLanguage} onClose={() => setShowLanguage(false)} />
    </>
  );
}

function CalendarModal({
  visible,
  selectedDate,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selectedDate: string;
  onSelect: (dateKey: string) => void;
  onClose: () => void;
}) {
  const selected = fromDateKey(selectedDate);
  const todayKey = toDateKey(new Date());
  const [viewMonth, setViewMonth] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));

  useEffect(() => {
    if (visible) setViewMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [visible, selectedDate]);

  const cells = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const start = new Date(first);
    const mondayOffset = (first.getDay() + 6) % 7;
    start.setDate(first.getDate() - mondayOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = toDateKey(date);
      return {
        key,
        day: date.getDate(),
        inMonth: date.getMonth() === viewMonth.getMonth(),
        isSelected: key === selectedDate,
        isToday: key === todayKey,
      };
    });
  }, [viewMonth, selectedDate, todayKey]);

  const changeMonth = (offset: number) => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.calendarBackdrop} onPress={onClose}>
        <Pressable style={styles.calendarPanel} onPress={(event) => event.stopPropagation()}>
          <View style={styles.calendarTopRow}>
            <Text style={styles.calendarMonthTitle}>
              {viewMonth.getFullYear()}年{viewMonth.getMonth() + 1}月
            </Text>
            <View style={styles.calendarNavRow}>
              <Pressable style={styles.calendarNavButton} onPress={() => changeMonth(-1)}>
                <Ionicons name="chevron-up" size={20} color="#FFFFFF" />
              </Pressable>
              <Pressable style={styles.calendarNavButton} onPress={() => changeMonth(1)}>
                <Ionicons name="chevron-down" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          <View style={styles.weekRow}>
            {['一', '二', '三', '四', '五', '六', '日'].map((item) => (
              <Text key={item} style={styles.weekText}>{item}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {cells.map((item) => (
              <Pressable
                key={item.key}
                style={[styles.calendarCell, item.isSelected && styles.calendarCellSelected]}
                onPress={() => onSelect(item.key)}
              >
                <Text style={[styles.calendarDayText, !item.inMonth && styles.calendarMutedText, item.isSelected && styles.calendarSelectedText]}>
                  {item.day}
                </Text>
                <Text style={[styles.calendarSubText, !item.inMonth && styles.calendarMutedText, item.isSelected && styles.calendarSelectedText]}>
                  {item.isToday ? '今天' : item.inMonth ? ' ' : ' '}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function NutritionItem({ label, current, target, unit }: { label: string; current: number; target: number; unit: string }) {
  return (
    <View style={styles.nutritionItem}>
      <Text style={styles.nutritionLabel}>{label}</Text>
      <Text style={styles.nutritionValue}>{current}{unit}</Text>
      <Text style={styles.nutritionTarget}>/ {target}{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 14, paddingBottom: 110 },
  langButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  langText: { color: 'white', fontWeight: '800' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg, borderRadius: 18, paddingHorizontal: 12, minHeight: 52 },
  searchInput: { flex: 1, color: colors.text },
  calendarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectedDateText: { color: colors.text, fontWeight: '900', fontSize: 16 },
  calendarButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999 },
  calendarButtonText: { color: colors.primaryDark, fontWeight: '800', fontSize: 12 },
  calendarBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 22 },
  calendarPanel: { backgroundColor: '#242424', borderRadius: 18, padding: 14 },
  calendarTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  calendarMonthTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  calendarNavRow: { flexDirection: 'row', gap: 14 },
  calendarNavButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekText: { width: `${100 / 7}%`, textAlign: 'center', color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: `${100 / 7}%`, height: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  calendarCellSelected: { borderColor: '#18A9FF', backgroundColor: 'rgba(24,169,255,0.15)' },
  calendarDayText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  calendarSubText: { color: '#8EBFFF', fontSize: 10, marginTop: 1 },
  calendarMutedText: { color: '#707070' },
  calendarSelectedText: { color: '#FFFFFF' },
  pickerCard: { padding: 4 },
  datesScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  dateChip: { width: 74, minHeight: 88, borderRadius: 22, padding: 12, backgroundColor: 'white', alignItems: 'center', marginRight: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  dateChipActive: { backgroundColor: colors.primaryDark },
  dateDay: { color: colors.muted, fontWeight: '700' },
  dateNum: { color: colors.text, fontWeight: '900', fontSize: 20, marginTop: 4 },
  todayText: { color: colors.primaryDark, fontSize: 10, fontWeight: '900', marginTop: 4 },
  dateTextActive: { color: 'white' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  cardSubtitle: { color: colors.muted, fontWeight: '700' },
  nutritionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  nutritionItem: { width: '48%', backgroundColor: colors.bg, borderRadius: 18, padding: 12 },
  nutritionLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  nutritionValue: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 4 },
  nutritionTarget: { color: colors.primaryDark, fontSize: 12, fontWeight: '800', marginTop: 2 },
  inlineErrorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 14, padding: 10, marginBottom: 12 },
  inlineErrorText: { flex: 1, color: '#991B1B', fontSize: 12, fontWeight: '700', lineHeight: 17 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  subHeading: { color: colors.muted, flex: 1 },
  generateButton: { minWidth: 120 },
  mealCard: { gap: 12 },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mealIcon: { fontSize: 38 },
  mealType: { color: colors.primaryDark, fontWeight: '800', fontSize: 12 },
  mealName: { color: colors.text, fontWeight: '900', fontSize: 16, marginTop: 3 },
  macroRow: { flexDirection: 'row', flexWrap: 'wrap' },
  buttonsRow: { flexDirection: 'row', gap: 10 },
});
