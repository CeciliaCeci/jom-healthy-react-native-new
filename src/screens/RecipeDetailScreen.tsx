import React from 'react';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header, Screen } from '../components/Common';
import { colors } from '../theme/colors';

function round(value?: number) {
  const num = Number(value || 0);
  return Math.round(Number.isFinite(num) ? num : 0);
}

export default function RecipeDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const meal = route.params?.meal;

  if (!meal) {
    return (
      <Screen padded={false}>
        <Header
          title="Recipe Detail"
          subtitle="Not found"
          icon="restaurant"
          onBack={() => navigation.goBack()}
        />

        <View style={styles.empty}>
          <Text style={styles.emptyText}>Recipe not found.</Text>
        </View>
      </Screen>
    );
  }

  const ingredients = Array.isArray(meal.ingredients)
    ? meal.ingredients
    : Array.from({ length: 20 })
        .map((_, index) => {
          const ingredient = meal[`strIngredient${index + 1}`];
          const measure = meal[`strMeasure${index + 1}`];

          if (!ingredient) return null;

          return {
            ingredientName: ingredient,
            measure,
          };
        })
        .filter(Boolean);

  const instructionSteps = String(meal.strInstructions || '')
    .split(/\r?\n/)
    .map((step) => step.trim())
    .filter(Boolean);

  const openYoutube = async () => {
    if (!meal.strYoutube) {
      Alert.alert('No Tutorial', 'This recipe does not have a tutorial link.');
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(meal.strYoutube);

      if (canOpen) {
        await Linking.openURL(meal.strYoutube);
      } else {
        Alert.alert('Cannot Open Link', 'Unable to open the tutorial link.');
      }
    } catch (error) {
      console.log('Open YouTube failed:', error);
      Alert.alert('Error', 'Unable to open the tutorial link.');
    }
  };

  const openSource = async () => {
    if (!meal.strSource) return;

    try {
      const canOpen = await Linking.canOpenURL(meal.strSource);

      if (canOpen) {
        await Linking.openURL(meal.strSource);
      }
    } catch (error) {
      console.log('Open source failed:', error);
    }
  };

  return (
    <Screen padded={false}>
      <Header
        title="Recipe Detail"
        subtitle={meal.strCategory || 'Meal'}
        icon="restaurant"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          {meal.strMealThumb ? (
            <Image source={{ uri: meal.strMealThumb }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroFallback}>
              <Text style={styles.heroEmoji}>🍽️</Text>
            </View>
          )}

          <View style={styles.heroContent}>
            <Text style={styles.title}>{meal.strMeal}</Text>

            <Text style={styles.meta}>
              {meal.strCategory || 'Recipe'} · {meal.strArea || 'Meal'}
            </Text>

            {!!meal.strTags && (
              <View style={styles.tagsRow}>
                {String(meal.strTags)
                  .split(',')
                  .slice(0, 4)
                  .map((tag: string) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag.trim()}</Text>
                    </View>
                  ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.nutritionCard}>
          <Text style={styles.sectionTitle}>Nutrition Summary</Text>

          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>
                {round(meal.totalEnergyKcal)}
              </Text>
              <Text style={styles.nutritionLabel}>kcal</Text>
            </View>

            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>
                {round(meal.totalProteinG)}g
              </Text>
              <Text style={styles.nutritionLabel}>Protein</Text>
            </View>

            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>
                {round(meal.totalCarbohydrateG)}g
              </Text>
              <Text style={styles.nutritionLabel}>Carbs</Text>
            </View>

            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{round(meal.totalFatG)}g</Text>
              <Text style={styles.nutritionLabel}>Fat</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ingredients</Text>

          {ingredients.length === 0 ? (
            <Text style={styles.mutedText}>No ingredients available.</Text>
          ) : (
            ingredients.map((item: any, index: number) => (
              <View
                key={`${item.ingredientName || item.foodNameEn}-${index}`}
                style={styles.ingredientRow}
              >
                <View style={styles.ingredientNumber}>
                  <Text style={styles.ingredientNumberText}>{index + 1}</Text>
                </View>

                <View style={styles.ingredientInfo}>
                  <Text style={styles.ingredientName}>
                    {item.foodNameEn || item.ingredientName || '-'}
                  </Text>

                  <Text style={styles.ingredientMeasure}>
                    {item.measure ||
                      (item.gramsEstimated !== undefined
                        ? `${item.gramsEstimated}g`
                        : '-')}
                  </Text>
                </View>

                {item.energyKcal !== undefined && (
                  <Text style={styles.ingredientCalories}>
                    {round(item.energyKcal)} kcal
                  </Text>
                )}
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Instructions</Text>

          {instructionSteps.length === 0 ? (
            <Text style={styles.mutedText}>No instructions available.</Text>
          ) : (
            instructionSteps.map((step, index) => (
              <View key={`${step}-${index}`} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>

                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))
          )}
        </View>

        {!!meal.strYoutube && (
          <Pressable style={styles.youtubeButton} onPress={openYoutube}>
            <Ionicons name="logo-youtube" size={22} color="#FFFFFF" />
            <Text style={styles.youtubeText}>Watch Tutorial</Text>
          </Pressable>
        )}

        {!!meal.strSource && (
          <Pressable style={styles.sourceButton} onPress={openSource}>
            <Ionicons name="open-outline" size={20} color={colors.primaryDark} />
            <Text style={styles.sourceText}>Open Recipe Source</Text>
          </Pressable>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 120,
    gap: 18,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyText: {
    color: colors.muted,
    fontWeight: '800',
  },

  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  heroImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#E5E7EB',
  },

  heroFallback: {
    width: '100%',
    height: 220,
    backgroundColor: '#EAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroEmoji: {
    fontSize: 64,
  },

  heroContent: {
    padding: 20,
  },

  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },

  meta: {
    marginTop: 6,
    color: colors.muted,
    fontWeight: '700',
    textAlign: 'center',
  },

  tagsRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },

  tag: {
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  tagText: {
    color: colors.primaryDark,
    fontSize: 12,
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

  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 14,
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
    color: colors.text,
    fontWeight: '900',
    fontSize: 15,
  },

  nutritionLabel: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 11,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  mutedText: {
    color: colors.muted,
    fontWeight: '700',
  },

  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },

  ingredientNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ingredientNumberText: {
    color: colors.primaryDark,
    fontWeight: '900',
    fontSize: 12,
  },

  ingredientInfo: {
    flex: 1,
  },

  ingredientName: {
    color: colors.text,
    fontWeight: '800',
  },

  ingredientMeasure: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12,
  },

  ingredientCalories: {
    color: colors.primaryDark,
    fontWeight: '900',
    fontSize: 12,
  },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },

  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepNumberText: {
    color: colors.primaryDark,
    fontWeight: '900',
    fontSize: 12,
  },

  stepText: {
    flex: 1,
    color: colors.text,
    lineHeight: 21,
  },

  youtubeButton: {
    backgroundColor: '#EF4444',
    borderRadius: 20,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#EF4444',
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  youtubeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },

  sourceButton: {
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  sourceText: {
    color: colors.primaryDark,
    fontWeight: '900',
    fontSize: 15,
  },
});