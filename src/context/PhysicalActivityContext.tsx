import React, { createContext, useState, useContext, useEffect } from 'react';
import { useChildProfile } from './ChildProfileContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PhysicalActivityContextType {
  todayTotal: number;
  dailyGoal: number;
  logMinutes: (mins: number) => void;
  updateGoal: (newGoal: number) => Promise<void>;
}

const PhysicalActivityContext = createContext<PhysicalActivityContextType | undefined>(undefined);

export const PhysicalActivityProvider = ({ children }: { children: React.ReactNode }) => {
  const { activeChild } = useChildProfile();
  const [todayTotal, setTodayTotal] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(60);

  const storageKey = activeChild ? `@activity_data_${activeChild.id}` : null;
  const dateKey = activeChild ? `@last_log_date_${activeChild.id}` : null;
  const goalKey = activeChild ? `@daily_goal_${activeChild.id}` : null;

  // 1. Load data and check the date when the app starts
  useEffect(() => {
    if (!storageKey || !dateKey || !goalKey) return;

    const loadPersistedData = async () => {
      try {
        const savedData = await AsyncStorage.getItem(storageKey);
        const savedGoal = await AsyncStorage.getItem(goalKey);
        const lastDate = await AsyncStorage.getItem(dateKey);
        const today = new Date().toDateString();

        if (savedData !== null && lastDate === today) {
          setTodayTotal(JSON.parse(savedData));
        } else {
          setTodayTotal(0); // Reset for new day or new profile
        }
        if (savedGoal) {
          setDailyGoal(JSON.parse(savedGoal));
        } else {
          setDailyGoal(60); // Default
        }
      } catch (e) {
        console.error("Failed to load activity", e);
      }
    };

    loadPersistedData();
  }, [activeChild]); // Re-run when you switch children!

  const logMinutes = async (mins: number) => {
    if (!storageKey || !dateKey) return;

    const newTotal = todayTotal + mins;
    setTodayTotal(newTotal);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(newTotal));
      await AsyncStorage.setItem(dateKey, new Date().toDateString());
    } catch (e) {
      console.error("Failed to save activity", e);
    }
  };

  const updateGoal = async (newGoal: number) => {
    setDailyGoal(newGoal);
    if (goalKey) await AsyncStorage.setItem(goalKey, JSON.stringify(newGoal));
  };  

  return (
    <PhysicalActivityContext.Provider value={{ todayTotal, dailyGoal, logMinutes, updateGoal }}>
      {children}
    </PhysicalActivityContext.Provider>
  );
};

export const useActivity = () => {
  const context = useContext(PhysicalActivityContext);
  if (!context) throw new Error('useActivity must be used within PhysicalActivityProvider');
  return context;
};