import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { useChildProfile } from '../context/ChildProfileContext';
import { colors } from '../theme/colors';
import { Card, Chip, EmptyState, Header, IconButton, PrimaryButton, Screen, SectionTitle } from '../components/Common';
import ChildAvatar from '../components/ChildAvatar';
import DigitalTwin from '../components/DigitalTwin';
import LanguageModal from '../components/LanguageModal';
import MealPlanDurationModal from '../components/MealPlanDurationModal';
import AddChildModal from '../components/AddChildModal';
import ChildrenProfilesModal from '../components/ChildrenProfilesModal';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { language, t } = useLanguage();
  const { children, activeChild, switchToChild, nutritionProgress, getTip, generateNewMealPlan } = useChildProfile();
  const [showLanguage, setShowLanguage] = useState(false);
  const [showDuration, setShowDuration] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showChildren, setShowChildren] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const lastAutoSearchRef = useRef('');

  const langCode = language === 'zh' ? 'ZH' : language === 'ms' ? 'MS' : 'EN';
  const allGoalsMet =
    nutritionProgress.carbs.current >= nutritionProgress.carbs.target &&
    nutritionProgress.protein.current >= nutritionProgress.protein.target &&
    nutritionProgress.fat.current >= nutritionProgress.fat.target;

  const lastCheckDate = useMemo(
    () => new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }),
    []
  );

  const getText = (en: string, zh: string, ms: string) => (language === 'zh' ? zh : language === 'ms' ? ms : en);
  const getChildChipLabel = (child: any) => (child.avatarImageUri ? child.nickname : `${child.avatar} ${child.nickname}`);

  const handleFoodSearch = (value?: string) => {
    const foodName = (value ?? searchText).trim();
    if (!foodName) return;

    lastAutoSearchRef.current = foodName.toLowerCase();
    setSearchHistory((prev) => [foodName, ...prev.filter((item) => item.toLowerCase() !== foodName.toLowerCase())].slice(0, 8));
    setSearchText('');
    navigation.navigate('FoodInfo', { foodName, source: 'search' });
  };

  useEffect(() => {
    const foodName = searchText.trim();
    if (foodName.length < 2) return;

    const normalized = foodName.toLowerCase();
    if (normalized === lastAutoSearchRef.current) return;

    const timer = setTimeout(() => {
      handleFoodSearch(foodName);
    }, 900);

    return () => clearTimeout(timer);
  }, [searchText]);

  const healthInsights = [
    { title: t('balancedNutrition'), desc: t('balancedNutritionDesc'), emoji: '🥗', toneStyle: styles.nutritionIconBox },
    { title: t('hydrationTips'), desc: t('hydrationDesc'), emoji: '💧', toneStyle: styles.hydrationIconBox },
    { title: t('activeLifestyle'), desc: t('activeDesc'), emoji: '🏃', toneStyle: styles.activityIconBox },
  ];

  return (
    <>
      <Screen padded={false}>
        <Header
          title={t('appName')}
          subtitle={t('tagline')}
          icon="heart"
          right={
            <Pressable style={styles.langButton} onPress={() => setShowLanguage(true)}>
              <Text style={styles.langText}>{langCode}</Text>
            </Pressable>
          }
        />

        <View style={styles.body}>
          <Card>
            <View style={styles.searchWrap}>
              <Pressable onPress={() => handleFoodSearch()} hitSlop={10}>
                <Ionicons name="search" size={22} color={colors.primaryDark} />
              </Pressable>
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder={t('searchPlaceholder')}
                placeholderTextColor="#B8BEC8"
                style={styles.searchInput}
                returnKeyType="search"
                autoCorrect={false}
                onSubmitEditing={() => handleFoodSearch()}
              />
              {searchText.length > 0 && <IconButton icon="close" size={34} onPress={() => setSearchText('')} />}
              <IconButton icon="mic" size={38} onPress={() => navigation.navigate('VoiceSearch')} />
              <IconButton icon="camera" size={38} onPress={() => navigation.navigate('CameraSearch')} />
            </View>

            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>{getText('Search History', '搜索记录', 'Sejarah Carian')}</Text>
              {searchHistory.length > 0 && (
                <Pressable onPress={() => setSearchHistory([])}>
                  <Text style={styles.clearHistory}>{getText('Clear', '清空', 'Kosongkan')}</Text>
                </Pressable>
              )}
            </View>
            {searchHistory.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsRow}>
                {searchHistory.map((food) => (
                  <Chip key={food} label={food} onPress={() => handleFoodSearch(food)} />
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.emptyHistory}>{getText('Search foods to create your history.', '搜索食物后会显示历史记录。', 'Cari makanan untuk mencipta sejarah carian.')}</Text>
            )}
          </Card>

          {!activeChild ? (
            <EmptyState
              emoji="👶"
              title={getText('No child profile yet', '还没有创建小孩档案', 'Belum ada profil kanak-kanak')}
              subtitle={getText('You can still use food search, growth overview and health insights. Create a profile to unlock personalized meal plans.', '你仍然可以使用食品搜索、成长概览和健康建议。创建档案后可生成个性化食谱。', 'Anda masih boleh guna carian makanan, gambaran pertumbuhan dan panduan kesihatan. Cipta profil untuk pelan makanan peribadi.')}
              action={<PrimaryButton title={getText('Create Profile', '创建档案', 'Cipta Profil')} icon="add" onPress={() => setShowAddChild(true)} />}
            />
          ) : (
            <>
              <Card style={styles.profileSummaryCard}>
                <View style={styles.profileSummaryTop}>
                  <Pressable onPress={() => setShowChildren(true)}>
                    <ChildAvatar avatar={activeChild.avatar} avatarImageUri={activeChild.avatarImageUri} size={58} style={styles.profileAvatar} />
                  </Pressable>
                  <View style={styles.profileInfo}>
                    <View style={styles.profileNameRow}>
                      <Text style={styles.profileAge}>{activeChild.age}</Text>
                      <View style={styles.onlineDot} />
                    </View>
                    <Text style={styles.profileMeta}>
                      {activeChild.gender === 'boy' ? getText('Boy', '男孩', 'Lelaki') : getText('Girl', '女孩', 'Perempuan')} · {activeChild.height}cm, {activeChild.weight}kg
                    </Text>
                    <Text style={styles.profileLastCheck}>{t('lastCheck')}: {lastCheckDate}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{activeChild.status || 'Normal'}</Text>
                  </View>
                </View>

                {children.length > 1 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childSwitcher}>
                    {children.map((child: any) => (
                      <Chip key={child.id} label={getChildChipLabel(child)} selected={child.id === activeChild.id} onPress={() => switchToChild(child.id)} />
                    ))}
                  </ScrollView>
                )}

                <View style={styles.profileActions}>
                  <Pressable style={styles.mealPlanButton} onPress={() => setShowDuration(true)}>
                    <Ionicons name="calendar" size={16} color="#FFFFFF" />
                    <Text style={styles.mealPlanButtonText}>{t('mealPlan')}</Text>
                  </Pressable>
                  <Pressable style={styles.checkHealthButton} onPress={() => navigation.navigate('HealthCheck')}>
                    <Ionicons name="pulse" size={17} color={colors.primaryDark} />
                    <Text style={styles.checkHealthButtonText}>{t('checkHealth')}</Text>
                  </Pressable>
                </View>
              </Card>

              <DigitalTwin tip={getTip()} nickname={`${activeChild.nickname}'s Twin`} isComplete={allGoalsMet} />
            </>
          )}

          <Pressable style={styles.growthOverviewCard} onPress={() => navigation.navigate('Growth')}>
            <View style={styles.growthHeaderRow}>
              <Text style={styles.growthTitle}>{t('growthOverview')}</Text>
              <View style={styles.growthArrow}>
                <Ionicons name="chevron-forward" size={18} color={colors.primaryDark} />
              </View>
            </View>
            <View style={styles.growthLineWrap}>
              <View style={styles.growthDottedLine} />
              <View style={[styles.growthDot, { left: '0%' }]} />
              <View style={[styles.growthDot, { left: '32%' }]} />
              <View style={[styles.growthDot, { left: '64%' }]} />
              <View style={[styles.growthDot, { right: 0 }]} />
            </View>
            <Text style={styles.growthHint}>
              {activeChild ? getText('Tap to view detailed growth chart', '点击查看详细成长图表', 'Ketik untuk lihat carta pertumbuhan') : getText('Create profile to track growth', '创建档案以追踪成长', 'Cipta profil untuk jejak pertumbuhan')}
            </Text>
          </Pressable>

          <SectionTitle title={t('healthInsights')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.healthInsightsScroll}>
            {healthInsights.map((insight) => (
              <View key={insight.title} style={styles.insightCard}>
                <View style={[styles.insightIconBox, insight.toneStyle]}>
                  <Text style={styles.insightEmoji}>{insight.emoji}</Text>
                </View>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightDesc}>{insight.desc}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </Screen>

      <LanguageModal visible={showLanguage} onClose={() => setShowLanguage(false)} />
      <MealPlanDurationModal
        visible={showDuration}
        onClose={() => setShowDuration(false)}
        onSelect={(days) => {
          generateNewMealPlan(days);
          navigation.navigate('Meal');
        }}
      />
      <AddChildModal visible={showAddChild} onClose={() => setShowAddChild(false)} />
      <ChildrenProfilesModal visible={showChildren} onClose={() => setShowChildren(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 14, paddingBottom: 110 },
  langButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  langText: { color: 'white', fontWeight: '800' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg, borderRadius: 18, paddingHorizontal: 12, minHeight: 56 },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 10 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  historyTitle: { color: colors.text, fontWeight: '800', fontSize: 13 },
  clearHistory: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  suggestionsRow: { marginTop: 10 },
  emptyHistory: { color: colors.muted, fontSize: 12, marginTop: 8 },
  profileSummaryCard: { padding: 18, borderRadius: 24 },
  profileSummaryTop: { flexDirection: 'row', alignItems: 'center' },
  profileAvatar: { marginRight: 14 },
  profileInfo: { flex: 1 },
  profileNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileAge: { fontSize: 20, fontWeight: '900', color: colors.text },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  profileMeta: { marginTop: 4, fontSize: 13, color: colors.text },
  profileLastCheck: { marginTop: 4, fontSize: 12, color: colors.muted },
  statusBadge: { alignSelf: 'flex-start', backgroundColor: '#DDFBE8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  statusBadgeText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  childSwitcher: { marginTop: 14 },
  profileActions: { flexDirection: 'row', gap: 12, marginTop: 18 },
  mealPlanButton: { flex: 1, height: 48, borderRadius: 24, backgroundColor: colors.primaryDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  mealPlanButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  checkHealthButton: { flex: 1, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  checkHealthButtonText: { color: colors.primaryDark, fontSize: 15, fontWeight: '800' },
  growthOverviewCard: { backgroundColor: 'white', borderRadius: 22, padding: 16, minHeight: 150, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  growthHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  growthTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  growthArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  growthLineWrap: { height: 44, justifyContent: 'center', marginTop: 8, marginBottom: 8 },
  growthDottedLine: { borderTopWidth: 2, borderStyle: 'dashed', borderColor: '#D3D8E0' },
  growthDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#C6CDD8', top: 19 },
  growthHint: { color: colors.muted, fontSize: 12, marginTop: 4 },
  healthInsightsScroll: { paddingBottom: 8, gap: 12 },
  insightCard: { width: 240, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 4 },
  insightIconBox: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  nutritionIconBox: { backgroundColor: '#E8F5E9' },
  hydrationIconBox: { backgroundColor: '#EFF6FF' },
  activityIconBox: { backgroundColor: '#FAF5FF' },
  insightEmoji: { fontSize: 18 },
  insightTitle: { color: colors.text, fontWeight: '800', marginTop: 12 },
  insightDesc: { fontSize: 12, color: '#4B5563', lineHeight: 18, marginTop: 8 },
});
