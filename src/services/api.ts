const API_BASE_URL = 'https://jom-healthy-java.onrender.com';

export type NutritionNeeds = {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
};

export type ApiResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      message: string;
    };

async function safeFetchJson<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      return {
        ok: false,
        message: `Server error: ${response.status}`,
      };
    }

    const text = await response.text();

    if (!text) {
      return {
        ok: false,
        message: 'Empty response from server',
      };
    }

    try {
      return {
        ok: true,
        data: JSON.parse(text),
      };
    } catch {
      return {
        ok: false,
        message: 'Invalid response format',
      };
    }
  } catch (error) {
    console.log('API fetch failed:', error);

    return {
      ok: false,
      message: 'Network error. Please check your connection and try again.',
    };
  }
}

export async function getFoodNutrition(name: string) {
  const url = `${API_BASE_URL}/food/getFoodNutrition?name=${encodeURIComponent(
    name
  )}`;

  return safeFetchJson<any>(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  });
}

export async function getFoodNutritionNeeds(params: {
  heightCm: number;
  weightKg: number;
  ageMonths: number;
  gender: number;
}) {
  const query = new URLSearchParams({
    heightCm: String(params.heightCm),
    weightKg: String(params.weightKg),
    ageMonths: String(params.ageMonths),
    gender: String(params.gender),
  });

  const url = `${API_BASE_URL}/food/getFoodNutritionNeeds?${query.toString()}`;

  return safeFetchJson<any>(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });
}

export async function searchMeals(keyword: string) {
  const url = `${API_BASE_URL}/meal/search?keyword=${encodeURIComponent(
    keyword
  )}`;

  return safeFetchJson<any>(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  });
}