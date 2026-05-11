import React, { useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import { RootStackParamList, MainTabParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import MealScreen from '../screens/MealScreen';
import ShoppingScreen from '../screens/ShoppingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HealthCheckScreen from '../screens/HealthCheckScreen';
import GrowthScreen from '../screens/GrowthScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import VoiceSearchScreen from '../screens/VoiceSearchScreen';
import CameraSearchScreen from '../screens/CameraSearchScreen';
import FoodInfoScreen from '../screens/FoodInfoScreen';
import { AiMealPlanGenerationProvider } from '../context/AiMealPlanGenerationContext';
import HydrationScreen from '../screens/HydrationScreen';
import PhysicalActivityScreen from '../screens/PhysicalActivityScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const navigationRef = createNavigationContainerRef<any>();

function MainTabs() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          height: 78,
          paddingTop: 8,
          paddingBottom: 12,
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 12,
        },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 12 },
        tabBarLabel:
          route.name === 'Home'
            ? t('home')
            : route.name === 'Meal'
              ? t('meal')
              : route.name === 'Shopping'
                ? t('shopping')
                : t('profile'),
        tabBarIcon: ({ color, size }) => {
          const icons: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
            Home: 'home',
            Meal: 'restaurant',
            Shopping: 'cart',
            Profile: 'person',
          };
          return <Ionicons name={icons[route.name as keyof MainTabParamList]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Meal" component={MealScreen} />
      <Tab.Screen name="Shopping" component={ShoppingScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const [currentRouteName, setCurrentRouteName] = useState<string | undefined>();

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => setCurrentRouteName(navigationRef.getCurrentRoute()?.name)}
      onStateChange={() => setCurrentRouteName(navigationRef.getCurrentRoute()?.name)}
    >
      <AiMealPlanGenerationProvider
        currentRouteName={currentRouteName}
        onViewMeal={() => {
          if (navigationRef.isReady()) {
            navigationRef.navigate('MainTabs', { screen: 'Meal' });
          }
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="HealthCheck" component={HealthCheckScreen} />
          <Stack.Screen name="Growth" component={GrowthScreen} />
          <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
          <Stack.Screen name="VoiceSearch" component={VoiceSearchScreen} />
          <Stack.Screen name="CameraSearch" component={CameraSearchScreen} />
          <Stack.Screen name="FoodInfo" component={FoodInfoScreen} />
          <Stack.Screen name="Hydration" component={HydrationScreen} />
          <Stack.Screen name="PhysicalActivity" component={PhysicalActivityScreen} />
        </Stack.Navigator>
      </AiMealPlanGenerationProvider>
    </NavigationContainer>
  );
}
