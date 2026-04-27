import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useChildProfile } from '../context/ChildProfileContext';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/colors';
import { Card, Chip, EmptyState, Header, IconButton, PrimaryButton, Screen, SecondaryButton } from '../components/Common';
import LanguageModal from '../components/LanguageModal';

const mealIcons = { breakfast: '🍳', lunch: '🍱', dinner: '🍲', snack: '🥤' } as const;
const mealLabels = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' } as const;

export default function MealScreen() {
  const navigation = useNavigation<any>();
  const { language, t } = useLanguage();
  const { activeChild, selectedDate, setSelectedDate, getMealsForDate, toggleMeal, generateNewMealPlan } = useChildProfile();
  const [showLanguage, setShowLanguage] = useState(false);
  const [query, setQuery] = useState('');
  const langCode = language === 'zh' ? 'ZH' : language === 'ms' ? 'MS' : 'EN';
  const dates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const key = date.toISOString().split('T')[0];
      return { key, day: date.toLocaleDateString('en-MY', { weekday: 'short' }), date: date.getDate() };
    });
  }, []);
  const meals = getMealsForDate(selectedDate).filter((meal: any) => !query.trim() || meal.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <Screen padded={false}>
        <Header title={t('mealPlan')} subtitle={activeChild ? `${activeChild.nickname}'s meals` : t('basedOnPreferences')} icon="restaurant" right={<Pressable style={styles.langButton} onPress={() => setShowLanguage(true)}><Text style={styles.langText}>{langCode}</Text></Pressable>} />
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
                {dates.map((item) => (
                  <Pressable key={item.key} onPress={() => setSelectedDate(item.key)} style={[styles.dateChip, selectedDate === item.key && styles.dateChipActive]}>
                    <Text style={[styles.dateDay, selectedDate === item.key && styles.dateTextActive]}>{item.day}</Text>
                    <Text style={[styles.dateNum, selectedDate === item.key && styles.dateTextActive]}>{item.date}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.actionRow}>
                <Text style={styles.subHeading}>{t('basedOnPreferences')}</Text>
                <IconButton icon="refresh" onPress={generateNewMealPlan} />
              </View>
              {meals.length === 0 ? (
                <EmptyState emoji="🔎" title="No meals found" subtitle="Try another search or generate a new meal plan." />
              ) : meals.map((meal: any) => (
                <Card key={meal.id} style={[styles.mealCard, meal.completed && styles.mealDone]}>
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealIcon}>{mealIcons[meal.type as keyof typeof mealIcons]}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mealType}>{mealLabels[meal.type as keyof typeof mealLabels]}</Text>
                      <Text style={styles.mealName}>{meal.name}</Text>
                    </View>
                    <Pressable onPress={() => toggleMeal(meal.id, selectedDate)} style={[styles.check, meal.completed && styles.checkDone]}>
                      {meal.completed && <Ionicons name="checkmark" color="white" size={18} />}
                    </Pressable>
                  </View>
                  <View style={styles.macroRow}>
                    <Chip label={`${meal.carbs}g Carbs`} />
                    <Chip label={`${meal.protein}g Protein`} />
                    <Chip label={`${meal.fat}g Fat`} />
                  </View>
                  <View style={styles.buttonsRow}>
                    <SecondaryButton title="View Recipe" icon="book" onPress={() => navigation.navigate('RecipeDetail', { meal, date: selectedDate })} style={{ flex: 1 }} />
                    <PrimaryButton title={meal.completed ? 'Done' : 'Mark Done'} icon="checkmark" onPress={() => toggleMeal(meal.id, selectedDate)} style={{ flex: 1 }} />
                  </View>
                </Card>
              ))}
            </>
          )}
        </View>
      </Screen>
      <LanguageModal visible={showLanguage} onClose={() => setShowLanguage(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 14, paddingBottom: 110 },
  langButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  langText: { color: 'white', fontWeight: '800' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg, borderRadius: 18, paddingHorizontal: 12, minHeight: 52 },
  searchInput: { flex: 1, color: colors.text },
  dateChip: { width: 74, borderRadius: 22, padding: 12, backgroundColor: 'white', alignItems: 'center', marginRight: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  dateChipActive: { backgroundColor: colors.primaryDark },
  dateDay: { color: colors.muted, fontWeight: '700' },
  dateNum: { color: colors.text, fontWeight: '900', fontSize: 20, marginTop: 4 },
  dateTextActive: { color: 'white' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subHeading: { color: colors.muted, flex: 1, marginRight: 12 },
  mealCard: { gap: 12 },
  mealDone: { backgroundColor: '#F0FDF4' },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mealIcon: { fontSize: 38 },
  mealType: { color: colors.primaryDark, fontWeight: '800', fontSize: 12 },
  mealName: { color: colors.text, fontWeight: '900', fontSize: 16, marginTop: 2 },
  check: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bg, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  macroRow: { flexDirection: 'row', flexWrap: 'wrap' },
  buttonsRow: { flexDirection: 'row', gap: 10 },
});
