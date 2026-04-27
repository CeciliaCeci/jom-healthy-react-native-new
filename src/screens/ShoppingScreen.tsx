import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChildProfile } from '../context/ChildProfileContext';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/colors';
import {
  Card,
  EmptyState,
  Header,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '../components/Common';
import LanguageModal from '../components/LanguageModal';

const SHOPPING_LIST_STORAGE_KEY = 'JOMHEALTHY_SHOPPING_LIST_BY_OWNER_V1';

type ShoppingCategory = 'vegetables' | 'protein' | 'carbs' | 'others';

type ShoppingItem = {
  id: string;
  name: string;
  quantity: string;
  category: ShoppingCategory;
  source: string;
  mealId: string;
  checked: boolean;
};

const categoryIcons: Record<ShoppingCategory, keyof typeof Ionicons.glyphMap> = {
  vegetables: 'leaf',
  protein: 'fitness',
  carbs: 'pizza',
  others: 'basket',
};

export default function ShoppingScreen() {
  const navigation = useNavigation<any>();
  const { t, language } = useLanguage();
  const { activeChild, getOwnerKey } = useChildProfile();

  const ownerKey = getOwnerKey();

  const [showLanguage, setShowLanguage] = useState(false);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);

  const langCode = language === 'zh' ? 'ZH' : language === 'ms' ? 'MS' : 'EN';

  const loadShoppingList = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SHOPPING_LIST_STORAGE_KEY);
      const byOwner = raw ? JSON.parse(raw) : {};
      const list = byOwner[ownerKey] || [];

      setShoppingList(Array.isArray(list) ? list : []);
    } catch (error) {
      console.log('Load shopping list failed:', error);
      setShoppingList([]);
    }
  }, [ownerKey]);

  useFocusEffect(
    useCallback(() => {
      loadShoppingList();
    }, [loadShoppingList])
  );

  const saveShoppingList = async (nextList: ShoppingItem[]) => {
    setShoppingList(nextList);

    try {
      const raw = await AsyncStorage.getItem(SHOPPING_LIST_STORAGE_KEY);
      const byOwner = raw ? JSON.parse(raw) : {};

      byOwner[ownerKey] = nextList;

      await AsyncStorage.setItem(
        SHOPPING_LIST_STORAGE_KEY,
        JSON.stringify(byOwner)
      );
    } catch (error) {
      console.log('Save shopping list failed:', error);
    }
  };

  const toggleShoppingItem = async (itemId: string) => {
    const nextList = shoppingList.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );

    await saveShoppingList(nextList);
  };

  const clearCheckedItems = async () => {
    const nextList = shoppingList.filter((item) => !item.checked);
    await saveShoppingList(nextList);
  };

  const resetAllItems = async () => {
    const nextList = shoppingList.map((item) => ({
      ...item,
      checked: false,
    }));

    await saveShoppingList(nextList);
  };

  const grouped = useMemo(() => {
    return shoppingList.reduce((acc, item) => {
      acc[item.category] = acc[item.category] || [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<ShoppingCategory, ShoppingItem[]>);
  }, [shoppingList]);

  const checkedCount = shoppingList.filter((item) => item.checked).length;
  const totalCount = shoppingList.length;
  const percent = totalCount ? Math.round((checkedCount / totalCount) * 100) : 0;

  const categoryNames: Record<ShoppingCategory, string> = {
    vegetables: t('vegetables') || 'Vegetables',
    protein: t('protein') || 'Protein',
    carbs: t('carbs') || 'Carbs',
    others: 'Others',
  };

  const categoryOrder: ShoppingCategory[] = [
    'vegetables',
    'protein',
    'carbs',
    'others',
  ];

  return (
    <>
      <Screen padded={false}>
        <Header
          title="Shopping"
          subtitle={
            activeChild
              ? `${activeChild.nickname}'s ingredients`
              : 'Guest ingredients from meal plan'
          }
          icon="cart"
          right={
            <Pressable
              style={styles.langButton}
              onPress={() => setShowLanguage(true)}
            >
              <Text style={styles.langText}>{langCode}</Text>
            </Pressable>
          }
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.body}
        >
          {totalCount === 0 ? (
            <EmptyState
              emoji="🛒"
              title="No shopping items yet"
              subtitle="Add recipes to your Meal Plan first. Ingredients will automatically appear here."
              action={
                <PrimaryButton
                  title="Go to Meal Plan"
                  icon="restaurant"
                  onPress={() => navigation.navigate('Meal')}
                />
              }
            />
          ) : (
            <>
              <Card>
                <View style={styles.progressHeader}>
                  <View>
                    <Text style={styles.cardTitle}>Shopping List</Text>
                    <Text style={styles.cardSub}>
                      {activeChild
                        ? `Generated from ${activeChild.nickname}'s Meal Plan`
                        : 'Generated from Guest Meal Plan'}
                    </Text>
                  </View>

                  <Text style={styles.percent}>{percent}%</Text>
                </View>

                <View style={styles.progressBar}>
                  <View
                    style={[styles.progressFill, { width: `${percent}%` }]}
                  />
                </View>

                <Text style={styles.progressText}>
                  {checkedCount} / {totalCount} checked
                </Text>

                <View style={styles.actionRow}>
                  <Pressable style={styles.secondaryButton} onPress={resetAllItems}>
                    <Ionicons
                      name="refresh-outline"
                      size={16}
                      color={colors.primaryDark}
                    />
                    <Text style={styles.secondaryButtonText}>Reset</Text>
                  </Pressable>

                  <Pressable
                    style={styles.dangerButton}
                    onPress={clearCheckedItems}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={styles.dangerButtonText}>Clear Checked</Text>
                  </Pressable>
                </View>
              </Card>

              {categoryOrder
                .filter((category) => grouped[category]?.length)
                .map((category) => (
                  <View key={category}>
                    <SectionTitle title={categoryNames[category]} />

                    {grouped[category].map((item) => (
                      <Pressable
                        key={item.id}
                        onPress={() => toggleShoppingItem(item.id)}
                        style={[
                          styles.itemRow,
                          item.checked && styles.itemDone,
                        ]}
                      >
                        <View style={styles.itemIcon}>
                          <Ionicons
                            name={categoryIcons[category]}
                            color={colors.primaryDark}
                            size={18}
                          />
                        </View>

                        <View style={styles.itemInfo}>
                          <Text
                            style={[
                              styles.itemName,
                              item.checked && styles.itemNameDone,
                            ]}
                          >
                            {item.name}
                          </Text>

                          {!!item.quantity && (
                            <Text style={styles.itemQuantity}>
                              {item.quantity}
                            </Text>
                          )}

                          <Text style={styles.itemSource} numberOfLines={2}>
                            {item.source}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.check,
                            item.checked && styles.checkDone,
                          ]}
                        >
                          {item.checked && (
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color="#FFFFFF"
                            />
                          )}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ))}
            </>
          )}
        </ScrollView>
      </Screen>

      <LanguageModal
        visible={showLanguage}
        onClose={() => setShowLanguage(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: 20,
    gap: 14,
    paddingBottom: 110,
  },

  langButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  langText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  progressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  cardTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 20,
  },

  cardSub: {
    color: colors.muted,
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },

  percent: {
    color: colors.primaryDark,
    fontWeight: '900',
    fontSize: 22,
  },

  progressBar: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.primaryDark,
    borderRadius: 999,
  },

  progressText: {
    marginTop: 10,
    color: colors.muted,
    fontWeight: '700',
    fontSize: 13,
  },

  actionRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },

  secondaryButton: {
    flex: 1,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  secondaryButtonText: {
    color: colors.primaryDark,
    fontWeight: '900',
    fontSize: 13,
  },

  dangerButton: {
    flex: 1,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  dangerButtonText: {
    color: '#EF4444',
    fontWeight: '900',
    fontSize: 13,
  },

  itemRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  itemDone: {
    opacity: 0.62,
    backgroundColor: '#F3F4F6',
  },

  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  itemInfo: {
    flex: 1,
  },

  itemName: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 15,
  },

  itemNameDone: {
    textDecorationLine: 'line-through',
    color: colors.muted,
  },

  itemQuantity: {
    marginTop: 4,
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 13,
  },

  itemSource: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },

  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkDone: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.primaryDark,
  },
});