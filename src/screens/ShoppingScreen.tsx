import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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

const SHOPPING_LIST_STORAGE_KEY = 'JOMHEALTHY_SHOPPING_LIST_BY_OWNER_V1';

type ShoppingCategory = 'vegetables' | 'protein' | 'carbs' | 'others';

type ShoppingItem = {
  id: string;
  name: string;
  nameCn?: string;
  nameMs?: string;
  quantity: string;
  quantityCn?: string;
  quantityMs?: string;
  category: ShoppingCategory;
  source: string;
  sourceCn?: string;
  sourceMs?: string;
  mealId: string;
  checked: boolean;
};

type SupermarketItem = {
  id: string;
  name: string;
  subtitle: string;
  mapQuery: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const categoryIcons: Record<ShoppingCategory, keyof typeof Ionicons.glyphMap> = {
  vegetables: 'leaf',
  protein: 'fitness',
  carbs: 'pizza',
  others: 'basket',
};

const nearbySupermarkets: SupermarketItem[] = [
  {
    id: 'nearby',
    name: 'Supermarkets Near Me',
    subtitle: 'Find the closest supermarket using Google Maps',
    mapQuery: 'supermarket near me',
    icon: 'location',
  },
  {
    id: 'grocery',
    name: 'Grocery Stores Near Me',
    subtitle: 'Search for grocery stores around your current area',
    mapQuery: 'grocery store near me',
    icon: 'basket',
  },
  {
    id: 'jaya-grocer',
    name: 'Jaya Grocer',
    subtitle: 'Premium supermarket and fresh groceries',
    mapQuery: 'Jaya Grocer near me',
    icon: 'storefront',
  },
  {
    id: 'lotus',
    name: "Lotus's",
    subtitle: 'Large supermarket for daily ingredients',
    mapQuery: "Lotus's supermarket near me",
    icon: 'cart',
  },
  {
    id: 'aeon',
    name: 'AEON / AEON Big',
    subtitle: 'Supermarket, grocery and household items',
    mapQuery: 'AEON supermarket near me',
    icon: 'business',
  },
  {
    id: 'nsK',
    name: 'NSK Trade City',
    subtitle: 'Fresh produce, meat, seafood and bulk groceries',
    mapQuery: 'NSK Trade City near me',
    icon: 'pricetags',
  },
  {
    id: 'speedmart',
    name: '99 Speedmart',
    subtitle: 'Convenience groceries and basic ingredients',
    mapQuery: '99 Speedmart near me',
    icon: 'bag-handle',
  },
];

function buildGoogleMapsUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
}


const INGREDIENT_TRANSLATIONS: Record<string, { zh: string; ms: string }> = {
  rice: { zh: '米饭', ms: 'Nasi' },
  nasi: { zh: '米饭', ms: 'Nasi' },
  bread: { zh: '面包', ms: 'Roti' },
  toast: { zh: '吐司', ms: 'Roti bakar' },
  noodle: { zh: '面条', ms: 'Mi' },
  noodles: { zh: '面条', ms: 'Mi' },
  pasta: { zh: '意面', ms: 'Pasta' },
  spaghetti: { zh: '意大利面', ms: 'Spageti' },
  oat: { zh: '燕麦', ms: 'Oat' },
  oats: { zh: '燕麦', ms: 'Oat' },
  flour: { zh: '面粉', ms: 'Tepung' },
  potato: { zh: '土豆', ms: 'Kentang' },
  sweet_potato: { zh: '红薯', ms: 'Ubi keledek' },
  chicken: { zh: '鸡肉', ms: 'Ayam' },
  chicken_breast: { zh: '鸡胸肉', ms: 'Dada ayam' },
  beef: { zh: '牛肉', ms: 'Daging lembu' },
  fish: { zh: '鱼', ms: 'Ikan' },
  fish_fillet: { zh: '鱼片', ms: 'Isi ikan' },
  salmon: { zh: '三文鱼', ms: 'Salmon' },
  tuna: { zh: '金枪鱼', ms: 'Tuna' },
  egg: { zh: '鸡蛋', ms: 'Telur' },
  eggs: { zh: '鸡蛋', ms: 'Telur' },
  tofu: { zh: '豆腐', ms: 'Tauhu' },
  bean: { zh: '豆类', ms: 'Kacang' },
  beans: { zh: '豆类', ms: 'Kacang' },
  lentil: { zh: '扁豆', ms: 'Lentil' },
  milk: { zh: '牛奶', ms: 'Susu' },
  yogurt: { zh: '酸奶', ms: 'Yogurt' },
  cheese: { zh: '奶酪', ms: 'Keju' },
  broccoli: { zh: '西兰花', ms: 'Brokoli' },
  spinach: { zh: '菠菜', ms: 'Bayam' },
  carrot: { zh: '胡萝卜', ms: 'Lobak merah' },
  tomato: { zh: '番茄', ms: 'Tomato' },
  cucumber: { zh: '黄瓜', ms: 'Timun' },
  onion: { zh: '洋葱', ms: 'Bawang' },
  garlic: { zh: '大蒜', ms: 'Bawang putih' },
  cabbage: { zh: '卷心菜', ms: 'Kubis' },
  lettuce: { zh: '生菜', ms: 'Salad' },
  mushroom: { zh: '蘑菇', ms: 'Cendawan' },
  corn: { zh: '玉米', ms: 'Jagung' },
  pea: { zh: '豌豆', ms: 'Kacang pea' },
  peas: { zh: '豌豆', ms: 'Kacang pea' },
  banana: { zh: '香蕉', ms: 'Pisang' },
  apple: { zh: '苹果', ms: 'Epal' },
  orange: { zh: '橙子', ms: 'Oren' },
  mango: { zh: '芒果', ms: 'Mangga' },
  strawberry: { zh: '草莓', ms: 'Strawberi' },
  berries: { zh: '莓果', ms: 'Beri' },
  avocado: { zh: '牛油果', ms: 'Avokado' },
  lemon: { zh: '柠檬', ms: 'Lemon' },
  lime: { zh: '青柠', ms: 'Limau nipis' },
  oil: { zh: '油', ms: 'Minyak' },
  olive_oil: { zh: '橄榄油', ms: 'Minyak zaitun' },
  butter: { zh: '黄油', ms: 'Mentega' },
  salt: { zh: '盐', ms: 'Garam' },
  sugar: { zh: '糖', ms: 'Gula' },
  honey: { zh: '蜂蜜', ms: 'Madu' },
  soy_sauce: { zh: '酱油', ms: 'Kicap' },
  coconut_milk: { zh: '椰浆', ms: 'Santan' },
};

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function translateIngredientName(name: string, language: string) {
  if (language === 'en') return name;

  const lower = name.toLowerCase();
  const exact = INGREDIENT_TRANSLATIONS[normalizeKey(name)];

  if (exact) {
    return language === 'zh' ? exact.zh : exact.ms;
  }

  const entry = Object.entries(INGREDIENT_TRANSLATIONS).find(([key]) => {
    const keyword = key.replace(/_/g, ' ');
    return lower.includes(keyword) || lower.includes(keyword.replace(/s$/, ''));
  });

  if (!entry) return name;

  return language === 'zh' ? entry[1].zh : entry[1].ms;
}

function getShoppingItemName(item: ShoppingItem, language: string) {
  if (language === 'zh') {
    return item.nameCn || translateIngredientName(item.name, language);
  }

  if (language === 'ms') {
    return item.nameMs || translateIngredientName(item.name, language);
  }

  return item.name;
}

function getShoppingItemQuantity(item: ShoppingItem, language: string) {
  if (language === 'zh') return item.quantityCn || item.quantity;
  if (language === 'ms') return item.quantityMs || item.quantity;
  return item.quantity;
}

function getShoppingItemSource(item: ShoppingItem, language: string) {
  if (language === 'zh') return item.sourceCn || item.source;
  if (language === 'ms') return item.sourceMs || item.source;
  return item.source;
}

export default function ShoppingScreen() {
  const navigation = useNavigation<any>();
  const { language } = useLanguage();
  const { activeChild, getOwnerKey } = useChildProfile();

  const ownerKey = getOwnerKey();

  const [showSupermarkets, setShowSupermarkets] = useState(false);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);

  const getText = (en: string, zh: string, ms: string) => {
    if (language === 'zh') return zh;
    if (language === 'ms') return ms;
    return en;
  };

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

  const openGoogleMaps = async (query: string) => {
    const url = buildGoogleMapsUrl(query);

    try {
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        Alert.alert(getText('Cannot Open Maps', '无法打开地图', 'Tidak Dapat Buka Peta'), getText('Unable to open Google Maps.', '无法打开 Google Maps。', 'Tidak dapat membuka Google Maps.'));
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      console.log('Open Google Maps failed:', error);
      Alert.alert(getText('Error', '错误', 'Ralat'), getText('Unable to open Google Maps.', '无法打开 Google Maps。', 'Tidak dapat membuka Google Maps.'));
    }
  };

  const openGrabMart = async () => {
    const grabMartUrl = 'https://food.grab.com/my/en/';
    const grabAppUrl = 'grab://open';

    try {
      const canOpenGrabApp = await Linking.canOpenURL(grabAppUrl);

      if (canOpenGrabApp) {
        await Linking.openURL(grabAppUrl);
        return;
      }

      await Linking.openURL(grabMartUrl);
    } catch (error) {
      console.log('Open Grab failed:', error);

      try {
        await Linking.openURL(grabMartUrl);
      } catch {
        Alert.alert(getText('Error', '错误', 'Ralat'), getText('Unable to open Grab.', '无法打开 Grab。', 'Tidak dapat membuka Grab.'));
      }
    }
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
    vegetables: getText('Vegetables', '蔬菜', 'Sayur-sayuran'),
    protein: getText('Protein', '蛋白质', 'Protein'),
    carbs: getText('Carbs', '碳水', 'Karbohidrat'),
    others: getText('Others', '其他', 'Lain-lain'),
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
          title={getText('Shopping', '购物清单', 'Senarai Beli-belah')}
          subtitle={
            activeChild
              ? getText(
                  `${activeChild.nickname}'s ingredients`,
                  `${activeChild.nickname}的食材`,
                  `Bahan untuk ${activeChild.nickname}`
                )
              : getText(
                  'Guest ingredients from meal plan',
                  '访客膳食计划食材',
                  'Bahan tetamu daripada pelan makanan'
                )
          }
          icon="cart"
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.body}
        >
          <Card>
            <View style={styles.supermarketHeader}>
              <View style={styles.supermarketIconBox}>
                <Ionicons
                  name="storefront"
                  size={22}
                  color={colors.primaryDark}
                />
              </View>

              <View style={styles.supermarketInfo}>
                <Text style={styles.supermarketTitle}>{getText('Nearby Supermarkets', '附近超市', 'Pasar Raya Berdekatan')}</Text>
                <Text style={styles.supermarketSubtitle}>
                  {getText('Find ingredients in stores near you or order with GrabMart.', '查找附近商店的食材，或使用 GrabMart 下单。', 'Cari bahan di kedai berdekatan atau pesan dengan GrabMart.')}
                </Text>
              </View>
            </View>

            <View style={styles.supermarketActionRow}>
              <Pressable
                style={styles.nearbyButton}
                onPress={() => setShowSupermarkets(true)}
              >
                <Ionicons name="location-outline" size={17} color="#FFFFFF" />
                <Text style={styles.nearbyButtonText}>{getText('Find Nearby', '查找附近', 'Cari Berdekatan')}</Text>
              </Pressable>

              <Pressable style={styles.grabButton} onPress={openGrabMart}>
                <Ionicons name="bag-handle-outline" size={17} color="#12A150" />
                <Text style={styles.grabButtonText}>{getText('Open GrabMart', '打开 GrabMart', 'Buka GrabMart')}</Text>
              </Pressable>
            </View>
          </Card>

          {totalCount === 0 ? (
            <EmptyState
              emoji="🛒"
              title={getText('No shopping items yet', '还没有购物食材', 'Belum ada item belian')}
              subtitle={getText('Add recipes to your Meal Plan first. Ingredients will automatically appear here.', '先把食谱加入膳食计划，食材会自动出现在这里。', 'Tambah resipi ke Pelan Makanan dahulu. Bahan akan muncul secara automatik di sini.')}
              action={
                <PrimaryButton
                  title={getText('Go to Meal Plan', '前往膳食计划', 'Pergi ke Pelan Makanan')}
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
                    <Text style={styles.cardTitle}>{getText('Shopping List', '购物清单', 'Senarai Beli-belah')}</Text>
                    <Text style={styles.cardSub}>
                      {activeChild
                        ? getText(
                            `Generated from ${activeChild.nickname}'s Meal Plan`,
                            `来自${activeChild.nickname}的膳食计划`,
                            `Dijana daripada Pelan Makanan ${activeChild.nickname}`
                          )
                        : getText(
                            'Generated from Guest Meal Plan',
                            '来自访客膳食计划',
                            'Dijana daripada Pelan Makanan Tetamu'
                          )}
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
                  {getText(`${checkedCount} / ${totalCount} checked`, `${checkedCount} / ${totalCount} 已勾选`, `${checkedCount} / ${totalCount} ditanda`)}
                </Text>

                <View style={styles.actionRow}>
                  <Pressable style={styles.secondaryButton} onPress={resetAllItems}>
                    <Ionicons
                      name="refresh-outline"
                      size={16}
                      color={colors.primaryDark}
                    />
                    <Text style={styles.secondaryButtonText}>{getText('Reset', '重置', 'Tetapkan Semula')}</Text>
                  </Pressable>

                  <Pressable
                    style={styles.dangerButton}
                    onPress={clearCheckedItems}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={styles.dangerButtonText}>{getText('Clear Checked', '清除已勾选', 'Kosongkan Yang Ditanda')}</Text>
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
                            {getShoppingItemName(item, language)}
                          </Text>

                          {!!item.quantity && (
                            <Text style={styles.itemQuantity}>
                              {getShoppingItemQuantity(item, language)}
                            </Text>
                          )}

                          <Text style={styles.itemSource} numberOfLines={2}>
                            {getShoppingItemSource(item, language)}
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

      <Modal
        visible={showSupermarkets}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSupermarkets(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowSupermarkets(false)}
        >
          <Pressable style={styles.supermarketModal} onPress={() => {}}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{getText('Nearby Supermarkets', '附近超市', 'Pasar Raya Berdekatan')}</Text>
                <Text style={styles.modalSubtitle}>
                  {getText('Tap a store to open it in Google Maps.', '点击商店即可在 Google Maps 打开。', 'Ketik kedai untuk buka dalam Google Maps.')}
                </Text>
              </View>

              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setShowSupermarkets(false)}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.supermarketList}
            >
              {nearbySupermarkets.map((market) => (
                <Pressable
                  key={market.id}
                  style={styles.marketRow}
                  onPress={() => openGoogleMaps(market.mapQuery)}
                >
                  <View style={styles.marketIcon}>
                    <Ionicons
                      name={market.icon}
                      size={20}
                      color={colors.primaryDark}
                    />
                  </View>

                  <View style={styles.marketInfo}>
                    <Text style={styles.marketName}>{market.name}</Text>
                    <Text style={styles.marketSubtitle}>{market.subtitle}</Text>
                  </View>

                  <Ionicons
                    name="map-outline"
                    size={20}
                    color={colors.primaryDark}
                  />
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={styles.modalGrabButton} onPress={openGrabMart}>
                <Ionicons name="bag-handle" size={18} color="#FFFFFF" />
                <Text style={styles.modalGrabButtonText}>{getText('Open GrabMart', '打开 GrabMart', 'Buka GrabMart')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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

  supermarketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  supermarketIconBox: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  supermarketInfo: {
    flex: 1,
  },

  supermarketTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },

  supermarketSubtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 3,
  },

  supermarketActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },

  nearbyButton: {
    flex: 1,
    height: 44,
    borderRadius: 18,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  nearbyButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },

  grabButton: {
    flex: 1,
    height: 44,
    borderRadius: 18,
    backgroundColor: '#EAF7F0',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  grabButtonText: {
    color: '#12A150',
    fontWeight: '900',
    fontSize: 13,
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

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },

  supermarketModal: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 10,
    maxHeight: '82%',
  },

  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },

  modalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },

  modalSubtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },

  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  supermarketList: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 10,
  },

  marketRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  marketIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  marketInfo: {
    flex: 1,
  },

  marketName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },

  marketSubtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 3,
  },

  modalFooter: {
    padding: 20,
    paddingTop: 12,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  modalGrabButton: {
    height: 50,
    borderRadius: 20,
    backgroundColor: '#12A150',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  modalGrabButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});