import AsyncStorage from "@react-native-async-storage/async-storage";

export interface HealthRecord {
  id: string;
  date: string;       // 建议存当前时间戳或格式化日期
  nickname: string;   // 👈 新增：区分是谁测的（如：爸爸、Me）
  ageText: string;    // 👈 存 "20Years 3Months" 这种展示文本
  ageInMonths: number;
  height: number;
  weight: number;
  gender: number;     // 1: 男, 0: 女
  bmiValue: number;   // 具体的 BMI 数字
  adviceText: string; // 👈 关键：存 Java 后端返回的那段 resultText！
  
  // 👉 新增下面这一行，解决 'status' 不存在的报错
  // 加 '?' 代表它是可选的，这样你之前存在手机里的老数据就不会报错
  status?: string;    
}

const HEALTH_RECORDS_KEY = "healthRecords";

export async function loadHealthRecords(): Promise<HealthRecord[]> {
  try {
    const stored = await AsyncStorage.getItem(HEALTH_RECORDS_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as HealthRecord[];
  } catch {
    return [];
  }
}

export async function saveHealthRecord(record: HealthRecord): Promise<HealthRecord[]> {
  const records = await loadHealthRecords();
  // 👉 改为 [record, ...records]，让最新的记录排在第一位
  const updatedRecords = [record, ...records]; 
  await AsyncStorage.setItem(HEALTH_RECORDS_KEY, JSON.stringify(updatedRecords));
  return updatedRecords;
}

// 💡 修复后的批量删除逻辑
export const deleteHealthRecords = async (idsToDelete: string[]) => {
  try {
    const records = await loadHealthRecords();
    
    // 🚨 核心修复 1：强制把 record.id 转成 String，完美兼容你导入的 JSON 数据！
    const updatedRecords = records.filter(record => !idsToDelete.includes(String(record.id)));
    
    // 🚨 核心修复 2：使用统一的 HEALTH_RECORDS_KEY 把过滤后的数据重新写回硬盘！
    await AsyncStorage.setItem(HEALTH_RECORDS_KEY, JSON.stringify(updatedRecords)); 
    
    return true;
  } catch (error) {
    console.error("Failed to delete records", error);
    return false;
  }
};

export async function clearHealthRecords(): Promise<void> {
  await AsyncStorage.removeItem(HEALTH_RECORDS_KEY);
}

// --- HYDRATION STORAGE ---
export interface HydrationRecord {
  id: string;
  childId: number; 
  date: string;    
  timestamp: number; 
  amount: number;  
  drinkType: string; 
}

const HYDRATION_RECORDS_KEY = "hydrationRecords";

export async function loadHydrationRecords(): Promise<HydrationRecord[]> {
  try {
    const stored = await AsyncStorage.getItem(HYDRATION_RECORDS_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as HydrationRecord[];
  } catch {
    return [];
  }
}

export async function saveHydrationRecord(record: HydrationRecord): Promise<HydrationRecord[]> {
  const records = await loadHydrationRecords();
  const updatedRecords = [record, ...records]; 
  await AsyncStorage.setItem(HYDRATION_RECORDS_KEY, JSON.stringify(updatedRecords));
  return updatedRecords;
}

export interface ActivityRecord {
  id: string;
  childId: number;
  date: string;      // YYYY-MM-DD
  timestamp: number;
  minutes: number;
  activityType: string;
}

const ACTIVITY_RECORDS_KEY = "activityRecords";

/**
 * Loads all physical activity records from storage
 */
export async function loadActivityRecords(): Promise<ActivityRecord[]> {
  try {
    const stored = await AsyncStorage.getItem(ACTIVITY_RECORDS_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as ActivityRecord[];
  } catch (error) {
    console.error("Error loading activity records:", error);
    return [];
  }
}

/**
 * Saves a new activity record and returns the updated list
 */
export async function saveActivityRecord(record: ActivityRecord): Promise<ActivityRecord[]> {
  try {
    const records = await loadActivityRecords();
    const updatedRecords = [record, ...records];
    await AsyncStorage.setItem(ACTIVITY_RECORDS_KEY, JSON.stringify(updatedRecords));
    return updatedRecords;
  } catch (error) {
    console.error("Error saving activity record:", error);
    return [];
  }
}

export default {};