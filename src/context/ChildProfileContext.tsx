import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { NutritionNeeds } from '../services/api';

export interface ChildProfile {
  id: number;
  nickname: string;
  avatar: string;
  avatarImageUri?: string;
  age: number;
  height: number;
  weight: number;
  gender: 'boy' | 'girl';
  bmi?: number;
  status?: string;
  birthday?: string;
  restrictions?: {
    vegetarian: boolean;
    halal: boolean;
    lactoseIntolerance: boolean;
    noSeafood: boolean;
  };
  preferences?: string[];
  allergies?: string[];
  // --- Hydration Props ---
  dailyWaterGoal: number;
  todayWaterIntake: number;
  hydrationHistory: any[];
  addWater: (amount: number) => Promise<void>;
  dailyActivityGoal: number;
  todayActivityMinutes: number;
  activityHistory: any[];
  addActivity: (minutes: number) => Promise<void>;
}

export interface Ingredient {
  name: string;
  quantity: string;
  category: 'vegetables' | 'protein' | 'carbs' | 'others';
}

export interface Meal {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  nameEn?: string;
  nameCn?: string;
  nameMs?: string;
  carbs: number;
  protein: number;
  fat: number;
  completed?: boolean;
  ingredients?: Ingredient[];
  steps?: string[];
  imageUrl?: string;
  strMealThumb?: string;
  mealIconEmoji?: string;
  [key: string]: any;
}

interface ShoppingItem {
  id: string;
  name: string;
  nameEn?: string;
  nameCn?: string;
  nameMs?: string;
  category: 'vegetables' | 'protein' | 'carbs' | 'others';
  source: string;
  sourceEn?: string;
  sourceCn?: string;
  sourceMs?: string;
  mealId: string;
  checked: boolean;
}

interface SavedRecipe {
  id: string;
  name: string;
  nameEn?: string;
  nameCn?: string;
  nameMs?: string;
  imageUrl?: string;
  strMealThumb?: string;
  mealIconEmoji?: string;
  meal?: Meal;
  savedAt: string;
  [key: string]: any;
}

interface NutritionProgress {
  calories: { current: number; target: number };
  carbs: { current: number; target: number };
  protein: { current: number; target: number };
  fat: { current: number; target: number };
}

interface StoredProfileState {
  children?: ChildProfile[];
  activeChildId?: number | null;
  activeChild?: ChildProfile | null;
  childMeals?: Record<number, Record<string, Meal[]>>;
  selectedDate?: string;
  nutritionNeeds?: NutritionNeeds;
  savedRecipes?: SavedRecipe[];
  shoppingList?: ShoppingItem[];
}

interface ChildProfileContextType {
  children: ChildProfile[];
  activeChild: ChildProfile | null;
  setActiveChild: (child: ChildProfile | null) => void;
  addChild: (child: ChildProfile) => void;
  updateChild: (child: ChildProfile) => void;
  removeChild: (childId: number) => void;
  switchToChild: (childId: number) => void;
  getOwnerKey: () => string;
  meals: Meal[];
  weeklyMeals: Record<string, Meal[]>;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  getMealsForDate: (date: string) => Meal[];
  generateNewMealPlan: (days?: number, startDate?: string) => void;
  replaceMeal: (mealId: string, date?: string) => void;
  deleteMeal: (mealId: string, date?: string) => void;
  toggleMeal: (mealId: string, date?: string) => void;
  nutritionNeeds: NutritionNeeds;
  nutritionProgress: NutritionProgress;
  setNutritionNeeds: (needs: Partial<NutritionNeeds>) => void;
  getTip: () => string;
  shoppingList: ShoppingItem[];
  toggleShoppingItem: (itemId: string) => void;
  getShoppingProgress: () => { checked: number; total: number };
  savedRecipes: SavedRecipe[];
  addSavedRecipe: (meal: Meal) => void;
  removeSavedRecipe: (id: string) => void;
  isRecipeSaved: (id: string) => boolean;
  reloadChildProfileData: () => Promise<void>;
  reloadFromStorage: () => Promise<void>;
  refreshFromStorage: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
  // --- Hydration Props ---
  dailyWaterGoal: number;
  todayWaterIntake: number;
  hydrationHistory: any[];
  addWater: (amount: number, drinkType?: string) => Promise<void>;
  dailyActivityGoal: number;
  todayActivityMinutes: number;
  activityHistory: any[];
  addActivity: (minutes: number, activityType?: string) => Promise<void>;
}

const ChildProfileContext = createContext<ChildProfileContextType | undefined>(undefined);

const PROFILE_STATE_KEY = 'JOMHEALTHY_CHILD_PROFILE_CONTEXT_V1';
const CHILDREN_KEY = 'JOMHEALTHY_CHILDREN_V1';
const ACTIVE_CHILD_ID_KEY = 'JOMHEALTHY_ACTIVE_CHILD_ID_V1';
const CHILD_MEALS_KEY = 'JOMHEALTHY_CHILD_MEALS_V1';
const NUTRITION_NEEDS_KEY = 'JOMHEALTHY_NUTRITION_NEEDS_V1';
const SAVED_RECIPES_KEY = 'JOMHEALTHY_SAVED_RECIPES_V1';
const SHOPPING_BY_OWNER_KEY = 'JOMHEALTHY_SHOPPING_LIST_BY_OWNER_V1';

const pad2 = (value: number) => String(value).padStart(2, '0');
const toDateKey = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const getTodayDateString = (): string => toDateKey(new Date());

const addDays = (dateString: string, days: number) => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};

function safeJsonParse(value: string | null | undefined) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function isPlainObject(value: any) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isChildProfileArray(value: any): value is ChildProfile[] {
  return (
    Array.isArray(value) &&
    value.every((item) =>
      item &&
      typeof item === 'object' &&
      item.id !== undefined &&
      item.nickname !== undefined &&
      item.age !== undefined
    )
  );
}

function isSavedRecipeArray(value: any): value is SavedRecipe[] {
  return Array.isArray(value) && value.every((item) => item && typeof item === 'object' && item.id !== undefined);
}

function normalizeNutritionNeeds(value: any): NutritionNeeds | null {
  if (!isPlainObject(value)) return null;

  const carbs = Number(value.carbs ?? value.carbohydrate ?? value.targetCarbs);
  const protein = Number(value.protein ?? value.targetProtein);
  const fat = Number(value.fat ?? value.targetFat);
  const calories = Number(value.calories ?? value.energyKcal ?? value.kcal ?? 0);

  if (!Number.isFinite(carbs) && !Number.isFinite(protein) && !Number.isFinite(fat)) {
    return null;
  }

  return {
    calories: Number.isFinite(calories) ? calories : 0,
    carbs: Number.isFinite(carbs) ? carbs : 155,
    protein: Number.isFinite(protein) ? protein : 32,
    fat: Number.isFinite(fat) ? fat : 28,
  };
}

function makeMeal(type: Meal['type']): Meal {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    name: type === 'breakfast' ? 'Oatmeal with Banana' : type === 'lunch' ? 'Chicken Rice' : type === 'dinner' ? 'Vegetable Soup' : 'Apple Slices',
    carbs: type === 'snack' ? 20 : 45,
    protein: type === 'snack' ? 2 : 18,
    fat: type === 'snack' ? 1 : 8,
  };
}

function normalizeSavedRecipeMeal(meal: Meal): Meal {
  return {
    ...meal,
    name: meal.name || meal.nameEn || meal.nameCn || meal.nameMs || '',
    nameEn: meal.nameEn || meal.name || meal.nameCn || meal.nameMs || '',
    nameCn: meal.nameCn || meal.strMealCn || meal.strMealCN || meal.strMealZh || '',
    nameMs: meal.nameMs || meal.strMealMs || '',
    strMeal: meal.strMeal || meal.name || meal.nameEn || '',
    strMealEn: meal.strMealEn || meal.strMeal || meal.nameEn || meal.name || '',
    strMealCn: meal.strMealCn || meal.strMealCN || meal.strMealZh || meal.nameCn || '',
    strMealMs: meal.strMealMs || meal.nameMs || '',
    strInstructions: meal.strInstructions || meal.strInstructionsEn || meal.instructions || meal.instructionsEn || '',
    strInstructionsEn: meal.strInstructionsEn || meal.strInstructions || meal.instructionsEn || meal.instructions || '',
    strInstructionsCn: meal.strInstructionsCn || meal.strInstructionsCN || meal.strInstructionsZh || meal.instructionsCn || meal.instructionsCN || meal.instructionsZh || '',
    strInstructionsMs: meal.strInstructionsMs || meal.instructionsMs || '',
    instructionsEn: meal.instructionsEn || meal.strInstructionsEn || meal.strInstructions || meal.instructions || '',
    instructionsCn: meal.instructionsCn || meal.instructionsCN || meal.instructionsZh || meal.strInstructionsCn || meal.strInstructionsCN || meal.strInstructionsZh || '',
    instructionsMs: meal.instructionsMs || meal.strInstructionsMs || '',
    strCategory: meal.strCategory || meal.strCategoryEn || meal.category || '',
    strCategoryEn: meal.strCategoryEn || meal.strCategory || meal.categoryEn || meal.category || '',
    strCategoryCn: meal.strCategoryCn || meal.strCategoryCN || meal.strCategoryZh || meal.categoryCn || meal.categoryCN || meal.categoryZh || '',
    strCategoryMs: meal.strCategoryMs || meal.categoryMs || '',
    strArea: meal.strArea || meal.strAreaEn || meal.area || '',
    strAreaEn: meal.strAreaEn || meal.strArea || meal.areaEn || meal.area || '',
    strAreaCn: meal.strAreaCn || meal.strAreaCN || meal.strAreaZh || meal.areaCn || meal.areaCN || meal.areaZh || '',
    strAreaMs: meal.strAreaMs || meal.areaMs || '',
  };
}

const generateMealsForDay = (): Meal[] => [
  makeMeal('breakfast'),
  makeMeal('lunch'),
  makeMeal('dinner'),
  makeMeal('snack'),
];

export function ChildProfileProvider({ children: childrenProp }: { children: ReactNode }) {
  const [childrenList, setChildrenList] = useState<ChildProfile[]>([]);
  const [activeChild, setActiveChildState] = useState<ChildProfile | null>(null);
  const [childMeals, setChildMeals] = useState<Record<number, Record<string, Meal[]>>>({});
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [nutritionNeeds, setNutritionNeedsState] = useState<NutritionNeeds>({
    calories: 0,
    carbs: 155,
    protein: 32,
    fat: 28,
  });
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const getOwnerKey = useCallback(() => {
    if (!activeChild?.id) return 'guest';
    return `child_${activeChild.id}`;
  }, [activeChild?.id]);

  const setActiveChild = useCallback((child: ChildProfile | null) => {
    setActiveChildState(child);
  }, []);

  const reloadChildProfileData = useCallback(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const pairs = await AsyncStorage.multiGet(keys);
      const parsedByKey: Record<string, any> = {};

      pairs.forEach(([key, value]) => {
        parsedByKey[key] = safeJsonParse(value);
      });

      const stateCandidates: any[] = [
        parsedByKey[PROFILE_STATE_KEY],
        parsedByKey.profileState,
        parsedByKey.childProfileState,
        parsedByKey.jomhealthyProfileState,
      ].filter(Boolean);

      Object.values(parsedByKey).forEach((value) => {
        if (isPlainObject(value) && (value.children || value.childrenList || value.activeChild || value.savedRecipes)) {
          stateCandidates.push(value);
        }
      });

      const nextState: StoredProfileState = {};

      for (const state of stateCandidates) {
        if (isChildProfileArray(state.children)) nextState.children = state.children;
        if (isChildProfileArray(state.childrenList)) nextState.children = state.childrenList;
        if (state.activeChildId !== undefined) nextState.activeChildId = Number(state.activeChildId);
        if (state.activeChild && typeof state.activeChild === 'object') nextState.activeChild = state.activeChild;
        if (state.childMeals && typeof state.childMeals === 'object') nextState.childMeals = state.childMeals;
        if (state.weeklyMeals && typeof state.weeklyMeals === 'object') nextState.childMeals = state.weeklyMeals;
        if (typeof state.selectedDate === 'string') nextState.selectedDate = state.selectedDate;
        if (normalizeNutritionNeeds(state.nutritionNeeds)) nextState.nutritionNeeds = normalizeNutritionNeeds(state.nutritionNeeds) || undefined;
        if (isSavedRecipeArray(state.savedRecipes)) nextState.savedRecipes = state.savedRecipes;
        if (Array.isArray(state.shoppingList)) nextState.shoppingList = state.shoppingList;
      }

      const directChildren = parsedByKey[CHILDREN_KEY] || parsedByKey.children || parsedByKey.childProfiles || parsedByKey.JOMHEALTHY_CHILDREN;
      if (isChildProfileArray(directChildren)) nextState.children = directChildren;

      const directActiveChildId = parsedByKey[ACTIVE_CHILD_ID_KEY] ?? parsedByKey.activeChildId;
      if (directActiveChildId !== undefined && directActiveChildId !== null) {
        nextState.activeChildId = Number(directActiveChildId);
      }

      const directActiveChild = parsedByKey.activeChild || parsedByKey.JOMHEALTHY_ACTIVE_CHILD;
      if (directActiveChild && typeof directActiveChild === 'object') nextState.activeChild = directActiveChild;

      const directMeals = parsedByKey[CHILD_MEALS_KEY] || parsedByKey.childMeals;
      if (directMeals && typeof directMeals === 'object') nextState.childMeals = directMeals;

      const directNeeds = normalizeNutritionNeeds(parsedByKey[NUTRITION_NEEDS_KEY] || parsedByKey.nutritionNeeds);
      if (directNeeds) nextState.nutritionNeeds = directNeeds;

      const directSaved = parsedByKey[SAVED_RECIPES_KEY] || parsedByKey.savedRecipes || parsedByKey.JOMHEALTHY_SAVED_RECIPES;
      if (isSavedRecipeArray(directSaved)) nextState.savedRecipes = directSaved;

      const childrenFromBackup = nextState.children || [];
      const activeFromBackup =
        (nextState.activeChildId !== undefined && childrenFromBackup.find((child) => child.id === nextState.activeChildId)) ||
        (nextState.activeChild && childrenFromBackup.find((child) => child.id === nextState.activeChild?.id)) ||
        nextState.activeChild ||
        childrenFromBackup[0] ||
        null;

      setChildrenList(childrenFromBackup);
      setActiveChildState(activeFromBackup);
      setChildMeals(nextState.childMeals || {});
      setSelectedDate(nextState.selectedDate || getTodayDateString());
      setNutritionNeedsState(nextState.nutritionNeeds || { calories: 0, carbs: 155, protein: 32, fat: 28 });
      setSavedRecipes(nextState.savedRecipes || []);

      const ownerKey = activeFromBackup?.id ? `child_${activeFromBackup.id}` : 'guest';
      const shoppingByOwner = parsedByKey[SHOPPING_BY_OWNER_KEY];

      if (shoppingByOwner && typeof shoppingByOwner === 'object') {
        const ownerShopping = shoppingByOwner[ownerKey] || shoppingByOwner.guest || [];
        setShoppingList(Array.isArray(ownerShopping) ? ownerShopping : []);
      } else {
        setShoppingList(nextState.shoppingList || []);
      }
    } catch (error) {
      console.log('Reload child profile data failed:', error);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    reloadChildProfileData();
  }, [reloadChildProfileData]);

  useEffect(() => {
    if (!hydrated) return;

    const persist = async () => {
      try {
        const activeChildId = activeChild?.id ?? null;
        const state: StoredProfileState = {
          children: childrenList,
          activeChildId,
          activeChild,
          childMeals,
          selectedDate,
          nutritionNeeds,
          savedRecipes,
          shoppingList,
        };

        await AsyncStorage.multiSet([
          [PROFILE_STATE_KEY, JSON.stringify(state)],
          [CHILDREN_KEY, JSON.stringify(childrenList)],
          [ACTIVE_CHILD_ID_KEY, JSON.stringify(activeChildId)],
          [CHILD_MEALS_KEY, JSON.stringify(childMeals)],
          [NUTRITION_NEEDS_KEY, JSON.stringify(nutritionNeeds)],
          [SAVED_RECIPES_KEY, JSON.stringify(savedRecipes)],
        ]);
      } catch (error) {
        console.log('Persist child profile data failed:', error);
      }
    };

    persist();
  }, [childrenList, activeChild, childMeals, selectedDate, nutritionNeeds, savedRecipes, shoppingList, hydrated]);

  const addChild = (child: ChildProfile) => {
    setChildrenList((prev) => {
      const exists = prev.some((item) => item.id === child.id);
      return exists ? prev.map((item) => (item.id === child.id ? child : item)) : [...prev, child];
    });
    setChildMeals((prev) => ({ ...prev, [child.id]: prev[child.id] ?? {} }));
    setActiveChildState(child);
  };

  const updateChild = (child: ChildProfile) => {
    setChildrenList((prev) => prev.map((item) => (item.id === child.id ? child : item)));
    if (activeChild?.id === child.id) setActiveChildState(child);
  };

  const removeChild = (childId: number) => {
    setChildrenList((prev) => {
      const next = prev.filter((item) => item.id !== childId);
      if (activeChild?.id === childId) setActiveChildState(next[0] ?? null);
      return next;
    });
    setChildMeals((prev) => {
      const next = { ...prev };
      delete next[childId];
      return next;
    });
  };

  const switchToChild = (childId: number) => {
    const child = childrenList.find((item) => item.id === childId);
    if (!child) return;
    setActiveChildState(child);
    setChildMeals((prev) => ({ ...prev, [childId]: prev[childId] ?? {} }));
  };

  const weeklyMeals = activeChild ? childMeals[activeChild.id] ?? {} : {};
  const meals = weeklyMeals[selectedDate] ?? [];

  const getMealsForDate = (date: string) => {
    if (!activeChild) return [];
    return childMeals[activeChild.id]?.[date] ?? [];
  };

  const generateNewMealPlan = (days = 1, startDate = selectedDate) => {
    if (!activeChild) return;
    const newDates: Record<string, Meal[]> = {};

    for (let i = 0; i < days; i += 1) {
      newDates[addDays(startDate, i)] = generateMealsForDay();
    }

    setChildMeals((prev) => ({
      ...prev,
      [activeChild.id]: {
        ...(prev[activeChild.id] ?? {}),
        ...newDates,
      },
    }));
  };

  const replaceMeal = (mealId: string, date = selectedDate) => {
    if (!activeChild) return;

    setChildMeals((prev) => {
      const current = prev[activeChild.id]?.[date] ?? [];
      const target = current.find((item) => item.id === mealId);
      if (!target) return prev;

      return {
        ...prev,
        [activeChild.id]: {
          ...(prev[activeChild.id] ?? {}),
          [date]: current.map((item) => (item.id === mealId ? makeMeal(target.type) : item)),
        },
      };
    });
  };

  const deleteMeal = (mealId: string, date = selectedDate) => {
    if (!activeChild) return;

    setChildMeals((prev) => ({
      ...prev,
      [activeChild.id]: {
        ...(prev[activeChild.id] ?? {}),
        [date]: (prev[activeChild.id]?.[date] ?? []).filter((item) => item.id !== mealId),
      },
    }));
  };

  const toggleMeal = (mealId: string, date = selectedDate) => {
    if (!activeChild) return;

    setChildMeals((prev) => ({
      ...prev,
      [activeChild.id]: {
        ...(prev[activeChild.id] ?? {}),
        [date]: (prev[activeChild.id]?.[date] ?? []).map((item) =>
          item.id === mealId ? { ...item, completed: !item.completed } : item
        ),
      },
    }));
  };

  const nutritionProgress = useMemo<NutritionProgress>(() => {
    const currentMeals = activeChild ? childMeals[activeChild.id]?.[selectedDate] ?? [] : [];

    return {
      calories: {
        current: currentMeals.reduce((sum, item) => sum + item.carbs * 4 + item.protein * 4 + item.fat * 9, 0),
        target: nutritionNeeds.calories || 0,
      },
      carbs: {
        current: currentMeals.reduce((sum, item) => sum + item.carbs, 0),
        target: nutritionNeeds.carbs || 155,
      },
      protein: {
        current: currentMeals.reduce((sum, item) => sum + item.protein, 0),
        target: nutritionNeeds.protein || 32,
      },
      fat: {
        current: currentMeals.reduce((sum, item) => sum + item.fat, 0),
        target: nutritionNeeds.fat || 28,
      },
    };
  }, [activeChild, childMeals, selectedDate, nutritionNeeds]);

  const setNutritionNeeds = (needs: Partial<NutritionNeeds>) => {
    setNutritionNeedsState((prev) => ({ ...prev, ...needs }));
  };

  const getTip = (): string => {
    const proteinPercent = (nutritionProgress.protein.current / Math.max(nutritionProgress.protein.target, 1)) * 100;
    const carbsPercent = (nutritionProgress.carbs.current / Math.max(nutritionProgress.carbs.target, 1)) * 100;

    if (proteinPercent < 50) return 'I need more protein today! How about some chicken or eggs? 💪';
    if (carbsPercent < 50) return "Let's get some energy! I'd love some rice or noodles! 🍚";
    return "I feel great! We're on track with our nutrition today! 😊";
  };

  const toggleShoppingItem = (itemId: string) => {
    setShoppingList((prev) => prev.map((item) => (item.id === itemId ? { ...item, checked: !item.checked } : item)));
  };

  const getShoppingProgress = () => {
    const checked = shoppingList.filter((item) => item.checked).length;
    return { checked, total: shoppingList.length };
  };

  const addSavedRecipe = (meal: Meal) => {
    const normalizedMeal = normalizeSavedRecipeMeal(meal);

    setSavedRecipes((prev) => {
      if (prev.some((item) => item.id === normalizedMeal.id)) return prev;

      return [
        {
          id: normalizedMeal.id,
          name: normalizedMeal.name,
          nameEn: normalizedMeal.nameEn,
          nameCn: normalizedMeal.nameCn,
          nameMs: normalizedMeal.nameMs,
          imageUrl: normalizedMeal.imageUrl || normalizedMeal.strMealThumb,
          strMealThumb: normalizedMeal.strMealThumb,
          mealIconEmoji: normalizedMeal.mealIconEmoji,
          meal: normalizedMeal,
          savedAt: new Date().toISOString(),
        },
        ...prev,
      ];
    });
  };

  const removeSavedRecipe = (id: string) => {
    setSavedRecipes((prev) => prev.filter((item) => item.id !== id));
  };

  const isRecipeSaved = (id: string) => savedRecipes.some((item) => item.id === id);

  // --- Hydration State ---
  const [hydrationHistory, setHydrationHistory] = useState<any[]>([]);
  const [todayWaterIntake, setTodayWaterIntake] = useState(0);

  // User Story 1.2: Calculate age-based hydration target
  const dailyWaterGoal = useMemo(() => {
    if (!activeChild) return 1000; // Default
    const age = activeChild.age;
    if (age <= 3) return 1000;  // 1-3 years: 1000ml
    if (age <= 8) return 1200;  // 4-8 years: 1200ml
    if (age <= 13) return 1600; // 9-13 years: 1600ml
    return 2000;                // 14+ years: 2000ml
  }, [activeChild]);

  // Load hydration data
  const loadHydrationData = useCallback(async () => {
    if (!activeChild) return;
    const { loadHydrationRecords } = await import('../utils/storage');
    const records = await loadHydrationRecords();
    
    // Filter records for the active child
    const childRecords = records.filter(r => r.childId === activeChild.id);
    setHydrationHistory(childRecords);

    // Calculate today's total
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTotal = childRecords
      .filter(r => r.date === todayStr)
      .reduce((sum, record) => sum + record.amount, 0);
    
    setTodayWaterIntake(todayTotal);
  }, [activeChild]);

  // Call loadHydrationData when active child changes
  useEffect(() => {
    loadHydrationData();
  }, [loadHydrationData]);

  // Function to add water with drink type
  const addWater = async (amount: number, drinkType: string = 'Water') => {
    if (!activeChild) return;
    const { saveHydrationRecord } = await import('../utils/storage');
    
    const newRecord = {
      id: Date.now().toString(),
      childId: activeChild.id,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      amount: amount,
      drinkType: drinkType
    };

    await saveHydrationRecord(newRecord);
    await loadHydrationData(); // Refresh state
  };

  // --- Activity State ---
const [activityHistory, setActivityHistory] = useState<any[]>([]);
const [todayActivityMinutes, setTodayActivityMinutes] = useState(0);
const dailyActivityGoal = 60; 

const loadActivityData = useCallback(async () => {
  if (!activeChild) return;
  // Dynamic import to match your hydration style
  const { loadActivityRecords } = await import('../utils/storage');
  const records = await loadActivityRecords();
  
  const childRecords = records.filter(r => r.childId === activeChild.id);
  setActivityHistory(childRecords);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTotal = childRecords
    .filter(r => r.date === todayStr)
    .reduce((sum, record) => sum + record.minutes, 0);
  
  setTodayActivityMinutes(todayTotal);
}, [activeChild]);

useEffect(() => {
  loadActivityData();
}, [loadActivityData]);

const addActivity = async (minutes: number, activityType: string = 'General Play') => {
  if (!activeChild) return;
  const { saveActivityRecord } = await import('../utils/storage');
  
  const newRecord = {
    id: Date.now().toString(),
    childId: activeChild.id,
    date: new Date().toISOString().split('T')[0],
    timestamp: Date.now(),
    minutes: minutes,
    activityType: activityType
  };

  await saveActivityRecord(newRecord);
  await loadActivityData(); 
};

  return (
    <ChildProfileContext.Provider
      value={{
        children: childrenList,
        activeChild,
        setActiveChild,
        addChild,
        updateChild,
        removeChild,
        switchToChild,
        getOwnerKey,
        meals,
        weeklyMeals,
        selectedDate,
        setSelectedDate,
        getMealsForDate,
        generateNewMealPlan,
        replaceMeal,
        deleteMeal,
        toggleMeal,
        nutritionNeeds,
        nutritionProgress,
        setNutritionNeeds,
        getTip,
        shoppingList,
        toggleShoppingItem,
        getShoppingProgress,
        savedRecipes,
        addSavedRecipe,
        removeSavedRecipe,
        isRecipeSaved,
        reloadChildProfileData,
        reloadFromStorage: reloadChildProfileData,
        refreshFromStorage: reloadChildProfileData,
        loadFromStorage: reloadChildProfileData,
        dailyWaterGoal,
        todayWaterIntake,
        hydrationHistory,
        addWater,
        dailyActivityGoal,
        todayActivityMinutes,
        activityHistory,
        addActivity,
      }}
    >
      {childrenProp}
    </ChildProfileContext.Provider>
  );
}

export function useChildProfile() {
  const context = useContext(ChildProfileContext);
  if (!context) throw new Error('useChildProfile must be used within ChildProfileProvider');
  return context;
}
