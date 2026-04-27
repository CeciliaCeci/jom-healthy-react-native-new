import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Card } from './Common';

type Meal = { id: string; type: 'breakfast' | 'lunch' | 'dinner' | 'snack'; name: string; carbs: number; protein: number; fat: number; completed: boolean };
const mealIcons = { breakfast: '🍳', lunch: '🍱', dinner: '🍲', snack: '🥤' };
const mealLabels = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };

export default function MealPlanCard({ meals, onToggleMeal }: { meals: Meal[]; onToggleMeal: (mealId: string) => void }) {
  return (
    <Card>
      <Text style={styles.title}>Today's Meal Plan</Text>
      {meals.map((meal) => (
        <View key={meal.id} style={[styles.mealRow, meal.completed && styles.mealCompleted]}>
          <Pressable onPress={() => onToggleMeal(meal.id)} style={[styles.check, meal.completed && styles.checkDone]}>
            {meal.completed && <Ionicons name="checkmark" color="white" size={16} />}
          </Pressable>
          <Text style={styles.icon}>{mealIcons[meal.type]}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.type}>{mealLabels[meal.type]}</Text>
            <Text style={styles.name}>{meal.name}</Text>
            <Text style={styles.macro}>{meal.carbs}g C · {meal.protein}g P · {meal.fat}g F</Text>
          </View>
        </View>
      ))}
    </Card>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 12 },
  mealRow: { borderRadius: 18, padding: 12, backgroundColor: colors.bg, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  mealCompleted: { backgroundColor: '#F0FDF4' },
  check: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'white', borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  icon: { fontSize: 30 },
  type: { color: colors.primaryDark, fontWeight: '800', fontSize: 12 },
  name: { color: colors.text, fontWeight: '800', marginTop: 2 },
  macro: { color: colors.muted, marginTop: 4, fontSize: 12 },
});
