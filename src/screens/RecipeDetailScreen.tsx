import React, { useMemo } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header, Screen } from '../components/Common';
import { colors } from '../theme/colors';
import { useChildProfile } from '../context/ChildProfileContext';
import { useLanguage } from '../context/LanguageContext';

type Ingredient = {
  ingredientId?: number;
  mealId?: string;
  ingredientOrder?: number;
  ingredientName?: string;
  name?: string;
  measure?: string;
  quantity?: string;
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
  category?: string;
};

type MealRecipe = {
  id?: string | number;
  idMeal?: string | number;
  strMeal?: string;
  strMealEn?: string | null;
  strMealCn?: string | null;
  strMealCN?: string | null;
  strMealZh?: string | null;
  strMealMs?: string | null;
  name?: string;
  nameEn?: string | null;
  nameCn?: string | null;
  nameCN?: string | null;
  nameZh?: string | null;
  nameMs?: string | null;
  type?: string;
  strMealAlternate?: string | null;
  strCategory?: string | null;
  strCategoryEn?: string | null;
  strCategoryCn?: string | null;
  strCategoryCN?: string | null;
  strCategoryZh?: string | null;
  strCategoryMs?: string | null;
  category?: string | null;
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
  area?: string | null;
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
  instructions?: string | null;
  instructionsEn?: string | null;
  instructionsCn?: string | null;
  instructionsCN?: string | null;
  instructionsZh?: string | null;
  instructionsMs?: string | null;
  steps?: string[];
  strMealThumb?: string | null;
  imageUrl?: string | null;
  mealIconEmoji?: string | null;
  mealIconName?: string | null;
  mealIconPrompt?: string | null;
  strTags?: string | null;
  strYoutube?: string | null;
  youtubeUrl?: string | null;
  strSource?: string | null;
  totalEnergyKcal?: number;
  calories?: number;
  totalProteinG?: number;
  protein?: number;
  totalCarbohydrateG?: number;
  carbs?: number;
  totalFatG?: number;
  fat?: number;
  ingredients?: Ingredient[];
  [key: string]: any;
};

function safeNumber(value: any) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function round(value?: number) {
  return Math.round(safeNumber(value));
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

function guessMealEmoji(name?: string | null, category?: string | null) {
  const text = `${name || ''} ${category || ''}`.toLowerCase();

  if (text.includes('nasi lemak')) return '🍛';
  if (text.includes('fried rice')) return '🍛';
  if (
    text.includes('rice') ||
    text.includes('nasi') ||
    text.includes('biryani') ||
    text.includes('porridge') ||
    text.includes('congee')
  ) {
    return '🍚';
  }
  if (
    text.includes('noodle') ||
    text.includes('mee') ||
    text.includes('laksa') ||
    text.includes('ramen') ||
    text.includes('udon') ||
    text.includes('pasta') ||
    text.includes('spaghetti')
  ) {
    return '🍜';
  }
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

function getFoodGroupColor(group?: string | null) {
  const text = String(group || '').toLowerCase();

  if (text.includes('protein') || text.includes('meat') || text.includes('fish') || text.includes('egg')) {
    return '#2563EB';
  }

  if (text.includes('vegetable') || text.includes('fruit')) {
    return '#16A34A';
  }

  if (text.includes('carb') || text.includes('grain') || text.includes('rice') || text.includes('bread')) {
    return '#F97316';
  }

  return '#64748B';
}

function splitInstructions(value?: string | null, steps?: string[]) {
  if (Array.isArray(steps) && steps.length > 0) {
    return steps.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  }

  if (!value) return [];

  const normalized = String(value)
    .replace(/\r/g, '\n')
    .split(/\n+|(?<=\.)\s+(?=[A-Z0-9])/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (normalized.length > 0) return normalized;

  return [String(value).trim()];
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

function getLocalizedMealName(meal: any, language: string, fallback: string) {
  return pickLocalizedValue(
    language,
    meal?.strMealEn || meal?.nameEn || meal?.strMeal || meal?.name,
    meal?.strMealCn || meal?.strMealCN || meal?.strMealZh || meal?.nameCn || meal?.nameCN || meal?.nameZh,
    meal?.strMealMs || meal?.nameMs,
    fallback
  );
}

function getLocalizedMealCategory(meal: any, language: string, fallback: string) {
  return pickLocalizedValue(
    language,
    meal?.strCategoryEn || meal?.categoryEn || meal?.strCategory || meal?.category || meal?.type,
    meal?.strCategoryCn || meal?.strCategoryCN || meal?.strCategoryZh || meal?.categoryCn || meal?.categoryCN || meal?.categoryZh,
    meal?.strCategoryMs || meal?.categoryMs,
    fallback
  );
}

function getLocalizedMealArea(meal: any, language: string, fallback: string) {
  return pickLocalizedValue(
    language,
    meal?.strAreaEn || meal?.areaEn || meal?.strArea || meal?.area,
    meal?.strAreaCn || meal?.strAreaCN || meal?.strAreaZh || meal?.areaCn || meal?.areaCN || meal?.areaZh,
    meal?.strAreaMs || meal?.areaMs,
    fallback
  );
}

function getLocalizedInstructions(meal: any, language: string) {
  return pickLocalizedValue(
    language,
    meal?.strInstructionsEn || meal?.instructionsEn || meal?.strInstructions || meal?.instructions,
    meal?.strInstructionsCn || meal?.strInstructionsCN || meal?.strInstructionsZh || meal?.instructionsCn || meal?.instructionsCN || meal?.instructionsZh,
    meal?.strInstructionsMs || meal?.instructionsMs,
    meal?.strInstructions || meal?.instructions || ''
  );
}

function normalizeMealType(category?: string | null, type?: string | null) {
  const text = `${category || ''} ${type || ''}`.toLowerCase();

  if (text.includes('breakfast')) return 'breakfast';
  if (text.includes('lunch')) return 'lunch';
  if (text.includes('dinner')) return 'dinner';
  if (text.includes('snack')) return 'snack';

  return 'lunch';
}

export default function RecipeDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { language } = useLanguage();
  const childProfile = useChildProfile() as any;

  const {
    addSavedRecipe,
    removeSavedRecipe,
    isRecipeSaved,
  } = childProfile;

  const meal = route.params?.meal as MealRecipe | undefined;

  const getText = (en: string, zh: string, ms: string) => {
    const lang = normalizeLanguageCode(language);
    if (lang === 'zh') return zh;
    if (lang === 'ms') return ms;
    return en;
  };

  const mealName = getLocalizedMealName(meal, language, getText('Recipe', '食谱', 'Resipi'));
  const mealNameEn = getLocalizedMealName(meal, 'en', mealName);
  const mealNameCn = getLocalizedMealName(meal, 'zh', mealNameEn);
  const mealNameMs = getLocalizedMealName(meal, 'ms', mealNameEn);
  const mealId = String(meal?.idMeal || meal?.id || mealNameEn || mealName);
  const category = getLocalizedMealCategory(meal, language, getText('Recipe', '食谱', 'Resipi'));
  const categoryEn = getLocalizedMealCategory(meal, 'en', category);
  const categoryCn = getLocalizedMealCategory(meal, 'zh', categoryEn);
  const categoryMs = getLocalizedMealCategory(meal, 'ms', categoryEn);
  const area = getLocalizedMealArea(meal, language, '');
  const areaEn = getLocalizedMealArea(meal, 'en', area);
  const areaCn = getLocalizedMealArea(meal, 'zh', areaEn);
  const areaMs = getLocalizedMealArea(meal, 'ms', areaEn);
  const instructionsText = getLocalizedInstructions(meal, language);
  const instructionsEn = getLocalizedInstructions(meal, 'en');
  const instructionsCn = getLocalizedInstructions(meal, 'zh');
  const instructionsMs = getLocalizedInstructions(meal, 'ms');
  const imageUrl = isValidImageUrl(meal?.strMealThumb || meal?.imageUrl) ? String(meal?.strMealThumb || meal?.imageUrl) : '';
  const youtubeUrl = isValidYoutubeUrl(meal?.strYoutube || meal?.youtubeUrl) ? String(meal?.strYoutube || meal?.youtubeUrl) : '';
  const mealEmoji = meal?.mealIconEmoji || guessMealEmoji(mealName, category);

  const calories = safeNumber(meal?.totalEnergyKcal || meal?.calories);
  const protein = safeNumber(meal?.totalProteinG || meal?.protein);
  const carbs = safeNumber(meal?.totalCarbohydrateG || meal?.carbs);
  const fat = safeNumber(meal?.totalFatG || meal?.fat);

  const instructions = useMemo(
    () => splitInstructions(instructionsText, meal?.steps),
    [instructionsText, meal?.steps]
  );

  const ingredients = useMemo(() => {
    if (!Array.isArray(meal?.ingredients)) return [];
    return meal.ingredients;
  }, [meal?.ingredients]);

  const saveableMeal = useMemo(() => {
    return {
      ...(meal || {}),
      id: mealId,
      idMeal: mealId,
      name: mealName,
      nameEn: mealNameEn,
      nameCn: mealNameCn,
      nameMs: mealNameMs,
      strMeal: meal?.strMeal || mealNameEn,
      strMealEn: meal?.strMealEn || meal?.strMeal || mealNameEn,
      strMealCn: meal?.strMealCn || meal?.strMealCN || meal?.strMealZh || meal?.nameCn || meal?.nameCN || meal?.nameZh || mealNameCn,
      strMealMs: meal?.strMealMs || meal?.nameMs || mealNameMs,
      strCategory: meal?.strCategory || categoryEn,
      strCategoryEn: meal?.strCategoryEn || meal?.strCategory || categoryEn,
      strCategoryCn: meal?.strCategoryCn || meal?.strCategoryCN || meal?.strCategoryZh || meal?.categoryCn || meal?.categoryCN || meal?.categoryZh || categoryCn,
      strCategoryMs: meal?.strCategoryMs || meal?.categoryMs || categoryMs,
      strArea: meal?.strArea || meal?.strAreaEn || areaEn,
      strAreaEn: meal?.strAreaEn || meal?.strArea || areaEn,
      strAreaCn: meal?.strAreaCn || meal?.strAreaCN || meal?.strAreaZh || meal?.areaCn || meal?.areaCN || meal?.areaZh || areaCn,
      strAreaMs: meal?.strAreaMs || meal?.areaMs || areaMs,
      strInstructions: meal?.strInstructions || meal?.strInstructionsEn || instructionsEn,
      strInstructionsEn: meal?.strInstructionsEn || meal?.strInstructions || instructionsEn,
      strInstructionsCn: meal?.strInstructionsCn || meal?.strInstructionsCN || meal?.strInstructionsZh || meal?.instructionsCn || meal?.instructionsCN || meal?.instructionsZh || instructionsCn,
      strInstructionsMs: meal?.strInstructionsMs || meal?.instructionsMs || instructionsMs,
      type: normalizeMealType(categoryEn, meal?.type),
      imageUrl: imageUrl || undefined,
      strMealThumb: imageUrl || meal?.strMealThumb || '',
      mealIconEmoji: mealEmoji,
      carbs,
      protein,
      fat,
      totalCarbohydrateG: carbs,
      totalProteinG: protein,
      totalFatG: fat,
      totalEnergyKcal: calories,
    };
  }, [meal, mealId, mealName, mealNameEn, mealNameCn, mealNameMs, categoryEn, categoryCn, categoryMs, areaEn, areaCn, areaMs, instructionsEn, instructionsCn, instructionsMs, imageUrl, mealEmoji, carbs, protein, fat, calories]);

  const saved = typeof isRecipeSaved === 'function' ? isRecipeSaved(saveableMeal.id) : false;

  const getIngredientName = (item: Ingredient) => {
    return pickLocalizedValue(
      language,
      item.foodNameEn || item.name || item.ingredientName,
      item.foodNameCn || (item as any).foodNameCN || (item as any).foodNameZh,
      item.foodNameMs,
      getText('Ingredient', '食材', 'Bahan')
    );
  };

  const getIngredientMeasure = (item: Ingredient) => {
    if (item.measure) return String(item.measure);
    if (item.quantity) return String(item.quantity);
    if (item.gramsEstimated !== undefined && item.gramsEstimated !== null) return `${item.gramsEstimated}g`;
    return '';
  };

  const handleSaveRecipe = () => {
    if (!meal) return;

    if (saved) {
      if (typeof removeSavedRecipe === 'function') {
        removeSavedRecipe(saveableMeal.id);
      }

      Alert.alert(
        getText('Removed', '已移除', 'Dibuang'),
        getText('This recipe was removed from Saved Recipes.', '这个食谱已从收藏中移除。', 'Resipi ini telah dibuang daripada Resipi Tersimpan.')
      );
      return;
    }

    if (typeof addSavedRecipe === 'function') {
      addSavedRecipe(saveableMeal);
    }

    Alert.alert(
      getText('Saved', '已收藏', 'Disimpan'),
      getText('This recipe has been added to your Saved Recipes in Profile.', '这个食谱已保存到 Profile 的 Saved Recipes。', 'Resipi ini telah ditambah ke Resipi Tersimpan dalam Profil.')
    );
  };

  const openYoutube = async () => {
    if (!youtubeUrl) {
      Alert.alert(
        getText('No Tutorial', '没有教程', 'Tiada Tutorial'),
        getText('This recipe does not have a tutorial link.', '这个食谱没有教程链接。', 'Resipi ini tiada pautan tutorial.')
      );
      return;
    }

    try {
      const supported = await Linking.canOpenURL(youtubeUrl);

      if (supported) {
        await Linking.openURL(youtubeUrl);
      } else {
        Alert.alert(
          getText('Cannot Open Link', '无法打开链接', 'Tidak Dapat Buka Pautan'),
          getText('Unable to open the tutorial link.', '无法打开教程链接。', 'Tidak dapat membuka pautan tutorial.')
        );
      }
    } catch (error) {
      console.log('Open tutorial failed:', error);
      Alert.alert(
        getText('Error', '错误', 'Ralat'),
        getText('Unable to open the tutorial link.', '无法打开教程链接。', 'Tidak dapat membuka pautan tutorial.')
      );
    }
  };

  if (!meal) {
    return (
      <Screen padded={false}>
        <Header title={getText('Recipe Detail', '食谱详情', 'Butiran Resipi')} subtitle={getText('No recipe found', '没有找到食谱', 'Tiada resipi ditemui')} icon="book" />
        <View style={styles.notFoundWrap}>
          <Text style={styles.notFoundEmoji}>🍽️</Text>
          <Text style={styles.notFoundTitle}>{getText('Recipe not found', '食谱不存在', 'Resipi tidak ditemui')}</Text>
          <Pressable style={styles.backButtonLarge} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.backButtonLargeText}>{getText('Go Back', '返回', 'Kembali')}</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <Header
        title={getText('Recipe Detail', '食谱详情', 'Butiran Resipi')}
        subtitle={category}
        icon="book"
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={18} color={colors.primaryDark} />
          <Text style={styles.backLinkText}>{getText('Back', '返回', 'Kembali')}</Text>
        </Pressable>

        <View style={styles.heroCard}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroEmojiWrap}>
              <Text style={styles.heroEmoji}>{mealEmoji}</Text>
            </View>
          )}

          <View style={styles.heroContent}>
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mealTitle}>{mealName}</Text>
                <Text style={styles.mealMeta}>
                  {category}{area ? ` · ${area}` : ''}
                </Text>
              </View>

              <Pressable
                style={[styles.saveIconButton, saved && styles.saveIconButtonActive]}
                onPress={handleSaveRecipe}
              >
                <Ionicons
                  name={saved ? 'bookmark' : 'bookmark-outline'}
                  size={22}
                  color={saved ? '#FFFFFF' : colors.primaryDark}
                />
              </Pressable>
            </View>

            <View style={styles.heroButtonRow}>
              <Pressable
                style={[styles.primaryActionButton, saved && styles.savedActionButton]}
                onPress={handleSaveRecipe}
              >
                <Ionicons
                  name={saved ? 'checkmark-circle' : 'bookmark-outline'}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.primaryActionText}>
                  {saved
                    ? getText('Saved Recipe', '已收藏', 'Resipi Disimpan')
                    : getText('Save Recipe', '收藏食谱', 'Simpan Resipi')}
                </Text>
              </Pressable>

              <Pressable style={styles.youtubeButton} onPress={openYoutube}>
                <Ionicons name="logo-youtube" size={18} color="#FF3B30" />
                <Text style={styles.youtubeButtonText}>{getText('Watch', '观看', 'Tonton')}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.nutritionCard}>
          <Text style={styles.sectionTitle}>{getText('Nutrition', '营养', 'Nutrisi')}</Text>

          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{round(calories)}</Text>
              <Text style={styles.nutritionLabel}>kcal</Text>
            </View>

            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{round(carbs)}g</Text>
              <Text style={styles.nutritionLabel}>{getText('Carbs', '碳水', 'Karbo')}</Text>
            </View>

            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{round(protein)}g</Text>
              <Text style={styles.nutritionLabel}>{getText('Protein', '蛋白质', 'Protein')}</Text>
            </View>

            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{round(fat)}g</Text>
              <Text style={styles.nutritionLabel}>{getText('Fat', '脂肪', 'Lemak')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>{getText('Ingredients', '食材', 'Bahan-bahan')}</Text>

          {ingredients.length > 0 ? (
            ingredients.map((item, index) => {
              const name = getIngredientName(item);
              const measure = getIngredientMeasure(item);
              const color = getFoodGroupColor(item.foodGroup || item.category);

              return (
                <View key={`${name}-${index}`} style={styles.ingredientRow}>
                  <View style={[styles.ingredientDot, { backgroundColor: color }]} />

                  <View style={styles.ingredientTextWrap}>
                    <Text style={styles.ingredientName}>{name}</Text>
                    {!!measure && <Text style={styles.ingredientMeasure}>{measure}</Text>}
                  </View>

                  {safeNumber(item.gramsEstimated) > 0 && (
                    <Text style={styles.ingredientGram}>{round(item.gramsEstimated)}g</Text>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>{getText('No ingredients available.', '暂无食材信息。', 'Tiada bahan tersedia.')}</Text>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>{getText('Instructions', '做法', 'Arahan')}</Text>

          {instructions.length > 0 ? (
            instructions.map((step, index) => (
              <View key={`${step}-${index}`} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>{getText('No instructions available.', '暂无做法。', 'Tiada arahan tersedia.')}</Text>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 120,
    gap: 16,
  },

  backLink: {
    alignSelf: 'flex-start',
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: '#EAF7F0',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  backLinkText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },

  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  heroImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#E5E7EB',
  },

  heroEmojiWrap: {
    width: '100%',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF7F0',
  },

  heroEmoji: {
    fontSize: 96,
  },

  heroContent: {
    padding: 18,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  mealTitle: {
    color: '#0F172A',
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 30,
  },

  mealMeta: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },

  saveIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveIconButtonActive: {
    backgroundColor: colors.primaryDark,
  },

  heroButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },

  primaryActionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 22,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  savedActionButton: {
    backgroundColor: '#16A34A',
  },

  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  youtubeButton: {
    minWidth: 104,
    minHeight: 48,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#FF3B30',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },

  youtubeButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '900',
  },

  nutritionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  sectionTitle: {
    color: '#0F172A',
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
    minHeight: 76,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  nutritionValue: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
  },

  nutritionLabel: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  ingredientRow: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  ingredientDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },

  ingredientTextWrap: {
    flex: 1,
  },

  ingredientName: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },

  ingredientMeasure: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },

  ingredientGram: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
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
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },

  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  stepText: {
    flex: 1,
    color: '#334155',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },

  emptyText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },

  notFoundWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  notFoundEmoji: {
    fontSize: 56,
  },

  notFoundTitle: {
    marginTop: 12,
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },

  backButtonLarge: {
    marginTop: 18,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 8,
  },

  backButtonLargeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
