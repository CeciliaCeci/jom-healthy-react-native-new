import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image, //Health Insights, JJ
  Modal, //Health Insights, JJ
  Linking,
  TouchableOpacity, //Health Insights, JJ
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { useChildProfile } from '../context/ChildProfileContext';
import { colors } from '../theme/colors';
import {
  Card,
  Chip,
  EmptyState,
  Header,
  IconButton,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '../components/Common';
import ChildAvatar from '../components/ChildAvatar';
import DigitalTwin from '../components/DigitalTwin';
import LanguageModal from '../components/LanguageModal';
import MealPlanDurationModal from '../components/MealPlanDurationModal';
import AddChildModal from '../components/AddChildModal';
import ChildrenProfilesModal from '../components/ChildrenProfilesModal';
// Use for Markdown format of Health Insights, JJ
import Markdown from 'react-native-markdown-display';
// Use for details of each type of health insights, JJ
import { FileText, X, ExternalLink } from 'lucide-react-native';

type FoodSuggestion = {
  label: string;
  query: string;
};

const BASE_URL = 'https://jom-healthy-java.onrender.com';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { language, t } = useLanguage();
  const {
    children,
    activeChild,
    switchToChild,
    nutritionProgress,
    getTip,
  } = useChildProfile();

  const [showLanguage, setShowLanguage] = useState(false);
  const [showDuration, setShowDuration] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showChildren, setShowChildren] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [allTopics, setAllTopics] = useState<any[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [showTopicModal, setShowTopicModal] = useState(false);

  const langCode = language === 'zh' ? 'ZH' : language === 'ms' ? 'MS' : 'EN';

  const allGoalsMet =
    nutritionProgress.carbs.current >= nutritionProgress.carbs.target &&
    nutritionProgress.protein.current >= nutritionProgress.protein.target &&
    nutritionProgress.fat.current >= nutritionProgress.fat.target;

  const lastCheckDate = useMemo(
    () =>
      new Date().toLocaleDateString('en-MY', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    []
  );

  const getText = (en: string, zh: string, ms: string) => {
    if (language === 'zh') return zh;
    if (language === 'ms') return ms;
    return en;
  };

  const getChildChipLabel = (child: any) => {
    return child.avatarImageUri ? child.nickname : `${child.avatar} ${child.nickname}`;
  };

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/topics/all`);
        if (response.ok) {
          const data = await response.json();
          setAllTopics(data);
        }
      } catch (error) {
        console.error("Topics Fetch Error:", error);
      } finally {
        setTopicsLoading(false);
      }
    };
    fetchTopics();
  }, []);

  useEffect(() => {
    const query = searchText.trim();

    if (!query) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchError('');
      setSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError('');

      try {
        const response = await fetch(
          `${BASE_URL}/food/getFoodNutrition?name=${encodeURIComponent(query)}`,
          {
            method: 'POST',
            headers: {
              Accept: 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Server error ${response.status}`);
        }

        const payload = await response.json();
        const data = Array.isArray(payload?.data) ? payload.data : [];

        const nextSuggestions: FoodSuggestion[] = data.slice(0, 6).map((item: any) => {
          const label =
            language === 'zh'
              ? item.foodNameCn || item.foodNameOriginal || item.foodNameEn || item.foodNameMs
              : language === 'ms'
                ? item.foodNameMs || item.foodNameOriginal || item.foodNameEn || item.foodNameCn
                : item.foodNameEn || item.foodNameOriginal || item.foodNameMs || item.foodNameCn;

          const backendQuery =
            item.foodNameCombine ||
            item.foodNameOriginal ||
            item.foodNameEn ||
            item.foodNameMs ||
            item.foodNameCn ||
            label;

          return {
            label: label || query,
            query: backendQuery || query,
          };
        });

        setSuggestions(nextSuggestions);
        setShowSuggestions(true);
      } catch (error: any) {
        console.log('Food suggestion search failed:', error);
        setSearchError(
          getText(
            'Network error. Please try again.',
            '网络错误，请稍后再试。',
            'Ralat rangkaian. Cuba lagi.'
          )
        );
        setSuggestions([]);
        setShowSuggestions(true);
      } finally {
        setSearchLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText, language]);

  // ==========================================
  // 3. 辅助函数与变量计算
  // ==========================================
  const reportTopics = allTopics.filter(t => t.category === 'REPORT');
  const dietTopics = allTopics.filter(t => t.category === 'DIET');
  const sportTopics = allTopics.filter(t => t.category === 'SPORT');
  const habitTopics = allTopics.filter(t => t.category === 'HABIT');
  const displayTopics = [...reportTopics, ...habitTopics, ...sportTopics, ...dietTopics];

  const handleFoodSearch = (value?: string) => {
    const foodName = (value ?? searchText).trim();

    if (!foodName) {
      Alert.alert(
        getText('Enter a food name', '请输入食物名称', 'Masukkan nama makanan')
      );
      return;
    }

    setSearchHistory((prev) =>
      [
        foodName,
        ...prev.filter(
          (item) => item.toLowerCase() !== foodName.toLowerCase()
        ),
      ].slice(0, 6)
    );

    setSearchText('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchError('');

    navigation.navigate('FoodInfo', {
      foodName,
      source: 'search',
    });
  };


  return (
    <>
      <Screen padded={false}>
        <Header
          title={t('appName')}
          subtitle={t('tagline')}
          icon="heart"
          right={
            <Pressable
              style={styles.langButton}
              onPress={() => setShowLanguage(true)}
            >
              <Text style={styles.langText}>{langCode}</Text>
            </Pressable>
          }
        />

        <View style={styles.body}>
          {/* Search */}
          <Card>
            <View style={styles.searchWrap}>
              <Ionicons
                name="search"
                size={22}
                color={colors.primaryDark}
              />

              <TextInput
                value={searchText}
                onChangeText={(text) => {
                  setSearchText(text);
                  setShowSuggestions(true);
                }}
                placeholder={t('searchPlaceholder')}
                placeholderTextColor="#B8BEC8"
                style={styles.searchInput}
                returnKeyType="search"
                autoCorrect={false}
                onSubmitEditing={() => handleFoodSearch()}
              />

              {searchText.length > 0 && (
                <IconButton
                  icon="close"
                  size={34}
                  onPress={() => {
                    setSearchText('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                    setSearchError('');
                  }}
                />
              )}

              <IconButton
                icon="mic"
                size={38}
                onPress={() => navigation.navigate('VoiceSearch')}
              />

              <IconButton
                icon="camera"
                size={38}
                onPress={() => navigation.navigate('CameraSearch')}
              />
            </View>

            {searchText.trim().length > 0 && showSuggestions && (
              <View style={styles.suggestionBox}>
                {searchLoading ? (
                  <View style={styles.suggestionStatus}>
                    <ActivityIndicator size="small" color={colors.primaryDark} />
                    <Text style={styles.suggestionStatusText}>
                      {getText('Searching...', '搜索中...', 'Mencari...')}
                    </Text>
                  </View>
                ) : searchError ? (
                  <View style={styles.suggestionStatus}>
                    <Ionicons name="warning-outline" size={18} color="#EF4444" />
                    <Text style={styles.suggestionError}>{searchError}</Text>
                  </View>
                ) : suggestions.length > 0 ? (
                  suggestions.map((item, index) => (
                    <Pressable
                      key={`${item.label}-${index}`}
                      style={[
                        styles.suggestionItem,
                        index === suggestions.length - 1 && styles.suggestionItemLast,
                      ]}
                      onPress={() => handleFoodSearch(item.query)}
                    >
                      <Ionicons
                        name="restaurant-outline"
                        size={17}
                        color={colors.primaryDark}
                      />
                      <Text style={styles.suggestionText}>{item.label}</Text>
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.suggestionStatus}>
                    <Text style={styles.suggestionStatusText}>
                      {getText(
                        'No matching food found',
                        '没有找到匹配食物',
                        'Tiada makanan ditemui'
                      )}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {searchText.trim().length === 0 && searchHistory.length > 0 && (
              <>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyTitle}>
                    {getText('Search History', '搜索记录', 'Sejarah Carian')}
                  </Text>

                  <Pressable onPress={() => setSearchHistory([])}>
                    <Text style={styles.clearHistory}>
                      {getText('Clear', '清空', 'Kosongkan')}
                    </Text>
                  </Pressable>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.suggestionsRow}
                >
                  {searchHistory.map((food) => (
                    <Chip
                      key={food}
                      label={food}
                      onPress={() => handleFoodSearch(food)}
                    />
                  ))}
                </ScrollView>
              </>
            )}
          </Card>

          {/* Child Profile */}
          {!activeChild ? (
            <EmptyState
              emoji="👶"
              title={getText(
                'No child profile yet',
                '还没有创建小孩档案',
                'Belum ada profil kanak-kanak'
              )}
              subtitle={getText(
                'You can still use food search, growth overview and health insights. Create a profile to unlock personalized meal plans.',
                '你仍然可以使用食品搜索、成长概览和健康建议。创建档案后可生成个性化食谱。',
                'Anda masih boleh guna carian makanan, gambaran pertumbuhan dan panduan kesihatan. Cipta profil untuk pelan makanan peribadi.'
              )}
              action={
                <PrimaryButton
                  title={getText('Create Profile', '创建档案', 'Cipta Profil')}
                  icon="add"
                  onPress={() => setShowAddChild(true)}
                />
              }
            />
          ) : (
            <>
              <Card style={styles.profileSummaryCard}>
                <View style={styles.profileSummaryTop}>
                  <Pressable onPress={() => setShowChildren(true)}>
                    <ChildAvatar
                      avatar={activeChild.avatar}
                      avatarImageUri={activeChild.avatarImageUri}
                      size={58}
                      style={styles.profileAvatar}
                    />
                  </Pressable>

                  <View style={styles.profileInfo}>
                    <View style={styles.profileNameRow}>
                      <Text style={styles.profileAge}>{activeChild.age}</Text>
                      <View style={styles.onlineDot} />
                    </View>

                    <Text style={styles.profileMeta}>
                      {activeChild.gender === 'boy'
                        ? getText('Boy', '男孩', 'Lelaki')
                        : getText('Girl', '女孩', 'Perempuan')}{' '}
                      · {activeChild.height}cm, {activeChild.weight}kg
                    </Text>

                    <Text style={styles.profileLastCheck}>
                      {t('lastCheck')}: {lastCheckDate}
                    </Text>
                  </View>

                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>
                      {activeChild.status || 'Normal'}
                    </Text>
                  </View>
                </View>

                {children.length > 1 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.childSwitcher}
                  >
                    {children.map((child: any) => (
                      <Chip
                        key={child.id}
                        label={getChildChipLabel(child)}
                        selected={child.id === activeChild.id}
                        onPress={() => switchToChild(child.id)}
                      />
                    ))}
                  </ScrollView>
                )}

                <View style={styles.profileActions}>
                  <Pressable
                    style={styles.mealPlanButton}
                    onPress={() => setShowDuration(true)}
                  >
                    <Ionicons name="calendar" size={16} color="#FFFFFF" />
                    <Text style={styles.mealPlanButtonText}>
                      {t('mealPlan')}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.checkHealthButton}
                    onPress={() => navigation.navigate('HealthCheck')}
                  >
                    <Ionicons
                      name="pulse"
                      size={17}
                      color={colors.primaryDark}
                    />
                    <Text style={styles.checkHealthButtonText}>
                      {t('checkHealth')}
                    </Text>
                  </Pressable>
                </View>
              </Card>

              <DigitalTwin
                tip={getTip()}
                nickname={`${activeChild.nickname}'s Twin`}
                isComplete={allGoalsMet}
              />
            </>
          )}

          {/* Growth Overview */}
          <Pressable
            style={styles.growthOverviewCard}
            onPress={() => navigation.navigate('Growth')}
          >
            <View style={styles.growthHeaderRow}>
              <Text style={styles.growthTitle}>{t('growthOverview')}</Text>

              <View style={styles.growthArrow}>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.primaryDark}
                />
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
                ? getText(
                    'Tap to view detailed growth chart',
                    '点击查看详细成长图表',
                    'Ketik untuk lihat carta pertumbuhan'
                  )
                : getText(
                    'Create profile to track growth',
                    '创建档案以追踪成长',
                    'Cipta profil untuk jejak pertumbuhan'
                  )}
            </Text>
          </Pressable>

          {/* Health Insights */} // JJ: Recovered
          <SectionTitle title={t('Health Insights')} />

          {topicsLoading ? (
             <ActivityIndicator size="small" color={colors.primaryDark} style={{ paddingVertical: 20 }} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.displayTopicsScroll}
            >
              {displayTopics.map((topic) => (
                <Pressable 
                  key={topic.id || topic.title} 
                  style={styles.topicCard}
                  onPress={() => {
                    setSelectedTopic(topic);
                    setShowTopicModal(true);
                  }}
                >
                  {/* 1. 悬浮的黑色半透明标签 (保留旧版设计) */}
                  <View style={styles.topicCategoryBadge}>
                    <Text style={styles.topicCategoryText}>
                      {topic?.category || "INSIGHT"}
                    </Text>
                  </View>

                  {/* 2. 封面大图 (保留旧版设计) */}
                  <Image 
                    source={{ uri: topic.imageUrl }} 
                    style={styles.topicImage} 
                    resizeMode="cover" 
                  />

                  {/* 3. 底部文字区 (保留旧版设计) */}
                  <View style={styles.topicTextContainer}>
                    <Text style={styles.topicTitle} numberOfLines={2}>
                      {topic.title}
                    </Text>
                    <Text style={styles.topicSummary} numberOfLines={2}>
                      {topic.summary}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </Screen>

      <Modal visible={showTopicModal} transparent animationType="fade">
        {/* 1. Change to modalOverlay */}
        <View style={styles.modalOverlay}>
          {selectedTopic && (
            <View style={styles.modalContent}>
              
              {/* 3. Change the top image area style */}
              <View style={styles.modalImageWrap}>
                <Image source={{ uri: selectedTopic.imageUrl }} style={styles.modalImage} resizeMode="cover" />
                <TouchableOpacity onPress={() => setShowTopicModal(false)} style={styles.modalCloseBtn}>
                  <X color="#FFFFFF" size={20} />
                </TouchableOpacity>
              </View>
              
              {/* 4. Change the article scroll area style */}
              <ScrollView contentContainerStyle={styles.modalBody}>
                <View style={styles.modalTagRow}>
                  <FileText color={colors.primaryDark} size={18} />
                  <Text style={styles.modalTagText}>Health Insights</Text>
                </View>
                
                <Text style={styles.modalTitle}>{selectedTopic.title}</Text>
                
                <Markdown
                  style={{
                    body: { color: '#475569', fontSize: 16, lineHeight: 24 },
                    strong: { fontWeight: 'bold', color: '#2F3A3A' },
                    ordered_list_icon: { color: colors.primaryDark, fontWeight: 'bold' }
                  }}
                >
                  {selectedTopic.content}
                </Markdown>
              </ScrollView>
              
              {/* 5. Change the bottom button style */}
              {selectedTopic.sourceUrl && (
                <View style={styles.modalFooter}>
                  <TouchableOpacity onPress={() => Linking.openURL(selectedTopic.sourceUrl)} style={styles.modalActionBtn}>
                    <ExternalLink color="#3B82F6" size={18} />
                    <Text style={styles.modalActionText}>Read Original</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>

      <LanguageModal
        visible={showLanguage}
        onClose={() => setShowLanguage(false)}
      />

      <MealPlanDurationModal
        visible={showDuration}
        onClose={() => setShowDuration(false)}
        onSelect={() => navigation.navigate('Meal')}
      />

      <AddChildModal
        visible={showAddChild}
        onClose={() => setShowAddChild(false)}
      />

      <ChildrenProfilesModal
        visible={showChildren}
        onClose={() => setShowChildren(false)}
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
    color: 'white',
    fontWeight: '800',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bg,
    borderRadius: 18,
    paddingHorizontal: 12,
    minHeight: 56,
  },

  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 10,
  },

  suggestionBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },

  suggestionItem: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },

  suggestionItemLast: {
    borderBottomWidth: 0,
  },

  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },

  suggestionStatus: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  suggestionStatusText: {
    fontSize: 13,
    color: colors.muted,
  },

  suggestionError: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },

  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },

  historyTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 13,
  },

  clearHistory: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 12,
  },

  suggestionsRow: {
    marginTop: 10,
  },

  profileSummaryCard: {
    padding: 18,
    borderRadius: 24,
  },

  profileSummaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  profileAvatar: {
    marginRight: 14,
  },

  profileInfo: {
    flex: 1,
  },

  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  profileAge: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },

  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },

  profileMeta: {
    marginTop: 4,
    fontSize: 13,
    color: colors.text,
  },

  profileLastCheck: {
    marginTop: 4,
    fontSize: 12,
    color: colors.muted,
  },

  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DDFBE8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusBadgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },

  childSwitcher: {
    marginTop: 14,
  },

  profileActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },

  mealPlanButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  mealPlanButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  checkHealthButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  checkHealthButtonText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '800',
  },

  growthOverviewCard: {
    backgroundColor: 'white',
    borderRadius: 22,
    padding: 16,
    minHeight: 150,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 2,
  },

  growthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  growthTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },

  growthArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  growthLineWrap: {
    height: 44,
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
  },

  growthDottedLine: {
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D3D8E0',
  },

  growthDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C6CDD8',
    top: 19,
  },

  growthHint: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },

 displayTopicsScroll: {
    paddingBottom: 8,
    gap: 16, // 旧版 UI 的间距
  },
  
  // Start, Recover the old structure of health insight.
  topicCard: {
    width: 256, // 对应旧版 w-64
    backgroundColor: '#FFFFFF',
    borderRadius: 24, // 对应旧版 rounded-3xl
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6', // 对应旧版 border-gray-100
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },

  topicCategoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)', // 对应 bg-black/50
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  topicCategoryText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  topicImage: {
    width: '100%',
    height: 160, // 对应旧版 h-40
  },

  topicTextContainer: {
    padding: 16,
  },

  topicTitle: {
    fontWeight: 'bold',
    color: '#2F3A3A',
    fontSize: 16,
    marginBottom: 4,
  },

  topicSummary: {
    fontSize: 12,
    color: '#7A8A8A',
  },

  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'center', 
    paddingHorizontal: 24 
  },

  modalContent: { 
    width: '100%', 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    overflow: 'hidden', 
    maxHeight: '85%' 
  },

  modalImageWrap: { width: '100%', height: 180, position: 'relative' },

  modalImage: { width: '100%', height: '100%' },

  modalCloseBtn: { 
    position: 'absolute', 
    top: 16, 
    right: 16, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    padding: 8, 
    borderRadius: 24 
  },

  modalBody: { padding: 24 },

  modalTagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },

  modalTagText: { color: colors.primaryDark, fontWeight: '600', fontSize: 14 },

  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#2F3A3A', marginBottom: 16, lineHeight: 32 },

  modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#F9FAFB' },

  modalActionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    backgroundColor: 'white', 
    paddingVertical: 14, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#E5E7EB' 
  },

  modalActionText: { color: '#3B82F6', fontWeight: 'bold', fontSize: 16 },
  // End, Recovery of the old design of health insights, JJ

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

  insightTitle: {
    color: colors.text,
    fontWeight: '800',
    marginTop: 12,
  },

  insightDesc: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
    marginTop: 8,
  },
});