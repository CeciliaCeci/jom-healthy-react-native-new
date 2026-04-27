import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  ReactNode,
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

  /**
   * 用于 Meal / Shopping / SavedRecipes 按用户分开存储。
   * 没有小孩档案时返回 guest。
   * 有小孩档案时返回 child-id。
   */
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

const ChildProfileContext = createContext<ChildProfileContextType | undefined>(
  undefined
);

const CHILDREN_STORAGE_KEY = 'JOMHEALTHY_CHILDREN_V1';
const ACTIVE_CHILD_STORAGE_KEY = 'JOMHEALTHY_ACTIVE_CHILD_ID_V1';
const CHILD_MEALS_STORAGE_KEY = 'JOMHEALTHY_CONTEXT_CHILD_MEALS_V1';
const NUTRITION_NEEDS_STORAGE_KEY = 'JOMHEALTHY_NUTRITION_NEEDS_BY_OWNER_V1';
const SAVED_RECIPES_STORAGE_KEY = 'JOMHEALTHY_SAVED_RECIPES_BY_OWNER_V1';
const SHOPPING_LIST_STORAGE_KEY = 'JOMHEALTHY_CONTEXT_SHOPPING_BY_OWNER_V1';

const GUEST_OWNER_KEY = 'guest';

const pad2 = (value: number) => String(value).padStart(2, '0');

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;

const getTodayDateString = (): string => toDateKey(new Date());

const addDays = (dateString: string, days: number) => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};

const getOwnerKeyFromChild = (child: ChildProfile | null) => {
  return child ? `child-${child.id}` : GUEST_OWNER_KEY;
};

const mealPools: Record<Meal['type'], Omit<Meal, 'id' | 'type'>[]> = {
  breakfast: [
    {
      name: 'Oatmeal with Banana & Milk',
      carbs: 48,
      protein: 12,
      fat: 8,
      imageUrl:
        'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=800&h=400&fit=crop',
      ingredients: [
        { name: 'Oats', quantity: '1 bowl', category: 'carbs' },
        { name: 'Banana', quantity: '1 piece', category: 'others' },
        { name: 'Milk', quantity: '1 cup', category: 'others' },
      ],
      steps: [
        'Cook oats with milk.',
        'Slice banana.',
        'Serve warm with banana on top.',
      ],
    },
    {
      name: 'Scrambled Eggs with Toast',
      carbs: 36,
      protein: 18,
      fat: 11,
      imageUrl:
        'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&h=400&fit=crop',
      ingredients: [
        { name: 'Eggs', quantity: '2 eggs', category: 'protein' },
        { name: 'Whole wheat bread', quantity: '2 slices', category: 'carbs' },
        { name: 'Tomato', quantity: '1 small', category: 'vegetables' },
      ],
      steps: [
        'Whisk eggs.',
        'Scramble on low heat.',
        'Toast bread and serve with tomato.',
      ],
    },
  ],
  lunch: [
    {
      name: 'Grilled Chicken Rice with Vegetables',
      carbs: 58,
      protein: 32,
      fat: 12,
      imageUrl:
        'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=400&fit=crop',
      ingredients: [
        { name: 'Chicken breast', quantity: '150g', category: 'protein' },
        { name: 'Rice', quantity: '1 cup', category: 'carbs' },
        { name: 'Broccoli', quantity: '1 cup', category: 'vegetables' },
      ],
      steps: [
        'Grill chicken until cooked.',
        'Cook rice.',
        'Steam vegetables and serve together.',
      ],
    },
    {
      name: 'Chicken Pasta Primavera',
      carbs: 62,
      protein: 28,
      fat: 14,
      imageUrl:
        'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&h=400&fit=crop',
      ingredients: [
        { name: 'Pasta', quantity: '1 plate', category: 'carbs' },
        { name: 'Chicken', quantity: '120g', category: 'protein' },
        { name: 'Mixed vegetables', quantity: '1 cup', category: 'vegetables' },
      ],
      steps: [
        'Boil pasta.',
        'Cook chicken.',
        'Mix with vegetables and light sauce.',
      ],
    },
  ],
  dinner: [
    {
      name: 'Fish Soup with Rice',
      carbs: 45,
      protein: 27,
      fat: 9,
      imageUrl:
        'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=400&fit=crop',
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
      imageUrl:
        'https://images.unsplash.com/photo-1552611052-33e04de081de?w=800&h=400&fit=crop',
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
      imageUrl:
        'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&h=400&fit=crop',
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
      imageUrl:
        'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800&h=400&fit=crop',
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

const generateMealsForDay = (): Meal[] => [
  makeMeal('breakfast'),
  makeMeal('lunch'),
  makeMeal('dinner'),
  makeMeal('snack'),
];

function buildShoppingListFromMeals(meals: Meal[]): ShoppingItem[] {
  const map = new Map<string, ShoppingItem>();

  meals.forEach((meal) => {
    meal.ingredients?.forEach((ingredient) => {
      const id = `${ingredient.name.toLowerCase()}-${ingredient.category}`.replace(
        /\s+/g,
        '-'
      );

      const existing = map.get(id);

      if (existing) {
        existing.source = existing.source.includes(meal.name)
          ? existing.source
          : `${existing.source}, ${meal.name}`;
        return;
      }

      map.set(id, {
        id,
        name: ingredient.name,
        category: ingredient.category,
        source: meal.name,
        mealId: meal.id,
        checked: false,
      });
    });
  });

  return Array.from(map.values());
}

export function ChildProfileProvider({
  children: childrenProp,
}: {
  children: ReactNode;
}) {
  const [childrenList, setChildrenList] = useState<ChildProfile[]>([]);
  const [activeChild, setActiveChildState] = useState<ChildProfile | null>(null);

  /**
   * childMeals 现在支持 guest。
   * key 可以是：
   * guest
   * child-1
   * child-2
   */
  const [childMeals, setChildMeals] = useState<
    Record<string, Record<string, Meal[]>>
  >({});

  const [selectedDate, setSelectedDate] =
    useState<string>(getTodayDateString());

  const [nutritionNeedsByOwner, setNutritionNeedsByOwner] = useState<
    Record<string, NutritionNeeds>
  >({});

  const [savedRecipesByOwner, setSavedRecipesByOwner] = useState<
    Record<string, SavedRecipe[]>
  >({});

  const [shoppingListByOwner, setShoppingListByOwner] = useState<
    Record<string, ShoppingItem[]>
  >({});

  const [loaded, setLoaded] = useState(false);

  const ownerKey = getOwnerKeyFromChild(activeChild);

  const nutritionNeeds = nutritionNeedsByOwner[ownerKey] || {
    calories: 0,
    carbs: 155,
    protein: 32,
    fat: 28,
  };

  const savedRecipes = savedRecipesByOwner[ownerKey] || [];
  const shoppingList = shoppingListByOwner[ownerKey] || [];

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [
          rawChildren,
          rawActiveChildId,
          rawMeals,
          rawNutritionNeeds,
          rawSavedRecipes,
          rawShoppingList,
        ] = await Promise.all([
          AsyncStorage.getItem(CHILDREN_STORAGE_KEY),
          AsyncStorage.getItem(ACTIVE_CHILD_STORAGE_KEY),
          AsyncStorage.getItem(CHILD_MEALS_STORAGE_KEY),
          AsyncStorage.getItem(NUTRITION_NEEDS_STORAGE_KEY),
          AsyncStorage.getItem(SAVED_RECIPES_STORAGE_KEY),
          AsyncStorage.getItem(SHOPPING_LIST_STORAGE_KEY),
        ]);

        const parsedChildren: ChildProfile[] = rawChildren
          ? JSON.parse(rawChildren)
          : [];

        const validChildren = Array.isArray(parsedChildren)
          ? parsedChildren
          : [];

        setChildrenList(validChildren);

        const parsedActiveChildId = rawActiveChildId
          ? Number(rawActiveChildId)
          : null;

        if (
          parsedActiveChildId &&
          validChildren.some((child) => child.id === parsedActiveChildId)
        ) {
          const matchedChild =
            validChildren.find((child) => child.id === parsedActiveChildId) ||
            null;
          setActiveChildState(matchedChild);
        } else if (validChildren.length > 0) {
          setActiveChildState(validChildren[0]);
        } else {
          setActiveChildState(null);
        }

        if (rawMeals) {
          const parsedMeals = JSON.parse(rawMeals);
          setChildMeals(parsedMeals && typeof parsedMeals === 'object' ? parsedMeals : {});
        }

        if (rawNutritionNeeds) {
          const parsedNeeds = JSON.parse(rawNutritionNeeds);
          setNutritionNeedsByOwner(
            parsedNeeds && typeof parsedNeeds === 'object' ? parsedNeeds : {}
          );
        }

        if (rawSavedRecipes) {
          const parsedRecipes = JSON.parse(rawSavedRecipes);
          setSavedRecipesByOwner(
            parsedRecipes && typeof parsedRecipes === 'object' ? parsedRecipes : {}
          );
        }

        if (rawShoppingList) {
          const parsedShopping = JSON.parse(rawShoppingList);
          setShoppingListByOwner(
            parsedShopping && typeof parsedShopping === 'object'
              ? parsedShopping
              : {}
          );
        }
      } catch (error) {
        console.log('Load child profile context failed:', error);
      } finally {
        setLoaded(true);
      }
    };

    loadAll();
  }, []);

  useEffect(() => {
    if (!loaded) return;

    AsyncStorage.setItem(CHILDREN_STORAGE_KEY, JSON.stringify(childrenList)).catch(
      (error) => {
        console.log('Save children failed:', error);
      }
    );
  }, [childrenList, loaded]);

  useEffect(() => {
    if (!loaded) return;

    if (activeChild) {
      AsyncStorage.setItem(ACTIVE_CHILD_STORAGE_KEY, String(activeChild.id)).catch(
        (error) => {
          console.log('Save active child failed:', error);
        }
      );
    } else {
      AsyncStorage.removeItem(ACTIVE_CHILD_STORAGE_KEY).catch(() => {});
    }
  }, [activeChild, loaded]);

  useEffect(() => {
    if (!loaded) return;

    AsyncStorage.setItem(
      CHILD_MEALS_STORAGE_KEY,
      JSON.stringify(childMeals)
    ).catch((error) => {
      console.log('Save meals failed:', error);
    });
  }, [childMeals, loaded]);

  useEffect(() => {
    if (!loaded) return;

    AsyncStorage.setItem(
      NUTRITION_NEEDS_STORAGE_KEY,
      JSON.stringify(nutritionNeedsByOwner)
    ).catch((error) => {
      console.log('Save nutrition needs failed:', error);
    });
  }, [nutritionNeedsByOwner, loaded]);

  useEffect(() => {
    if (!loaded) return;

    AsyncStorage.setItem(
      SAVED_RECIPES_STORAGE_KEY,
      JSON.stringify(savedRecipesByOwner)
    ).catch((error) => {
      console.log('Save saved recipes failed:', error);
    });
  }, [savedRecipesByOwner, loaded]);

  useEffect(() => {
    if (!loaded) return;

    AsyncStorage.setItem(
      SHOPPING_LIST_STORAGE_KEY,
      JSON.stringify(shoppingListByOwner)
    ).catch((error) => {
      console.log('Save shopping list failed:', error);
    });
  }, [shoppingListByOwner, loaded]);

  const setActiveChild = (child: ChildProfile | null) => {
    setActiveChildState(child);
  };

  const addChild = (child: ChildProfile) => {
    setChildrenList((prev) => {
      const exists = prev.some((item) => item.id === child.id);

      if (exists) {
        return prev.map((item) => (item.id === child.id ? child : item));
      }

      return [...prev, child];
    });

    setChildMeals((prev) => ({
      ...prev,
      [`child-${child.id}`]: prev[`child-${child.id}`] ?? {},
    }));

    setActiveChildState(child);
  };

  const updateChild = (child: ChildProfile) => {
    setChildrenList((prev) =>
      prev.map((item) => (item.id === child.id ? child : item))
    );

    if (activeChild?.id === child.id) {
      setActiveChildState(child);
    }
  };

  const removeChild = (childId: number) => {
    const childOwnerKey = `child-${childId}`;

    setChildrenList((prev) => {
      const next = prev.filter((item) => item.id !== childId);

      if (activeChild?.id === childId) {
        setActiveChildState(next[0] ?? null);
      }

      return next;
    });

    setChildMeals((prev) => {
      const next = { ...prev };
      delete next[childOwnerKey];
      return next;
    });

    setNutritionNeedsByOwner((prev) => {
      const next = { ...prev };
      delete next[childOwnerKey];
      return next;
    });

    setSavedRecipesByOwner((prev) => {
      const next = { ...prev };
      delete next[childOwnerKey];
      return next;
    });

    setShoppingListByOwner((prev) => {
      const next = { ...prev };
      delete next[childOwnerKey];
      return next;
    });
  };

  const switchToChild = (childId: number) => {
    const child = childrenList.find((item) => item.id === childId);

    if (!child) return;

    setActiveChildState(child);

    setChildMeals((prev) => ({
      ...prev,
      [`child-${childId}`]: prev[`child-${childId}`] ?? {},
    }));
  };

  const getOwnerKey = () => getOwnerKeyFromChild(activeChild);

  const weeklyMeals = childMeals[ownerKey] ?? {};
  const meals = weeklyMeals[selectedDate] ?? [];

  const getMealsForDate = (date: string) => {
    return childMeals[ownerKey]?.[date] ?? [];
  };

  const generateNewMealPlan = (days = 1, startDate = selectedDate) => {
    const newDates: Record<string, Meal[]> = {};

    for (let i = 0; i < days; i += 1) {
      newDates[addDays(startDate, i)] = generateMealsForDay();
    }

    setChildMeals((prev) => ({
      ...prev,
      [ownerKey]: {
        ...(prev[ownerKey] ?? {}),
        ...newDates,
      },
    }));

    const allMeals = Object.values(newDates).flat();
    const generatedShoppingList = buildShoppingListFromMeals(allMeals);

    setShoppingListByOwner((prev) => ({
      ...prev,
      [ownerKey]: generatedShoppingList,
    }));
  };

  const replaceMeal = (mealId: string, date = selectedDate) => {
    setChildMeals((prev) => {
      const current = prev[ownerKey]?.[date] ?? [];
      const target = current.find((item) => item.id === mealId);

      if (!target) return prev;

      const nextMeals = current.map((item) =>
        item.id === mealId ? makeMeal(target.type) : item
      );

      setShoppingListByOwner((shoppingPrev) => ({
        ...shoppingPrev,
        [ownerKey]: buildShoppingListFromMeals(nextMeals),
      }));

      return {
        ...prev,
        [ownerKey]: {
          ...(prev[ownerKey] ?? {}),
          [date]: nextMeals,
        },
      };
    });
  };

  const deleteMeal = (mealId: string, date = selectedDate) => {
    setChildMeals((prev) => {
      const nextMeals = (prev[ownerKey]?.[date] ?? []).filter(
        (item) => item.id !== mealId
      );

      setShoppingListByOwner((shoppingPrev) => ({
        ...shoppingPrev,
        [ownerKey]: buildShoppingListFromMeals(nextMeals),
      }));

      return {
        ...prev,
        [ownerKey]: {
          ...(prev[ownerKey] ?? {}),
          [date]: nextMeals,
        },
      };
    });
  };

  const toggleMeal = (mealId: string, date = selectedDate) => {
    setChildMeals((prev) => {
      const current = prev[ownerKey]?.[date] ?? [];

      return {
        ...prev,
        [ownerKey]: {
          ...(prev[ownerKey] ?? {}),
          [date]: current.map((item) =>
            item.id === mealId
              ? { ...item, completed: !item.completed }
              : item
          ),
        },
      };
    });
  };

  const nutritionProgress = useMemo<NutritionProgress>(() => {
    const currentMeals = childMeals[ownerKey]?.[selectedDate] ?? [];

    return {
      calories: {
        current: currentMeals.reduce(
          (sum, item) => sum + item.carbs * 4 + item.protein * 4 + item.fat * 9,
          0
        ),
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
  }, [childMeals, ownerKey, selectedDate, nutritionNeeds]);

  const setNutritionNeeds = (needs: Partial<NutritionNeeds>) => {
    setNutritionNeedsByOwner((prev) => ({
      ...prev,
      [ownerKey]: {
        ...(prev[ownerKey] ?? {
          calories: 0,
          carbs: 155,
          protein: 32,
          fat: 28,
        }),
        ...needs,
      },
    }));
  };

  const getTip = (): string => {
    const proteinPercent =
      (nutritionProgress.protein.current /
        Math.max(nutritionProgress.protein.target, 1)) *
      100;

    const carbsPercent =
      (nutritionProgress.carbs.current /
        Math.max(nutritionProgress.carbs.target, 1)) *
      100;

    if (proteinPercent < 50) {
      return 'I need more protein today! How about some chicken or eggs? 💪';
    }

    if (carbsPercent < 50) {
      return "Let's get some energy! I'd love some rice or noodles! 🍚";
    }

    return "I feel great! We're on track with our nutrition today! 😊";
  };

  const toggleShoppingItem = (itemId: string) => {
    setShoppingListByOwner((prev) => ({
      ...prev,
      [ownerKey]: (prev[ownerKey] ?? []).map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      ),
    }));
  };

  const getShoppingProgress = () => {
    const currentShoppingList = shoppingListByOwner[ownerKey] ?? [];
    const checked = currentShoppingList.filter((item) => item.checked).length;

    return {
      checked,
      total: currentShoppingList.length,
    };
  };

  const addSavedRecipe = (meal: Meal) => {
    setSavedRecipesByOwner((prev) => {
      const current = prev[ownerKey] ?? [];

      if (current.some((item) => item.id === meal.id)) {
        return prev;
      }

      return {
        ...prev,
        [ownerKey]: [
          {
            id: meal.id,
            name: meal.name,
            imageUrl: meal.imageUrl,
            meal,
            savedAt: new Date().toISOString(),
          },
          ...current,
        ],
      };
    });
  };

  const removeSavedRecipe = (id: string) => {
    setSavedRecipesByOwner((prev) => ({
      ...prev,
      [ownerKey]: (prev[ownerKey] ?? []).filter((item) => item.id !== id),
    }));
  };

  const isRecipeSaved = (id: string) => {
    return (savedRecipesByOwner[ownerKey] ?? []).some((item) => item.id === id);
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

  if (!context) {
    throw new Error('useChildProfile must be used within ChildProfileProvider');
  }

  return context;
}