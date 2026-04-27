import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useChildProfile } from '../context/ChildProfileContext';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/colors';
import { Card, EmptyState, Header, PrimaryButton, Screen, SectionTitle } from '../components/Common';
import LanguageModal from '../components/LanguageModal';

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = { vegetables: 'leaf', protein: 'fitness', carbs: 'pizza', others: 'basket' };

export default function ShoppingScreen() {
  const navigation = useNavigation<any>();
  const { t, language } = useLanguage();
  const { shoppingList, toggleShoppingItem, getShoppingProgress, activeChild } = useChildProfile();
  const [showLanguage, setShowLanguage] = useState(false);
  const langCode = language === 'zh' ? 'ZH' : language === 'ms' ? 'MS' : 'EN';
  const grouped = shoppingList.reduce((acc: any, item: any) => {
    acc[item.category] = acc[item.category] || [];
    acc[item.category].push(item);
    return acc;
  }, {});
  const progress = getShoppingProgress();
  const percent = progress.total ? Math.round((progress.checked / progress.total) * 100) : 0;
  const categoryNames: any = { vegetables: t('vegetables'), protein: t('protein'), carbs: t('carbs'), others: 'Others' };

  return (
    <>
      <Screen padded={false}>
        <Header title="Shopping" subtitle="Track and manage ingredients for your meals" icon="cart" right={<Pressable style={styles.langButton} onPress={() => setShowLanguage(true)}><Text style={styles.langText}>{langCode}</Text></Pressable>} />
        <View style={styles.body}>
          {!activeChild ? (
            <EmptyState emoji="🛒" title="Please Select or Create a Child Profile" subtitle="Go to Profile to create or select a child to view shopping list." action={<PrimaryButton title="Go to Profile" onPress={() => navigation.navigate('Profile')} />} />
          ) : (
            <>
              <Card>
                <View style={styles.progressHeader}>
                  <Text style={styles.cardTitle}>{t('shoppingList')}</Text>
                  <Text style={styles.percent}>{percent}%</Text>
                </View>
                <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${percent}%` }]} /></View>
                <Text style={styles.progressText}>{progress.checked} / {progress.total} checked</Text>
              </Card>

              {Object.keys(grouped).map((category) => (
                <View key={category}>
                  <SectionTitle title={categoryNames[category] || category} />
                  {grouped[category].map((item: any) => (
                    <Pressable key={item.id} onPress={() => toggleShoppingItem(item.id)} style={[styles.itemRow, item.checked && styles.itemDone]}>
                      <View style={styles.itemIcon}><Ionicons name={categoryIcons[category] || 'basket'} color={colors.primaryDark} size={18} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemName, item.checked && styles.itemNameDone]}>{item.name}</Text>
                        <Text style={styles.itemSource}>{item.source}</Text>
                      </View>
                      <View style={[styles.check, item.checked && styles.checkDone]}>{item.checked && <Ionicons name="checkmark" color="white" size={16} />}</View>
                    </Pressable>
                  ))}
                </View>
              ))}

              <Card>
                <Text style={styles.cardTitle}>{t('nearbySupermarkets')}</Text>
                {[
                  { name: 'AEON Big', distance: '1.2 km', open: true },
                  { name: 'Lotus Extra', distance: '2.5 km', open: true },
                  { name: 'Village Grocer', distance: '3.1 km', open: false },
                ].map((shop) => (
                  <View key={shop.name} style={styles.shopRow}>
                    <Ionicons name="location" color={colors.primaryDark} size={18} />
                    <View style={{ flex: 1 }}><Text style={styles.shopName}>{shop.name}</Text><Text style={styles.itemSource}>{shop.distance}</Text></View>
                    <Text style={[styles.openBadge, !shop.open && styles.closedBadge]}>{shop.open ? t('openNow') : t('closed')}</Text>
                  </View>
                ))}
              </Card>
            </>
          )}
        </View>
      </Screen>
      <LanguageModal visible={showLanguage} onClose={() => setShowLanguage(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 14, paddingBottom: 110 },
  langButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  langText: { color: 'white', fontWeight: '800' },
  cardTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  percent: { color: colors.primaryDark, fontSize: 24, fontWeight: '900' },
  progressBar: { height: 10, borderRadius: 99, backgroundColor: colors.bg, overflow: 'hidden', marginVertical: 12 },
  progressFill: { height: '100%', backgroundColor: colors.primaryDark, borderRadius: 99 },
  progressText: { color: colors.muted },
  itemRow: { backgroundColor: 'white', borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  itemDone: { backgroundColor: '#F0FDF4' },
  itemIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  itemName: { color: colors.text, fontWeight: '800' },
  itemNameDone: { textDecorationLine: 'line-through', color: colors.muted },
  itemSource: { color: colors.muted, fontSize: 12, marginTop: 3 },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  shopName: { color: colors.text, fontWeight: '800' },
  openBadge: { color: colors.primaryDark, backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, fontSize: 12, fontWeight: '800' },
  closedBadge: { color: colors.muted, backgroundColor: colors.bg },
});
