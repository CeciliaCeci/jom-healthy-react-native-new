import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import { Card } from './Common';

type Meal = { id: string; type: 'breakfast' | 'lunch' | 'dinner' | 'snack'; name: string; nameEn?: string; nameCn?: string; nameMs?: string; strMeal?: string; strMealEn?: string; strMealCn?: string; strMealMs?: string; carbs: number; protein: number; fat: number; completed: boolean };
const mealIcons = { breakfast: '🍳', lunch: '🍱', dinner: '🍲', snack: '🥤' };
const mealLabels = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };

function normalizeLanguageCode(language?: string | null) {
  const text = String(language || 'en').toLowerCase();
  if (text === 'zh' || text === 'cn' || text.startsWith('zh-') || text.includes('chinese')) return 'zh';
  if (text === 'ms' || text === 'my' || text.startsWith('ms-') || text.includes('malay')) return 'ms';
  return 'en';
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

export default function MealPlanCard({ meals, onToggleMeal }: { meals: Meal[]; onToggleMeal: (mealId: string) => void }) {
  const { language } = useLanguage();
  const getText = (en: string, zh: string, ms: string) => language === 'zh' ? zh : language === 'ms' ? ms : en;

  const getMealDisplayName = (meal: Meal) => {
    const normalized = normalizeLanguageCode(language);
    const baseName = meal.nameEn || meal.strMealEn || meal.strMeal || meal.name;
    const cnName = meal.nameCn || meal.strMealCn;
    const msName = meal.nameMs || meal.strMealMs;

    if (normalized === 'zh') return cnName || translateMealName(baseName, 'zh');
    if (normalized === 'ms') return msName || translateMealName(baseName, 'ms');
    return baseName;
  };

  return (
    <Card>
      <Text style={styles.title}>{getText("Today's Meal Plan", '今日膳食计划', 'Pelan Makanan Hari Ini')}</Text>
      {meals.map((meal) => (
        <View key={meal.id} style={[styles.mealRow, meal.completed && styles.mealCompleted]}>
          <Pressable onPress={() => onToggleMeal(meal.id)} style={[styles.check, meal.completed && styles.checkDone]}>
            {meal.completed && <Ionicons name="checkmark" color="white" size={16} />}
          </Pressable>
          <Text style={styles.icon}>{mealIcons[meal.type]}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.type}>{getText(mealLabels[meal.type], mealLabels[meal.type] === 'Breakfast' ? '早餐' : mealLabels[meal.type] === 'Lunch' ? '午餐' : mealLabels[meal.type] === 'Dinner' ? '晚餐' : '点心', mealLabels[meal.type] === 'Breakfast' ? 'Sarapan' : mealLabels[meal.type] === 'Lunch' ? 'Makan Tengah Hari' : mealLabels[meal.type] === 'Dinner' ? 'Makan Malam' : 'Snek')}</Text>
            <Text style={styles.name}>{getMealDisplayName(meal)}</Text>
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
