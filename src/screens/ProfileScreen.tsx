import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useChildProfile } from '../context/ChildProfileContext';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/colors';
import {
  Card,
  Header,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '../components/Common';
import ChildrenProfilesModal from '../components/ChildrenProfilesModal';
import LanguageModal from '../components/LanguageModal';

type BackupPayload = {
  backupType: 'JOMHEALTHY_BACKUP';
  appName: 'JomHealthy';
  version: number;
  exportedAt: string;
  data: Record<string, string>;
};

const BACKUP_TYPE = 'JOMHEALTHY_BACKUP';
const BACKUP_VERSION = 1;

function createBackupFileName() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  const hour = `${now.getHours()}`.padStart(2, '0');
  const minute = `${now.getMinutes()}`.padStart(2, '0');

  return `JomHealthy_Backup_${year}-${month}-${day}_${hour}-${minute}.json`;
}

function getBackupDirectory() {
  const backupDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;

  if (!backupDir) {
    throw new Error('File system directory is not available.');
  }

  return backupDir;
}


function isValidImageUrl(url?: string | null) {
  if (!url) return false;

  const lower = String(url).toLowerCase().trim();

  if (!lower.startsWith('https://') && !lower.startsWith('file://')) {
    return false;
  }

  if (lower.includes('example.com')) return false;
  if (lower.includes('placeholder')) return false;
  if (lower.includes('chicken-rice.jpg')) return false;

  return (
    lower.includes('.jpg') ||
    lower.includes('.jpeg') ||
    lower.includes('.png') ||
    lower.includes('.webp') ||
    lower.startsWith('file://')
  );
}

function guessMealEmoji(name?: string | null, category?: string | null) {
  const text = `${name || ''} ${category || ''}`.toLowerCase();

  if (text.includes('nasi lemak')) return '🍛';
  if (text.includes('fried rice')) return '🍛';
  if (
    text.includes('rice') ||
    text.includes('nasi') ||
    text.includes('biryani') ||
    text.includes('porridge') ||
    text.includes('congee')
  ) {
    return '🍚';
  }
  if (
    text.includes('noodle') ||
    text.includes('mee') ||
    text.includes('laksa') ||
    text.includes('ramen') ||
    text.includes('udon') ||
    text.includes('pasta') ||
    text.includes('spaghetti')
  ) {
    return '🍜';
  }
  if (text.includes('soup') || text.includes('stew') || text.includes('broth')) return '🍲';
  if (text.includes('salad') || text.includes('vegetable') || text.includes('veggie')) return '🥗';
  if (text.includes('sandwich') || text.includes('burger') || text.includes('toast')) return '🥪';
  if (text.includes('bread') || text.includes('roti') || text.includes('bun')) return '🍞';
  if (text.includes('pizza')) return '🍕';
  if (text.includes('taco') || text.includes('wrap')) return '🌮';
  if (text.includes('chicken') || text.includes('ayam')) return '🍗';
  if (text.includes('beef') || text.includes('steak')) return '🥩';
  if (text.includes('fish') || text.includes('salmon') || text.includes('tuna')) return '🐟';
  if (text.includes('shrimp') || text.includes('prawn') || text.includes('seafood')) return '🦐';
  if (text.includes('egg') || text.includes('omelette') || text.includes('omelet')) return '🥚';
  if (text.includes('tofu') || text.includes('bean') || text.includes('lentil')) return '🫘';
  if (text.includes('curry')) return '🍛';
  if (text.includes('satay')) return '🍢';
  if (text.includes('sushi')) return '🍣';
  if (text.includes('dumpling')) return '🥟';
  if (text.includes('potato') || text.includes('fries')) return '🥔';
  if (text.includes('corn')) return '🌽';
  if (text.includes('carrot')) return '🥕';
  if (text.includes('broccoli')) return '🥦';
  if (text.includes('tomato')) return '🍅';
  if (text.includes('avocado')) return '🥑';
  if (text.includes('banana')) return '🍌';
  if (text.includes('apple')) return '🍎';
  if (text.includes('orange')) return '🍊';
  if (text.includes('mango')) return '🥭';
  if (text.includes('strawberry') || text.includes('berry')) return '🍓';
  if (text.includes('fruit')) return '🍎';
  if (text.includes('yogurt') || text.includes('oat') || text.includes('cereal') || text.includes('granola')) return '🥣';
  if (text.includes('milk') || text.includes('smoothie')) return '🥛';
  if (text.includes('juice')) return '🧃';
  if (text.includes('snack') || text.includes('cookie') || text.includes('biscuit')) return '🍪';

  return '🍽️';
}

function getSavedRecipeImageUrl(recipe: any) {
  const possibleUrl =
    recipe?.imageUrl ||
    recipe?.strMealThumb ||
    recipe?.meal?.strMealThumb ||
    recipe?.meal?.imageUrl ||
    '';

  return isValidImageUrl(possibleUrl) ? possibleUrl : null;
}

function getSavedRecipeEmoji(recipe: any) {
  return (
    recipe?.mealIconEmoji ||
    recipe?.meal?.mealIconEmoji ||
    guessMealEmoji(
      recipe?.name || recipe?.strMeal || recipe?.meal?.strMeal,
      recipe?.category || recipe?.strCategory || recipe?.meal?.strCategory
    )
  );
}

function normalizeBackupValue(value: any) {
  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { t, language } = useLanguage();

  const {
    children,
    activeChild,
    savedRecipes,
    removeSavedRecipe,
    switchToChild,
  } = useChildProfile();

  const [showChildren, setShowChildren] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showImportGuide, setShowImportGuide] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [importingData, setImportingData] = useState(false);

  const langCode = language === 'zh' ? 'ZH' : language === 'ms' ? 'MS' : 'EN';

  const getText = (en: string, zh: string, ms: string) => {
    if (language === 'zh') return zh;
    if (language === 'ms') return ms;
    return en;
  };

  const tags = [
    ...(activeChild?.allergies || []),
    ...(activeChild?.restrictions?.vegetarian ? ['Vegetarian'] : []),
    ...(activeChild?.restrictions?.halal ? ['Halal'] : []),
    ...(activeChild?.restrictions?.lactoseIntolerance
      ? ['Lactose intolerance']
      : []),
    ...(activeChild?.restrictions?.noSeafood ? ['No seafood'] : []),
  ];

  /**
   * Keep children original order.
   * After switching children, button position will not jump.
   */
  const visibleChildren = useMemo(() => {
    if (!children || children.length === 0) return [];
    return children.slice(0, 2);
  }, [children]);

  const handleSwitchChild = (childId: number) => {
    switchToChild(childId);
  };

  const exportAllDataToWhatsApp = async () => {
    if (exportingData) return;

    setExportingData(true);

    try {
      const keys = await AsyncStorage.getAllKeys();
      const pairs = await AsyncStorage.multiGet(keys);

      const data: Record<string, string> = {};

      pairs.forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          data[key] = value;
        }
      });

      const payload: BackupPayload = {
        backupType: BACKUP_TYPE,
        appName: 'JomHealthy',
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data,
      };

      const fileName = createBackupFileName();
      const fileUri = `${getBackupDirectory()}${fileName}`;

      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(payload, null, 2),
        {
          encoding: FileSystem.EncodingType.UTF8,
        }
      );

      const sharingAvailable = await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        Alert.alert(
          getText('Sharing unavailable', '无法分享', 'Perkongsian tidak tersedia'),
          getText(
            'This device does not support file sharing.',
            '这个设备不支持文件分享。',
            'Peranti ini tidak menyokong perkongsian fail.'
          )
        );
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: getText(
          'Send backup to WhatsApp',
          '发送备份到 WhatsApp',
          'Hantar sandaran ke WhatsApp'
        ),
        UTI: 'public.json',
      });
    } catch (error: any) {
      console.log('Export backup failed:', error);
      Alert.alert(
        getText('Export failed', '导出失败', 'Eksport gagal'),
        error?.message ||
          getText(
            'Unable to export data. Please try again.',
            '无法导出数据，请重试。',
            'Tidak dapat mengeksport data. Cuba lagi.'
          )
      );
    } finally {
      setExportingData(false);
    }
  };

  const openWhatsApp = async () => {
    try {
      await Linking.openURL('whatsapp://app');
    } catch (error) {
      Alert.alert(
        getText('Cannot open WhatsApp', '无法打开 WhatsApp', 'Tidak dapat membuka WhatsApp'),
        getText(
          'Please make sure WhatsApp is installed. You can also download the backup file from WhatsApp, then come back and choose it here.',
          '请确认已安装 WhatsApp。你也可以先在 WhatsApp 下载备份文件，然后回来这里选择文件导入。',
          'Pastikan WhatsApp telah dipasang. Anda juga boleh muat turun fail sandaran daripada WhatsApp, kemudian kembali dan pilih fail di sini.'
        )
      );
    }
  };

  const importBackupFromFile = async () => {
    if (importingData) return;

    setImportingData(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];

      if (!asset?.uri) {
        throw new Error('No file selected.');
      }

      const backupText = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const payload = JSON.parse(backupText);

      if (!payload || payload.backupType !== BACKUP_TYPE || !payload.data) {
        throw new Error('This is not a valid JomHealthy backup file.');
      }

      const entries = Object.entries(payload.data).map(([key, value]) => [
        key,
        normalizeBackupValue(value),
      ]) as [string, string][];

      if (entries.length === 0) {
        throw new Error('The backup file is empty.');
      }

      await AsyncStorage.multiSet(entries);

      setShowImportGuide(false);

      Alert.alert(
        getText('Import complete', '导入完成', 'Import selesai'),
        getText(
          'Your backup has been restored. Please restart the app if some pages do not refresh immediately.',
          '备份已恢复。如果部分页面没有立刻刷新，请重启 App。',
          'Sandaran anda telah dipulihkan. Sila mulakan semula app jika sesetengah halaman tidak dikemas kini serta-merta.'
        )
      );
    } catch (error: any) {
      console.log('Import backup failed:', error);
      Alert.alert(
        getText('Import failed', '导入失败', 'Import gagal'),
        error?.message ||
          getText(
            'Unable to import data. Please choose a valid backup file.',
            '无法导入数据，请选择有效的备份文件。',
            'Tidak dapat mengimport data. Sila pilih fail sandaran yang sah.'
          )
      );
    } finally {
      setImportingData(false);
    }
  };

  return (
    <>
      <Screen padded={false}>
        <Header
          title={t('profile')}
          subtitle={t('manageAccount')}
          icon="person"
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
          <Card>
            <View style={styles.profileRow}>
              <Text style={styles.avatar}>{activeChild?.avatar || '👶'}</Text>

              <View style={styles.profileInfo}>
                <Text style={styles.name} numberOfLines={1}>
                  {activeChild?.nickname || 'No Child Selected'}
                </Text>

                <Text style={styles.meta}>
                  {children.length === 0
                    ? 'No children registered'
                    : children.length === 1
                      ? '1 child registered'
                      : `${children.length} children registered`}
                </Text>

                {activeChild && (
                  <Text style={styles.meta}>
                    {activeChild.age} years · {activeChild.height}cm ·{' '}
                    {activeChild.weight}kg
                  </Text>
                )}
              </View>

              <View style={styles.childSwitchSlot}>
                {visibleChildren.length > 0 ? (
                  <View style={styles.childSwitchWrap}>
                    {visibleChildren.map((child) => {
                      const isActive = activeChild?.id === child.id;

                      return (
                        <Pressable
                          key={child.id}
                          style={[
                            styles.childPill,
                            isActive
                              ? styles.childPillActive
                              : styles.childPillInactive,
                          ]}
                          onPress={() => handleSwitchChild(child.id)}
                        >
                          <Text style={styles.childPillAvatar}>
                            {child.avatar || '👶'}
                          </Text>

                          <Text
                            numberOfLines={1}
                            style={[
                              styles.childPillName,
                              isActive
                                ? styles.childPillNameActive
                                : styles.childPillNameInactive,
                            ]}
                          >
                            {child.nickname || 'Child'}
                          </Text>
                        </Pressable>
                      );
                    })}

                    {children.length > 2 && (
                      <Pressable
                        style={styles.moreChildrenButton}
                        onPress={() => setShowChildren(true)}
                      >
                        <Text style={styles.moreChildrenText}>
                          +{children.length - 2}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                ) : (
                  <Pressable
                    style={styles.emptySwitchButton}
                    onPress={() => setShowChildren(true)}
                  >
                    <Ionicons
                      name="people"
                      size={22}
                      color={colors.primaryDark}
                    />
                  </Pressable>
                )}
              </View>
            </View>

            <PrimaryButton
              title={t('manageChildren')}
              icon="settings"
              onPress={() => setShowChildren(true)}
              style={{ marginTop: 14 }}
            />
          </Card>

          {activeChild && tags.length > 0 && (
            <Card>
              <Text style={styles.sectionHeading}>
                Preferences & Restrictions
              </Text>

              <View style={styles.tags}>
                {tags.map((tag) => (
                  <Text key={tag} style={styles.tag}>
                    {tag}
                  </Text>
                ))}
              </View>
            </Card>
          )}

          <Card>
            <Pressable
              style={styles.settingRow}
              onPress={exportAllDataToWhatsApp}
              disabled={exportingData}
            >
              <View style={styles.settingIcon}>
                <Ionicons
                  name={exportingData ? 'hourglass-outline' : 'download'}
                  color={colors.primaryDark}
                  size={18}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>{t('exportData')}</Text>
                <Text style={styles.meta}>
                  {getText(
                    'Share JSON backup to WhatsApp',
                    '分享到 WhatsApp 的 JSON 备份',
                    'Kongsi sandaran JSON ke WhatsApp'
                  )}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                color={colors.muted}
                size={18}
              />
            </Pressable>

            <Pressable
              style={[styles.settingRow, styles.settingRowLast]}
              onPress={() => setShowImportGuide(true)}
              disabled={importingData}
            >
              <View style={styles.settingIcon}>
                <Ionicons
                  name={importingData ? 'hourglass-outline' : 'cloud-upload'}
                  color={colors.primaryDark}
                  size={18}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>{t('importData')}</Text>
                <Text style={styles.meta}>
                  {getText(
                    'Open WhatsApp, then choose backup file',
                    '打开 WhatsApp，然后选择备份文件',
                    'Buka WhatsApp, kemudian pilih fail sandaran'
                  )}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                color={colors.muted}
                size={18}
              />
            </Pressable>
          </Card>

          <SectionTitle title="Saved Recipes" />

          {savedRecipes.length === 0 ? (
            <Card style={styles.emptySavedCard}>
              <Text style={styles.emptySavedEmoji}>🔖</Text>
              <Text style={styles.emptySavedTitle}>No saved recipes yet</Text>
              <Text style={styles.emptySavedText}>
                Open a recipe detail page and tap Save to add it here.
              </Text>
            </Card>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.savedScroll}
              contentContainerStyle={styles.savedScrollContent}
            >
              {savedRecipes.map((recipe: any) => {
                const recipeImageUrl = getSavedRecipeImageUrl(recipe);
                const recipeEmoji = getSavedRecipeEmoji(recipe);

                return (
                  <Pressable
                    key={recipe.id}
                    onPress={() =>
                      recipe.meal &&
                      navigation.navigate('RecipeDetail', { meal: recipe.meal })
                    }
                    style={styles.recipeCard}
                  >
                    {recipeImageUrl ? (
                      <Image
                        source={{ uri: recipeImageUrl }}
                        style={styles.recipeImage}
                      />
                    ) : (
                      <View style={styles.recipePlaceholder}>
                        <Text style={styles.recipePlaceholderEmoji}>
                          {recipeEmoji}
                        </Text>
                      </View>
                    )}

                    <Text style={styles.recipeName} numberOfLines={2}>
                      {recipe.name || recipe.meal?.strMeal || 'Recipe'}
                    </Text>

                    <Pressable
                      style={styles.removeSaved}
                      onPress={() => removeSavedRecipe(recipe.id)}
                    >
                      <Ionicons name="close" size={16} color="white" />
                    </Pressable>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Screen>

      <Modal
        visible={showImportGuide}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImportGuide(false)}
      >
        <View style={styles.importOverlay}>
          <View style={styles.importModal}>
            <View style={styles.importHeader}>
              <View style={styles.importIconBox}>
                <Ionicons name="logo-whatsapp" size={24} color="#22C55E" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.importTitle}>
                  {getText('Import from WhatsApp', '从 WhatsApp 导入', 'Import dari WhatsApp')}
                </Text>
                <Text style={styles.importSubTitle}>
                  {getText(
                    'Find your backup file in WhatsApp first.',
                    '先在 WhatsApp 找到你的备份文件。',
                    'Cari fail sandaran anda di WhatsApp dahulu.'
                  )}
                </Text>
              </View>

              <Pressable
                style={styles.importCloseButton}
                onPress={() => setShowImportGuide(false)}
              >
                <Ionicons name="close" size={18} color={colors.muted} />
              </Pressable>
            </View>

            <View style={styles.importStepBox}>
              <Text style={styles.importStepText}>
                {getText(
                  '1. Tap Open WhatsApp and find the backup JSON in your chat.',
                  '1. 点击打开 WhatsApp，在聊天里找到备份 JSON 文件。',
                  '1. Ketik Buka WhatsApp dan cari JSON sandaran dalam chat.'
                )}
              </Text>
              <Text style={styles.importStepText}>
                {getText(
                  '2. Download/save the file if WhatsApp asks you to.',
                  '2. 如果 WhatsApp 提示，请先下载/保存文件。',
                  '2. Muat turun/simpan fail jika diminta oleh WhatsApp.'
                )}
              </Text>
              <Text style={styles.importStepText}>
                {getText(
                  '3. Come back here and tap Choose Backup File.',
                  '3. 回到这里，点击选择备份文件。',
                  '3. Kembali ke sini dan ketik Pilih Fail Sandaran.'
                )}
              </Text>
            </View>

            <Pressable style={styles.whatsAppButton} onPress={openWhatsApp}>
              <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
              <Text style={styles.whatsAppButtonText}>
                {getText('Open WhatsApp', '打开 WhatsApp', 'Buka WhatsApp')}
              </Text>
            </Pressable>

            <Pressable
              style={styles.chooseFileButton}
              onPress={importBackupFromFile}
              disabled={importingData}
            >
              <Ionicons
                name={importingData ? 'hourglass-outline' : 'document-attach-outline'}
                size={18}
                color={colors.primaryDark}
              />
              <Text style={styles.chooseFileButtonText}>
                {importingData
                  ? getText('Importing...', '导入中...', 'Mengimport...')
                  : getText('Choose Backup File', '选择备份文件', 'Pilih Fail Sandaran')}
              </Text>
            </Pressable>

            <Text style={styles.importNote}>
              {getText(
                'For security reasons, JomHealthy cannot directly read WhatsApp chats. Please choose the backup file after saving/downloading it.',
                '出于安全原因，JomHealthy 不能直接读取 WhatsApp 聊天。请先保存/下载备份文件后再选择导入。',
                'Atas sebab keselamatan, JomHealthy tidak boleh membaca chat WhatsApp secara terus. Sila pilih fail sandaran selepas disimpan/dimuat turun.'
              )}
            </Text>
          </View>
        </View>
      </Modal>

      <ChildrenProfilesModal
        visible={showChildren}
        onClose={() => setShowChildren(false)}
      />

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
    color: 'white',
    fontWeight: '800',
  },

  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  avatar: {
    fontSize: 42,
  },

  profileInfo: {
    flex: 1,
    minWidth: 0,
  },

  name: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },

  meta: {
    color: colors.muted,
    marginTop: 3,
    fontSize: 12,
  },

  childSwitchSlot: {
    width: 138,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  childSwitchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  childPill: {
    width: 64,
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  childPillActive: {
    backgroundColor: colors.primaryDark,
  },

  childPillInactive: {
    backgroundColor: colors.primaryLight,
  },

  childPillAvatar: {
    fontSize: 17,
  },

  childPillName: {
    fontSize: 13,
    fontWeight: '900',
    maxWidth: 28,
  },

  childPillNameActive: {
    color: '#FFFFFF',
  },

  childPillNameInactive: {
    color: colors.primaryDark,
  },

  moreChildrenButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  moreChildrenText: {
    color: colors.primaryDark,
    fontWeight: '900',
    fontSize: 12,
  },

  emptySwitchButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },

  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  tag: {
    color: colors.primaryDark,
    backgroundColor: colors.primaryLight,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 99,
    fontSize: 12,
    fontWeight: '800',
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },

  settingRowLast: {
    borderBottomWidth: 0,
  },

  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingTitle: {
    color: colors.text,
    fontWeight: '800',
  },

  emptySavedCard: {
    alignItems: 'center',
    paddingVertical: 28,
  },

  emptySavedEmoji: {
    fontSize: 42,
  },

  emptySavedTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 10,
  },

  emptySavedText: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },

  savedScroll: {
    marginHorizontal: -20,
  },

  savedScrollContent: {
    paddingHorizontal: 20,
  },

  recipeCard: {
    width: 180,
    backgroundColor: 'white',
    borderRadius: 22,
    padding: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 2,
  },

  recipeImage: {
    width: '100%',
    height: 100,
    borderRadius: 16,
    backgroundColor: colors.bg,
  },

  recipePlaceholder: {
    width: '100%',
    height: 100,
    borderRadius: 16,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  recipePlaceholderEmoji: {
    fontSize: 42,
  },

  recipeName: {
    color: colors.text,
    fontWeight: '800',
    marginTop: 10,
  },

  removeSaved: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  importOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },

  importModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 34,
  },

  importHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  importIconBox: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  importTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },

  importSubTitle: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },

  importCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  importStepBox: {
    marginTop: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },

  importStepText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },

  whatsAppButton: {
    marginTop: 16,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#22C55E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  whatsAppButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  chooseFileButton: {
    marginTop: 10,
    height: 48,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  chooseFileButtonText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '900',
  },

  importNote: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
