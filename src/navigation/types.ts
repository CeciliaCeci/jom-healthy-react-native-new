export type MealParam = {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  carbs: number;
  protein: number;
  fat: number;
  completed: boolean;
  ingredients?: { name: string; quantity: string; category: 'vegetables' | 'protein' | 'carbs' | 'others' }[];
  steps?: string[];
  imageUrl?: string;
};

export type RootStackParamList = {
  MainTabs: undefined;
  HealthCheck: undefined;
  Growth: undefined;
  RecipeDetail: { meal: MealParam; date?: string };
  VoiceSearch: undefined;
  CameraSearch: undefined;
  FoodInfo: { foodName?: string; source?: 'search' | 'voice' | 'camera' } | undefined;
  Hydration: undefined;
  PhysicalActivity: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Meal: undefined;
  Shopping: undefined;
  Profile: undefined;
};
