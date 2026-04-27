import React, { useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useChildProfile } from '../context/ChildProfileContext';
import { colors } from '../theme/colors';
import { Card, Header, PrimaryButton, Screen, SecondaryButton, SectionTitle } from '../components/Common';

const mealIcons = { breakfast: '🍳', lunch: '🍱', dinner: '🍲', snack: '🥤' } as const;

export default function RecipeDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { toggleMeal } = useChildProfile();
  const meal = route.params?.meal;
  const date = route.params?.date;
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  if (!meal) return <Screen><Text style={{ color: colors.muted }}>Recipe not found</Text></Screen>;
  const image = meal.imageUrl || 'https://images.unsplash.com/photo-1600289031464-74d374b64991?w=800&h=400&fit=crop';
  const openVideo = () => Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(`how to cook ${meal.name}`)}`);
  const markDone = () => { toggleMeal(meal.id, date); navigation.goBack(); };

  return (
    <Screen padded={false}>
      <Header title="Recipe Detail" subtitle="Step-by-step cooking guide" icon="book" onBack={() => navigation.goBack()} />
      <Image source={{ uri: image }} style={styles.hero} />
      <View style={styles.body}>
        <Card>
          <View style={styles.titleRow}>
            <Text style={styles.mealIcon}>{mealIcons[meal.type as keyof typeof mealIcons]}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{meal.name}</Text>
              <Text style={styles.sub}>{meal.carbs}g carbs · {meal.protein}g protein · {meal.fat}g fat</Text>
            </View>
          </View>
        </Card>

        <SectionTitle title="Ingredients" />
        <Card>
          {(meal.ingredients || []).map((item: any) => (
            <Pressable key={item.name} onPress={() => setChecked((prev) => ({ ...prev, [item.name]: !prev[item.name] }))} style={styles.ingredientRow}>
              <View style={[styles.check, checked[item.name] && styles.checkDone]}>{checked[item.name] && <Ionicons name="checkmark" color="white" size={15} />}</View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ingredientName, checked[item.name] && styles.doneText]}>{item.name}</Text>
                <Text style={styles.quantity}>{item.quantity}</Text>
              </View>
              <Text style={styles.category}>{item.category}</Text>
            </Pressable>
          ))}
        </Card>

        <SectionTitle title="Cooking Steps" />
        <Card>
          {(meal.steps || []).map((step: string, index: number) => (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </Card>

        <Card>
          <Text style={styles.videoTitle}>Watch Cooking Video</Text>
          <View style={styles.buttonsRow}>
            <SecondaryButton title="YouTube Search" icon="logo-youtube" onPress={openVideo} style={{ flex: 1 }} />
            <PrimaryButton title="Completed" icon="checkmark" onPress={markDone} style={{ flex: 1 }} />
          </View>
        </Card>
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  hero: { width: '100%', height: 220, backgroundColor: colors.bg },
  body: { padding: 20, gap: 12, paddingBottom: 34 },
  titleRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  mealIcon: { fontSize: 42 },
  title: { color: colors.text, fontWeight: '900', fontSize: 20 },
  sub: { color: colors.muted, marginTop: 6 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  ingredientName: { color: colors.text, fontWeight: '800' },
  quantity: { color: colors.muted, marginTop: 3, fontSize: 12 },
  category: { color: colors.primaryDark, backgroundColor: colors.primaryLight, overflow: 'hidden', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, fontWeight: '800' },
  doneText: { textDecorationLine: 'line-through', color: colors.muted },
  stepRow: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  stepNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: 'white', fontWeight: '900' },
  stepText: { flex: 1, color: colors.text, lineHeight: 21 },
  videoTitle: { color: colors.text, fontWeight: '900', fontSize: 18, marginBottom: 12 },
  buttonsRow: { flexDirection: 'row', gap: 10 },
});
