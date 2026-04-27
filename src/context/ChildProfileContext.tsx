import { createContext, useContext, useState, ReactNode } from 'react';

interface ChildProfile {
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
  preferences?: string[]; // e.g., ['High Protein', 'Low Sugar', 'Balanced']
  allergies?: string[];
}

interface Meal {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  carbs: number;
  protein: number;
  fat: number;
  completed: boolean;
  ingredients?: Ingredient[];
  steps?: string[];
  imageUrl?: string;
}

interface Ingredient {
  name: string;
  quantity: string;
  category: 'vegetables' | 'protein' | 'carbs' | 'others';
}

interface ShoppingItem {
  id: string;
  name: string;
  category: 'vegetables' | 'protein' | 'carbs' | 'others';
  source: string; // e.g., "from Lunch: Grilled Chicken Rice"
  mealId: string;
  checked: boolean;
}

interface NutritionProgress {
  carbs: { current: number; target: number; lastAdded?: { amount: number; from: string } };
  protein: { current: number; target: number; lastAdded?: { amount: number; from: string } };
  fat: { current: number; target: number; lastAdded?: { amount: number; from: string } };
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
  toggleMeal: (mealId: string, date?: string) => void;
  getMealsForDate: (date: string) => Meal[];
  generateNewMealPlan: () => void;
  nutritionProgress: NutritionProgress;
  getTip: () => string;
  shoppingList: ShoppingItem[];
  toggleShoppingItem: (itemId: string) => void;
  getShoppingProgress: () => { checked: number; total: number };
}

const ChildProfileContext = createContext<ChildProfileContextType | undefined>(undefined);

const generateMealsForDay = (): Meal[] => {
  const mealOptions = {
    breakfast: [
      { 
        name: 'Nasi Lemak with Egg & Nestlé Everyday Milk', 
        carbs: 55, 
        protein: 12, 
        fat: 8,
        ingredients: [
          { name: 'Jasmine rice', quantity: '1 cup', category: 'carbs' as const },
          { name: 'Coconut milk', quantity: '200ml', category: 'others' as const },
          { name: 'Eggs', quantity: '2 eggs', category: 'protein' as const },
          { name: 'Cucumber', quantity: '½ cucumber', category: 'vegetables' as const },
          { name: 'Sambal paste', quantity: '2 tbsp', category: 'others' as const },
          { name: 'Nestlé Everyday Milk', quantity: '1 glass', category: 'others' as const },
        ],
        steps: [
          'Cook jasmine rice with coconut milk and pandan leaves',
          'Fry eggs sunny-side up until edges are crispy',
          'Slice cucumber into thin rounds',
          'Arrange rice on plate with egg, cucumber, and sambal on the side',
          'Serve with a glass of Nestlé Everyday Milk',
        ]
      },
      { 
        name: 'Roti Canai with Dhal & Nestlé Milk', 
        carbs: 50, 
        protein: 10, 
        fat: 9,
        ingredients: [
          { name: 'Roti canai', quantity: '2 pieces', category: 'carbs' as const },
          { name: 'Yellow lentils', quantity: '100g', category: 'protein' as const },
          { name: 'Onion', quantity: '1 medium', category: 'vegetables' as const },
          { name: 'Curry powder', quantity: '1 tbsp', category: 'others' as const },
          { name: 'Nestlé Milk', quantity: '1 glass', category: 'others' as const },
        ],
        steps: [
          'Cook yellow lentils with curry powder, onion, and garlic until soft',
          'Heat roti canai on a pan until crispy',
          'Blend dhal into a smooth curry consistency',
          'Serve roti with dhal curry on the side',
          'Pair with a glass of Nestlé Milk',
        ]
      },
      { 
        name: 'Scrambled Eggs with Toast & Fresh Juice', 
        carbs: 45, 
        protein: 15, 
        fat: 7,
        ingredients: [
          { name: 'Eggs', quantity: '3 eggs', category: 'protein' as const },
          { name: 'Whole wheat bread', quantity: '2 slices', category: 'carbs' as const },
          { name: 'Butter', quantity: '1 tbsp', category: 'others' as const },
          { name: 'Fresh orange', quantity: '2 oranges', category: 'others' as const },
        ],
        steps: [
          'Whisk eggs with a pinch of salt and pepper',
          'Heat butter in a pan and scramble eggs until fluffy',
          'Toast bread slices until golden brown',
          'Squeeze fresh oranges to make juice',
          'Serve scrambled eggs on toast with fresh juice',
        ]
      },
      { 
        name: 'Pancakes with Honey & Nestlé Yogurt', 
        carbs: 60, 
        protein: 8, 
        fat: 6,
        ingredients: [
          { name: 'Flour', quantity: '1 cup', category: 'carbs' as const },
          { name: 'Eggs', quantity: '2 eggs', category: 'protein' as const },
          { name: 'Milk', quantity: '½ cup', category: 'others' as const },
          { name: 'Honey', quantity: '2 tbsp', category: 'others' as const },
          { name: 'Nestlé Yogurt', quantity: '1 cup', category: 'others' as const },
        ],
        steps: [
          'Mix flour, eggs, and milk into a smooth batter',
          'Heat a non-stick pan and pour batter to form pancakes',
          'Cook until bubbles form, then flip and cook the other side',
          'Stack pancakes and drizzle with honey',
          'Serve with Nestlé Yogurt on the side',
        ]
      },
    ],
    lunch: [
      { 
        name: 'Grilled Chicken Rice with Vegetables', 
        carbs: 60, 
        protein: 15, 
        fat: 10,
        ingredients: [
          { name: 'Chicken breast', quantity: '150g', category: 'protein' as const },
          { name: 'Jasmine rice', quantity: '1 cup', category: 'carbs' as const },
          { name: 'Carrots', quantity: '1 medium', category: 'vegetables' as const },
          { name: 'Broccoli', quantity: '100g', category: 'vegetables' as const },
          { name: 'Soy sauce', quantity: '2 tbsp', category: 'others' as const },
        ],
        steps: [
          'Marinate chicken breast with soy sauce and garlic for 15 minutes',
          'Grill chicken on medium heat until fully cooked',
          'Steam jasmine rice until fluffy',
          'Blanch carrots and broccoli until tender-crisp',
          'Serve grilled chicken over rice with vegetables on the side',
        ]
      },
      { 
        name: 'Nasi Goreng with Fried Egg', 
        carbs: 65, 
        protein: 12, 
        fat: 11,
        ingredients: [
          { name: 'Cooked rice', quantity: '2 cups', category: 'carbs' as const },
          { name: 'Eggs', quantity: '2 eggs', category: 'protein' as const },
          { name: 'Shrimp paste', quantity: '1 tbsp', category: 'others' as const },
          { name: 'Vegetables mix', quantity: '1 cup', category: 'vegetables' as const },
          { name: 'Chicken pieces', quantity: '100g', category: 'protein' as const },
        ],
        steps: [
          'Heat oil in a wok and scramble one egg',
          'Add chicken pieces and cook until done',
          'Stir in shrimp paste and vegetables',
          'Add cooked rice and stir-fry until well combined',
          'Fry remaining egg sunny-side up and place on top',
        ]
      },
      { 
        name: 'Fish Curry with Rice & Greens', 
        carbs: 58, 
        protein: 18, 
        fat: 9,
        ingredients: [
          { name: 'Fish fillet', quantity: '200g', category: 'protein' as const },
          { name: 'Curry paste', quantity: '3 tbsp', category: 'others' as const },
          { name: 'Jasmine rice', quantity: '1 cup', category: 'carbs' as const },
          { name: 'Spinach', quantity: '100g', category: 'vegetables' as const },
          { name: 'Coconut milk', quantity: '200ml', category: 'others' as const },
        ],
        steps: [
          'Heat curry paste with coconut milk in a pot',
          'Add fish fillet and simmer until cooked through',
          'Cook jasmine rice separately',
          'Blanch spinach until wilted',
          'Serve fish curry over rice with greens on the side',
        ]
      },
      { 
        name: 'Beef Rendang with Steamed Rice', 
        carbs: 62, 
        protein: 20, 
        fat: 12,
        ingredients: [
          { name: 'Beef chunks', quantity: '200g', category: 'protein' as const },
          { name: 'Rendang paste', quantity: '4 tbsp', category: 'others' as const },
          { name: 'Jasmine rice', quantity: '1 cup', category: 'carbs' as const },
          { name: 'Coconut milk', quantity: '300ml', category: 'others' as const },
        ],
        steps: [
          'Marinate beef chunks with rendang paste for 30 minutes',
          'Cook beef in coconut milk over low heat for 1 hour',
          'Simmer until sauce thickens and beef is tender',
          'Steam jasmine rice until fluffy',
          'Serve beef rendang over steamed rice',
        ]
      },
    ],
    dinner: [
      { 
        name: 'Tom Yam Soup with Jasmine Rice', 
        carbs: 40, 
        protein: 8, 
        fat: 6,
        ingredients: [
          { name: 'Shrimp', quantity: '150g', category: 'protein' as const },
          { name: 'Tom yam paste', quantity: '3 tbsp', category: 'others' as const },
          { name: 'Mushrooms', quantity: '100g', category: 'vegetables' as const },
          { name: 'Jasmine rice', quantity: '1 cup', category: 'carbs' as const },
          { name: 'Lime', quantity: '1 lime', category: 'others' as const },
        ],
        steps: [
          'Boil water and add tom yam paste',
          'Add mushrooms and simmer for 5 minutes',
          'Add shrimp and cook until pink',
          'Squeeze lime juice and serve hot',
          'Serve with steamed jasmine rice on the side',
        ]
      },
      { 
        name: 'Stir-Fried Noodles with Prawns', 
        carbs: 55, 
        protein: 14, 
        fat: 8,
        ingredients: [
          { name: 'Egg noodles', quantity: '200g', category: 'carbs' as const },
          { name: 'Prawns', quantity: '150g', category: 'protein' as const },
          { name: 'Bok choy', quantity: '100g', category: 'vegetables' as const },
          { name: 'Garlic', quantity: '3 cloves', category: 'others' as const },
          { name: 'Soy sauce', quantity: '2 tbsp', category: 'others' as const },
        ],
        steps: [
          'Boil egg noodles until al dente, then drain',
          'Heat oil in a wok and sauté garlic',
          'Add prawns and cook until pink',
          'Toss in bok choy and noodles',
          'Add soy sauce and stir-fry for 2 minutes',
        ]
      },
      { 
        name: 'Grilled Fish with Quinoa & Salad', 
        carbs: 35, 
        protein: 16, 
        fat: 7,
        ingredients: [
          { name: 'Fish fillet', quantity: '200g', category: 'protein' as const },
          { name: 'Quinoa', quantity: '½ cup', category: 'carbs' as const },
          { name: 'Lettuce', quantity: '1 cup', category: 'vegetables' as const },
          { name: 'Tomatoes', quantity: '2 medium', category: 'vegetables' as const },
          { name: 'Lemon', quantity: '1 lemon', category: 'others' as const },
        ],
        steps: [
          'Season fish fillet with salt, pepper, and lemon juice',
          'Grill fish on medium heat for 3-4 minutes per side',
          'Cook quinoa according to package instructions',
          'Prepare salad with lettuce and diced tomatoes',
          'Serve grilled fish with quinoa and fresh salad',
        ]
      },
      { 
        name: 'Vegetable Fried Rice with Chicken', 
        carbs: 58, 
        protein: 12, 
        fat: 9,
        ingredients: [
          { name: 'Cooked rice', quantity: '2 cups', category: 'carbs' as const },
          { name: 'Chicken pieces', quantity: '100g', category: 'protein' as const },
          { name: 'Mixed vegetables', quantity: '1 cup', category: 'vegetables' as const },
          { name: 'Eggs', quantity: '1 egg', category: 'protein' as const },
          { name: 'Soy sauce', quantity: '2 tbsp', category: 'others' as const },
        ],
        steps: [
          'Heat oil in a wok and scramble the egg',
          'Add chicken pieces and cook until done',
          'Toss in mixed vegetables and stir-fry',
          'Add cooked rice and soy sauce',
          'Stir-fry until everything is well combined',
        ]
      },
    ],
    snack: [
      { 
        name: 'Nestlé Yogurt with Fresh Fruits', 
        carbs: 20, 
        protein: 5, 
        fat: 4,
        ingredients: [
          { name: 'Nestlé Yogurt', quantity: '1 cup', category: 'others' as const },
          { name: 'Banana', quantity: '1 banana', category: 'others' as const },
          { name: 'Strawberries', quantity: '5 pieces', category: 'others' as const },
        ],
        steps: [
          'Pour Nestlé Yogurt into a bowl',
          'Slice banana into rounds',
          'Wash and slice strawberries',
          'Top yogurt with fresh fruits',
          'Serve immediately',
        ]
      },
      { 
        name: 'Apple Slices with Peanut Butter', 
        carbs: 25, 
        protein: 6, 
        fat: 8,
        ingredients: [
          { name: 'Apple', quantity: '1 large apple', category: 'others' as const },
          { name: 'Peanut butter', quantity: '2 tbsp', category: 'others' as const },
        ],
        steps: [
          'Wash and core the apple',
          'Slice apple into thin wedges',
          'Arrange apple slices on a plate',
          'Serve with peanut butter for dipping',
        ]
      },
      { 
        name: 'Nestlé Cereal Bar with Milk', 
        carbs: 30, 
        protein: 4, 
        fat: 5,
        ingredients: [
          { name: 'Nestlé Cereal Bar', quantity: '1 bar', category: 'carbs' as const },
          { name: 'Nestlé Milk', quantity: '1 glass', category: 'others' as const },
        ],
        steps: [
          'Unwrap Nestlé Cereal Bar',
          'Pour cold Nestlé Milk into a glass',
          'Serve cereal bar with milk',
        ]
      },
      { 
        name: 'Banana & Nestlé Smoothie', 
        carbs: 28, 
        protein: 6, 
        fat: 3,
        ingredients: [
          { name: 'Banana', quantity: '2 bananas', category: 'others' as const },
          { name: 'Nestlé Milk', quantity: '1 cup', category: 'others' as const },
          { name: 'Honey', quantity: '1 tbsp', category: 'others' as const },
          { name: 'Ice cubes', quantity: '4 cubes', category: 'others' as const },
        ],
        steps: [
          'Peel and slice bananas',
          'Add banana, milk, honey, and ice to a blender',
          'Blend until smooth and creamy',
          'Pour into a glass and serve immediately',
        ]
      },
    ],
  };

  return [
    {
      id: `breakfast-${Date.now()}`,
      type: 'breakfast',
      ...mealOptions.breakfast[Math.floor(Math.random() * mealOptions.breakfast.length)],
      completed: false,
    },
    {
      id: `lunch-${Date.now()}`,
      type: 'lunch',
      ...mealOptions.lunch[Math.floor(Math.random() * mealOptions.lunch.length)],
      completed: false,
    },
    {
      id: `dinner-${Date.now()}`,
      type: 'dinner',
      ...mealOptions.dinner[Math.floor(Math.random() * mealOptions.dinner.length)],
      completed: false,
    },
    {
      id: `snack-${Date.now()}`,
      type: 'snack',
      ...mealOptions.snack[Math.floor(Math.random() * mealOptions.snack.length)],
      completed: false,
    },
  ];
};

const getTodayDateString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const initializeWeeklyMeals = (): Record<string, Meal[]> => {
  const weeklyMeals: Record<string, Meal[]> = {};
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateString = date.toISOString().split('T')[0];
    weeklyMeals[dateString] = generateMealsForDay();
  }

  return weeklyMeals;
};

export function ChildProfileProvider({ children: childrenProp }: { children: ReactNode }) {
  const [childrenList, setChildrenList] = useState<ChildProfile[]>([]);
  const [activeChild, setActiveChild] = useState<ChildProfile | null>(null);
  // Track meals per child: childId -> dateString -> Meal[]
  const [childMeals, setChildMeals] = useState<Record<number, Record<string, Meal[]>>>({});
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([
    { id: '1', name: 'Eggs', category: 'protein', source: 'from Breakfast: Scrambled Eggs with Toast', mealId: 'breakfast-1', checked: false },
    { id: '2', name: 'Chicken breast', category: 'protein', source: 'from Lunch: Grilled Chicken Rice', mealId: 'lunch-1', checked: false },
    { id: '3', name: 'Jasmine rice', category: 'carbs', source: 'from Lunch: Grilled Chicken Rice', mealId: 'lunch-1', checked: false },
    { id: '4', name: 'Carrots', category: 'vegetables', source: 'from Lunch: Grilled Chicken Rice', mealId: 'lunch-1', checked: false },
    { id: '5', name: 'Lettuce', category: 'vegetables', source: 'from Lunch: Grilled Chicken Rice', mealId: 'lunch-1', checked: false },
    { id: '6', name: 'Fish fillet', category: 'protein', source: 'from Dinner: Grilled Fish with Quinoa', mealId: 'dinner-1', checked: false },
    { id: '7', name: 'Quinoa', category: 'carbs', source: 'from Dinner: Grilled Fish with Quinoa', mealId: 'dinner-1', checked: false },
    { id: '8', name: 'Tomatoes', category: 'vegetables', source: 'from Dinner: Grilled Fish with Quinoa', mealId: 'dinner-1', checked: false },
    { id: '9', name: 'Nestlé Yogurt', category: 'others', source: 'from Snack: Yogurt with Fruits', mealId: 'snack-1', checked: false },
    { id: '10', name: 'Fresh fruits', category: 'others', source: 'from Snack: Yogurt with Fruits', mealId: 'snack-1', checked: false },
    { id: '11', name: 'Bread', category: 'carbs', source: 'from Breakfast: Scrambled Eggs with Toast', mealId: 'breakfast-1', checked: false },
  ]);

  const addChild = (child: ChildProfile) => {
    setChildrenList((prev) => [...prev, child]);
    // Initialize meals for new child
    setChildMeals((prev) => ({
      ...prev,
      [child.id]: initializeWeeklyMeals(),
    }));
    setActiveChild(child);
  };

  const updateChild = (child: ChildProfile) => {
    setChildrenList((prev) => prev.map((c) => (c.id === child.id ? child : c)));
    if (activeChild?.id === child.id) {
      setActiveChild(child);
    }
  };

  const removeChild = (childId: number) => {
    setChildrenList((prev) => prev.filter((c) => c.id !== childId));
    // Remove meal data for deleted child
    setChildMeals((prev) => {
      const newMeals = { ...prev };
      delete newMeals[childId];
      return newMeals;
    });
    if (activeChild?.id === childId) {
      const remaining = childrenList.filter((c) => c.id !== childId);
      setActiveChild(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const switchToChild = (childId: number) => {
    const child = childrenList.find((c) => c.id === childId);
    if (child) {
      setActiveChild(child);
      // Initialize meals if they don't exist for this child
      if (!childMeals[childId]) {
        setChildMeals((prev) => ({
          ...prev,
          [childId]: initializeWeeklyMeals(),
        }));
      }
    }
  };

  const todayDateString = getTodayDateString();
  const weeklyMeals = activeChild ? (childMeals[activeChild.id] || {}) : {};
  const meals = weeklyMeals[todayDateString] || [];

  const getMealsForDate = (date: string): Meal[] => {
    if (!activeChild) return [];
    return childMeals[activeChild.id]?.[date] || [];
  };

  const toggleMeal = (mealId: string, date?: string) => {
    if (!activeChild) return;
    const targetDate = date || todayDateString;
    setChildMeals((prev) => ({
      ...prev,
      [activeChild.id]: {
        ...prev[activeChild.id],
        [targetDate]: prev[activeChild.id]?.[targetDate]?.map((meal) =>
          meal.id === mealId ? { ...meal, completed: !meal.completed } : meal
        ) || [],
      },
    }));
  };

  const generateNewMealPlan = () => {
    if (!activeChild) return;
    const newWeeklyMeals: Record<string, Meal[]> = {};
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      newWeeklyMeals[dateString] = generateMealsForDay();
    }

    setChildMeals((prev) => ({
      ...prev,
      [activeChild.id]: newWeeklyMeals,
    }));
  };

  const nutritionProgress: NutritionProgress = {
    carbs: {
      current: meals.filter((m) => m.completed).reduce((sum, m) => sum + m.carbs, 0),
      target: 155,
    },
    protein: {
      current: meals.filter((m) => m.completed).reduce((sum, m) => sum + m.protein, 0),
      target: 32,
    },
    fat: {
      current: meals.filter((m) => m.completed).reduce((sum, m) => sum + m.fat, 0),
      target: 28,
    },
  };

  const getTip = (): string => {
    const carbsPercent = (nutritionProgress.carbs.current / nutritionProgress.carbs.target) * 100;
    const proteinPercent = (nutritionProgress.protein.current / nutritionProgress.protein.target) * 100;
    const fatPercent = (nutritionProgress.fat.current / nutritionProgress.fat.target) * 100;

    const allComplete = carbsPercent >= 100 && proteinPercent >= 100 && fatPercent >= 100;

    if (allComplete) {
      return "Amazing! We've hit all our nutrition goals today! I feel super healthy! ✨";
    }

    if (proteinPercent < 50) {
      return "I need more protein today! How about some chicken or eggs? 💪";
    }

    if (carbsPercent < 50) {
      return "Let's get some energy! I'd love some rice or noodles! 🍚";
    }

    if (fatPercent < 50) {
      return "Need healthy fats! Maybe some avocado or nuts? 🥑";
    }

    if (proteinPercent >= 100) {
      return "Great job on protein! We're doing awesome! Keep it up! 🎉";
    }

    return "I feel great! We're on track with our nutrition today! 😊";
  };

  const toggleShoppingItem = (itemId: string) => {
    setShoppingList((prev) => prev.map((item) => (item.id === itemId ? { ...item, checked: !item.checked } : item)));
  };

  const getShoppingProgress = (): { checked: number; total: number } => {
    const checked = shoppingList.filter((item) => item.checked).length;
    const total = shoppingList.length;
    return { checked, total };
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
        meals,
        weeklyMeals,
        selectedDate,
        setSelectedDate,
        toggleMeal,
        getMealsForDate,
        generateNewMealPlan,
        nutritionProgress,
        getTip,
        shoppingList,
        toggleShoppingItem,
        getShoppingProgress,
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