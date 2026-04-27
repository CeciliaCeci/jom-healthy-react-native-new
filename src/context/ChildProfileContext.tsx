import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
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
  carbs: number;
  protein: number;
  fat: number;
  completed?: boolean;
  ingredients?: Ingredient[];
  steps?: string[];
  imageUrl?: string;
}

interface ShoppingItem {
  id: string;
  name: string;
  category: 'vegetables' | 'protein' | 'carbs' | 'others';
  source: string;
  mealId: string;
  checked: boolean;
}

interface SavedRecipe {
  id: string;
  name: string;
  imageUrl?: string;
  meal?: Meal;
  savedAt: string;
}

interface NutritionProgress {
  calories: { current: number; target: number };
  carbs: { current: number; target: number };
  protein: { current: number; target: number };
  fat: { current: number; target: number };
}

interface ChildProfileContextType {
  children: ChildProfile[];
  activeChild: ChildProfile | null;
  setActiveChild: (child: ChildProfile | null) => void;
  addChild: (child: ChildProfile) => void;
  updateChild: (child: ChildProfile) => void;
  removeChild: (childId: number) => void;
  switchToChild: (childId: number) => void;
  meals: Meal[];
  weeklyMeals: Record<string, Meal[]>;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  getMealsForDate: (date: string) => Meal[];
  generateNewMealPlan: (days?: number, startDate?: string) => void;
  replaceMeal: (mealId: string, date?: string) => void;
  deleteMeal: (mealId: string, date?: string) => void;
  toggleMeal: (mealId: string, date?: string) => void;
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
}

const ChildProfileContext = createContext<ChildProfileContextType | undefined>(undefined);

const pad2 = (value: number) => String(value).padStart(2, '0');
const toDateKey = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const getTodayDateString = (): string => toDateKey(new Date());

const addDays = (dateString: string, days: number) => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};

const mealPools: Record<Meal['type'], Omit<Meal, 'id' | 'type'>[]> = {
  breakfast: [
    {
      name: 'Oatmeal with Banana & Milk',
      carbs: 48,
      protein: 12,
      fat: 8,
      imageUrl: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=800&h=400&fit=crop',
      ingredients: [
        { name: 'Oats', quantity: '1 bowl', category: 'carbs' },
        { name: 'Banana', quantity: '1 piece', category: 'others' },
        { name: 'Milk', quantity: '1 cup', category: 'others' },
      ],
      steps: ['Cook oats with milk.', 'Slice banana.', 'Serve warm with banana on top.'],
    },
    {
      name: 'Scrambled Eggs with Toast',
      carbs: 36,
      protein: 18,
      fat: 11,
      imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&h=400&fit=crop',
      ingredients: [
        { name: 'Eggs', quantity: '2 eggs', category: 'protein' },
        { name: 'Whole wheat bread', quantity: '2 slices', category: 'carbs' },
        { name: 'Tomato', quantity: '1 small', category: 'vegetables' },
      ],
      steps: ['Whisk eggs.', 'Scramble on low heat.', 'Toast bread and serve with tomato.'],
    },
  ],
  lunch: [
    {
      name: 'Grilled Chicken Rice with Vegetables',
      carbs: 58,
      protein: 32,
      fat: 12,
      imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=400&fit=crop',
      ingredients: [
        { name: 'Chicken breast', quantity: '150g', category: 'protein' },
        { name: 'Rice', quantity: '1 cup', category: 'carbs' },
        { name: 'Broccoli', quantity: '1 cup', category: 'vegetables' },
      ],
      steps: ['Grill chicken until cooked.', 'Cook rice.', 'Steam vegetables and serve together.'],
    },
    {
      name: 'Chicken Pasta Primavera',
      carbs: 62,
      protein: 28,
      fat: 14,
      imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&h=400&fit=crop',
      ingredients: [
        { name: 'Pasta', quantity: '1 plate', category: 'carbs' },
        { name: 'Chicken', quantity: '120g', category: 'protein' },
        { name: 'Mixed vegetables', quantity: '1 cup', category: 'vegetables' },
      ],
      steps: ['Boil pasta.', 'Cook chicken.', 'Mix with vegetables and light sauce.'],
    },
  ],
  dinner: [
    {
      name: 'Fish Soup with Rice',
      carbs: 45,
      protein: 27,
      fat: 9,
      imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=400&fit=crop',
      ingredients: [
        { name: 'Fish fillet', quantity: '150g', category: 'protein' },
        { name: 'Rice', quantity: '1 cup', category: 'carbs' },
        { name: 'Mushrooms', quantity: '1 cup', category: 'vegetables' },
      ],
      steps: ['Simmer soup base.', 'Add fish and mushrooms.', 'Serve with rice.'],
    },
    {
      name: 'Beef Stir Fry with Noodles',
      carbs: 55,
      protein: 30,
      fat: 16,
      imageUrl: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=800&h=400&fit=crop',
      ingredients: [
        { name: 'Beef', quantity: '120g', category: 'protein' },
        { name: 'Noodles', quantity: '1 plate', category: 'carbs' },
        { name: 'Pak choy', quantity: '1 cup', category: 'vegetables' },
      ],
      steps: ['Cook noodles.', 'Stir fry beef.', 'Add vegetables and noodles.'],
    },
  ],
  snack: [
    {
      name: 'Yogurt with Fresh Fruit',
      carbs: 24,
      protein: 8,
      fat: 4,
      imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&h=400&fit=crop',
      ingredients: [
        { name: 'Yogurt', quantity: '1 cup', category: 'others' },
        { name: 'Fruit', quantity: '1 bowl', category: 'others' },
      ],
      steps: ['Add yogurt to a bowl.', 'Top with fruit.', 'Serve chilled.'],
    },
    {
      name: 'Apple Slices with Peanut Butter',
      carbs: 28,
      protein: 7,
      fat: 9,
      imageUrl: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800&h=400&fit=crop',
      ingredients: [
        { name: 'Apple', quantity: '1 piece', category: 'others' },
        { name: 'Peanut butter', quantity: '2 tbsp', category: 'others' },
      ],
      steps: ['Slice apple.', 'Serve with peanut butter.'],
    },
  ],
};

const makeMeal = (type: Meal['type']): Meal => {
  const pool = mealPools[type];
  const item = pool[Math.floor(Math.random() * pool.length)];
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    ...item,
  };
};

const generateMealsForDay = (): Meal[] => [makeMeal('breakfast'), makeMeal('lunch'), makeMeal('dinner'), makeMeal('snack')];

export function ChildProfileProvider({ children: childrenProp }: { children: ReactNode }) {
  const [childrenList, setChildrenList] = useState<ChildProfile[]>([]);
  const [activeChild, setActiveChild] = useState<ChildProfile | null>(null);
  const [childMeals, setChildMeals] = useState<Record<number, Record<string, Meal[]>>>({});
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [nutritionNeeds, setNutritionNeedsState] = useState<NutritionNeeds>({ calories: 0, carbs: 155, protein: 32, fat: 28 });
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);

  const addChild = (child: ChildProfile) => {
    setChildrenList((prev) => [...prev, child]);
    setChildMeals((prev) => ({ ...prev, [child.id]: {} }));
    setActiveChild(child);
  };

  const updateChild = (child: ChildProfile) => {
    setChildrenList((prev) => prev.map((item) => (item.id === child.id ? child : item)));
    if (activeChild?.id === child.id) setActiveChild(child);
  };

  const removeChild = (childId: number) => {
    setChildrenList((prev) => {
      const next = prev.filter((item) => item.id !== childId);
      if (activeChild?.id === childId) setActiveChild(next[0] ?? null);
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
    setActiveChild(child);
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

  const toggleMeal = () => {};

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
    setSavedRecipes((prev) => {
      if (prev.some((item) => item.id === meal.id)) return prev;
      return [{ id: meal.id, name: meal.name, imageUrl: meal.imageUrl, meal, savedAt: new Date().toISOString() }, ...prev];
    });
  };

  const removeSavedRecipe = (id: string) => {
    setSavedRecipes((prev) => prev.filter((item) => item.id !== id));
  };

  const isRecipeSaved = (id: string) => savedRecipes.some((item) => item.id === id);

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
        meals,
        weeklyMeals,
        selectedDate,
        setSelectedDate,
        getMealsForDate,
        generateNewMealPlan,
        replaceMeal,
        deleteMeal,
        toggleMeal,
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
