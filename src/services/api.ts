const BASE_URL = 'https://jom-healthy-java.onrender.com';

const pickNumber = (value: any, fallback = 0): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export type FoodNutrition = {
  name: string;
  calories: number;
  servingSize: string;
  nutrients: Record<string, { value: number; unit: string; daily?: number }>;
  raw?: any;
};

export type NutritionNeeds = {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  raw?: any;
};

async function safeFetchJson(url: string, method: 'GET' | 'POST' = 'GET'): Promise<ApiResult<any>> {
  try {
    const response = await fetch(url, {
      method,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return { ok: false, message: `Server error: ${response.status}` };
    }

    const text = await response.text();
    if (!text) {
      return { ok: false, message: 'Empty response from server' };
    }

    try {
      return { ok: true, data: JSON.parse(text) };
    } catch {
      return { ok: false, message: 'Invalid response format' };
    }
  } catch (error) {
    console.log('API fetch failed:', error);
    return {
      ok: false,
      message: 'Network error. Please check your connection and try again.',
    };
  }
}

function normalizeFoodNutrition(json: any, fallbackName: string): FoodNutrition {
  const data = json?.data ?? json?.result ?? json;
  const nutrients = data?.nutrients ?? data?.nutrition ?? data;

  const calories = pickNumber(data?.calories ?? data?.energyKcal ?? data?.kcal ?? nutrients?.calories ?? nutrients?.energyKcal, 0);
  const carbs = pickNumber(data?.carbs ?? data?.carbohydrate ?? data?.carbohydrates ?? nutrients?.carbs ?? nutrients?.carbohydrate ?? nutrients?.carbohydrates, 0);
  const protein = pickNumber(data?.protein ?? nutrients?.protein, 0);
  const fat = pickNumber(data?.fat ?? data?.totalFat ?? nutrients?.fat ?? nutrients?.totalFat, 0);
  const fiber = pickNumber(data?.fiber ?? nutrients?.fiber, 0);
  const sugar = pickNumber(data?.sugar ?? nutrients?.sugar, 0);
  const sodium = pickNumber(data?.sodium ?? nutrients?.sodium, 0);

  return {
    name: data?.name ?? data?.foodName ?? fallbackName,
    calories,
    servingSize: data?.servingSize ?? data?.serving ?? '1 serving',
    nutrients: {
      carbs: { value: carbs, unit: 'g' },
      protein: { value: protein, unit: 'g' },
      fat: { value: fat, unit: 'g' },
      fiber: { value: fiber, unit: 'g' },
      sugar: { value: sugar, unit: 'g' },
      sodium: { value: sodium, unit: 'mg' },
    },
    raw: json,
  };
}

function normalizeNutritionNeeds(json: any): NutritionNeeds {
  const data = json?.data ?? json?.result ?? json;
  const macros = data?.macros ?? data?.nutrients ?? data;

  return {
    calories: pickNumber(data?.calories ?? data?.energyKcal ?? data?.tee ?? data?.energy ?? macros?.calories, 0),
    carbs: pickNumber(data?.carbs ?? data?.carbohydrate ?? data?.carbohydrates ?? macros?.carbs ?? macros?.carbohydrate ?? macros?.carbohydrates, 155),
    protein: pickNumber(data?.protein ?? macros?.protein, 32),
    fat: pickNumber(data?.fat ?? data?.totalFat ?? macros?.fat ?? macros?.totalFat, 28),
    raw: json,
  };
}

export async function getFoodNutrition(name: string): Promise<ApiResult<FoodNutrition>> {
  const url = `${BASE_URL}/food/getFoodNutrition?name=${encodeURIComponent(name)}`;
  const result = await safeFetchJson(url, 'POST');
  if (!result.ok) return result;
  return { ok: true, data: normalizeFoodNutrition(result.data, name) };
}

export async function getFoodNutritionNeeds(params: {
  heightCm: number;
  weightKg: number;
  ageMonths: number;
  gender: number;
}): Promise<ApiResult<NutritionNeeds>> {
  const query = new URLSearchParams({
    heightCm: String(params.heightCm),
    weightKg: String(params.weightKg),
    ageMonths: String(params.ageMonths),
    gender: String(params.gender),
  });
  const result = await safeFetchJson(`${BASE_URL}/food/getFoodNutritionNeeds?${query.toString()}`);
  if (!result.ok) return result;
  return { ok: true, data: normalizeNutritionNeeds(result.data) };
}
