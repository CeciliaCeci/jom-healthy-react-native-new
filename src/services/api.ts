const API_BASE_URL = 'https://jom-healthy-java.onrender.com';

type ApiResult<T> = {
  ok: boolean;
  data?: T;
  message: string;
  status?: number;
};

async function safeFetchJson<T>(url: string, options?: RequestInit): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, options);
    const text = await response.text();

    let json: any = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: json,
        message:
          typeof json?.message === 'string'
            ? json.message
            : `Server error ${response.status}`,
      };
    }

    return {
      ok: true,
      status: response.status,
      data: json as T,
      message: 'success',
    };
  } catch (error: any) {
    return {
      ok: false,
      message: error?.message || 'Network error. Please try again.',
    };
  }
}

export async function searchMeals(name: string) {
  const url = `${API_BASE_URL}/meal/search?name=${encodeURIComponent(name)}`;

  return safeFetchJson<any>(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });
}

export async function generateMealPlanByAi(params: {
  childName?: string;
  age?: number;
  gender?: 'boy' | 'girl' | string;
  heightCm?: number;
  weightKg?: number;
  allergies?: string[];
  restrictions?: any;
  targetCarbs?: number;
  targetProtein?: number;
  targetFat?: number;
  days?: number;
  mealPreference?: string;
}) {
  const url = `${API_BASE_URL}/meal/generatePlan`;

  return safeFetchJson<any>(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
}

export { API_BASE_URL, safeFetchJson };
