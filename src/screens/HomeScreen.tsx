import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { useChildProfile } from '../context/ChildProfileContext';
import { colors } from '../theme/colors';
import { Card, Chip, EmptyState, Header, IconButton, PrimaryButton, Screen, SectionTitle } from '../components/Common';
import ChildAvatar from '../components/ChildAvatar';
import ProgressRing from '../components/ProgressRing';
import DigitalTwin from '../components/DigitalTwin';
import LanguageModal from '../components/LanguageModal';
import MealPlanDurationModal from '../components/MealPlanDurationModal';
import AddChildModal from '../components/AddChildModal';
import ChildrenProfilesModal from '../components/ChildrenProfilesModal';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { language, t } = useLanguage();
  const { children, activeChild, switchToChild, nutritionProgress, getTip } = useChildProfile();
  const [showLanguage, setShowLanguage] = useState(false);
  const [showDuration, setShowDuration] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showChildren, setShowChildren] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>(['Nasi Lemak', 'Chicken Rice', 'Tom Yam']);

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
    if (!foodName) {
      Alert.alert(getText('Enter a food name', '请输入食物名称', 'Masukkan nama makanan'));
      return;
    }

    setSearchHistory((prev) => [foodName, ...prev.filter((item) => item.toLowerCase() !== foodName.toLowerCase())].slice(0, 6));
    setSearchText('');
    navigation.navigate('FoodInfo', { foodName, source: 'search' });
  };

  const healthInsights = [
    {
      title: t('balancedNutrition'),
      desc: t('balancedNutritionDesc'),
      emoji: '🥗',
      toneStyle: styles.nutritionIconBox,
    },
    {
      title: t('hydrationTips'),
      desc: t('hydrationDesc'),
      emoji: '💧',
      toneStyle: styles.hydrationIconBox,
    },
    {
      title: t('activeLifestyle'),
      desc: t('activeDesc'),
      emoji: '🏃',
      toneStyle: styles.activityIconBox,
    },
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
              <Text style={styles.emptyHistory}>{getText('No search history yet', '暂无搜索记录', 'Belum ada sejarah carian')}</Text>
            )}
          </Card>

          {!activeChild ? (
            <EmptyState
              emoji="👶"
              title={getText('No child profile yet', '还没有创建小孩档案', 'Belum ada profil kanak-kanak')}
              subtitle={getText(
                'You can still use food search, growth overview and health insights. Create a profile to unlock personalized meal plans.',
                '你仍然可以使用食品搜索、成长概览和健康建议。创建档案后可生成个性化食谱。',
                'Anda masih boleh guna carian makanan, gambaran pertumbuhan dan panduan kesihatan. Cipta profil untuk pelan makanan peribadi.'
              )}
              action={<PrimaryButton title={getText('Create Profile', '创建档案', 'Cipta Profil')} icon="add" onPress={() => setShowAddChild(true)} />}
            />
          ) : (
            <>
              <Card>
                <View style={styles.childTopRow}>
                  <ChildAvatar avatar={activeChild.avatar} avatarImageUri={activeChild.avatarImageUri} size={56} style={styles.avatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.childName}>{activeChild.nickname}</Text>
                    <Text style={styles.childMeta}>
                      {activeChild.age} {t('yearsOld')} · BMI {activeChild.bmi ?? '-'} · {activeChild.status || t('healthy')}
                    </Text>
                    {activeChild.birthday && <Text style={styles.childMeta}>Birthday · {activeChild.birthday}</Text>}
                    <Text style={styles.childMeta}>{t('lastCheck')}: {lastCheckDate}</Text>
                  </View>
                  <IconButton icon="people" onPress={() => setShowChildren(true)} />
                </View>
                {children.length > 1 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                    {children.map((child: any) => (
                      <Chip key={child.id} label={getChildChipLabel(child)} selected={child.id === activeChild.id} onPress={() => switchToChild(child.id)} />
                    ))}
                  </ScrollView>
                )}
              </Card>

              <DigitalTwin tip={getTip()} nickname={`${activeChild.nickname}'s Twin`} isComplete={allGoalsMet} />

              <Card>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Today's Nutrition</Text>
                  <Text style={styles.cardSubtitle}>Progress</Text>
                </View>
                <View style={styles.ringsRow}>
                  <ProgressRing label="Carbs" current={nutritionProgress.carbs.current} target={nutritionProgress.carbs.target} color={colors.orange} />
                  <ProgressRing label="Protein" current={nutritionProgress.protein.current} target={nutritionProgress.protein.target} color={colors.blue} />
                  <ProgressRing label="Fat" current={nutritionProgress.fat.current} target={nutritionProgress.fat.target} color={colors.purple} />
                </View>
              </Card>
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
              {activeChild
                ? getText('Tap to view detailed growth chart', '点击查看详细成长图表', 'Ketik untuk lihat carta pertumbuhan')
                : getText('Create profile to track growth', '创建档案以追踪成长', 'Cipta profil untuk jejak pertumbuhan')}
            </Text>
          </Pressable>
{/* 
          <Pressable style={styles.healthCheckBanner} onPress={() => navigation.navigate('HealthCheck')}>
            <View style={styles.healthCheckIcon}>
              <Ionicons name="fitness" size={22} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.healthCheckTitle}>{t('checkHealth')}</Text>
              <Text style={styles.healthCheckSub}>{t('quickBMI')}</Text>
            </View>
            <Ionicons name="chevron-forward" color={colors.muted} size={18} />
          </Pressable> */}

          {activeChild && (
            <Card>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={styles.cardTitle}>{t('mealPlan')}</Text>
                  <Text style={styles.cardSubtitle}>{t('basedOnPreferences')}</Text>
                </View>
                <IconButton icon="restaurant" />
              </View>
              <PrimaryButton title="Generate Meal Plan" icon="calendar" onPress={() => setShowDuration(true)} />
            </Card>
          )}

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
      <MealPlanDurationModal visible={showDuration} onClose={() => setShowDuration(false)} onSelect={() => navigation.navigate('Meal')} />
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
  childTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { alignSelf: 'flex-start' },
  childName: { fontSize: 20, fontWeight: '800', color: colors.text },
  childMeta: { color: colors.muted, marginTop: 3 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  cardSubtitle: { color: colors.muted, marginTop: 3 },
  ringsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  growthOverviewCard: { backgroundColor: 'white', borderRadius: 22, padding: 16, minHeight: 150, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  growthHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  growthTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  growthArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  growthLineWrap: { height: 44, justifyContent: 'center', marginTop: 8, marginBottom: 8 },
  growthDottedLine: { borderTopWidth: 2, borderStyle: 'dashed', borderColor: '#D3D8E0' },
  growthDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#C6CDD8', top: 19 },
  growthHint: { color: colors.muted, fontSize: 12, marginTop: 4 },
  healthCheckBanner: { backgroundColor: 'white', borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  healthCheckIcon: { width: 42, height: 42, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  healthCheckTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  healthCheckSub: { color: colors.muted, fontSize: 12, marginTop: 4 },
  insightsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  insightTile: { width: '48%', minHeight: 170, backgroundColor: 'white', borderRadius: 22, padding: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  insightIcon: { width: 42, height: 42, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  insightTitle: { color: colors.text, fontWeight: '800', marginTop: 12 },
  insightSub: { color: colors.muted, fontSize: 12, marginTop: 8, lineHeight: 17 },sectionTitle: {
  fontSize: 16,
  fontWeight: '500',
  marginBottom: 12,
  paddingHorizontal: 4,
  color: '#111827',
},

healthInsightsScroll: {
  paddingHorizontal: 24,
  paddingBottom: 8,
  gap: 12,
},

insightCard: {
  width: 240,
  backgroundColor: '#FFFFFF',
  borderRadius: 24,
  padding: 20,
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.08,
  shadowRadius: 20,
  elevation: 4,
},

insightIconBox: {
  width: 40,
  height: 40,
  borderRadius: 16,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 8,
},

nutritionIconBox: {
  backgroundColor: '#E8F5E9',
},

hydrationIconBox: {
  backgroundColor: '#EFF6FF',
},

activityIconBox: {
  backgroundColor: '#FAF5FF',
},

insightEmoji: {
  fontSize: 18,
},
insightDesc: {
  fontSize: 12,
  color: '#4B5563',
  lineHeight: 18,
},
});
