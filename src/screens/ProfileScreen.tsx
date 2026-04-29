import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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

type BackupPayload = {
  backupType: 'JOMHEALTHY_BACKUP';
  appName: 'JomHealthy';
  version: number;
  exportedAt: string;
  data: Record<string, any> | [string, any][];
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

function isPlainObject(value: any) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function entriesFromBackupData(data: any, removeMetadata = false): [string, string][] {
  const metadataKeys = new Set([
    'backupType',
    'appName',
    'version',
    'exportedAt',
    'createdAt',
    'data',
  ]);

  const entries: [string, string][] = [];

  if (Array.isArray(data)) {
    data.forEach((item) => {
      if (Array.isArray(item) && item.length >= 2) {
        const key = String(item[0] || '').trim();

        if (key.length > 0 && (!removeMetadata || !metadataKeys.has(key))) {
          entries.push([key, normalizeBackupValue(item[1])]);
        }

        return;
      }

      if (isPlainObject(item)) {
        const key = String(item.key || item.name || '').trim();
        const value = item.value ?? item.data;

        if (key.length > 0 && value !== undefined && (!removeMetadata || !metadataKeys.has(key))) {
          entries.push([key, normalizeBackupValue(value)]);
        }
      }
    });

    return entries;
  }

  if (isPlainObject(data)) {
    Object.entries(data).forEach(([key, value]) => {
      const cleanKey = String(key || '').trim();

      if (cleanKey.length === 0) return;
      if (removeMetadata && metadataKeys.has(cleanKey)) return;

      entries.push([cleanKey, normalizeBackupValue(value)]);
    });
  }

  return entries;
}

function extractBackupEntries(payload: any): [string, string][] {
  if (!payload) return [];

  const candidates = [
    payload.data,
    payload.asyncStorageData,
    payload.asyncStorage,
    payload.storageData,
    payload.storage,
    payload.items,
  ];

  for (const candidate of candidates) {
    const entries = entriesFromBackupData(candidate);

    if (entries.length > 0) {
      return entries;
    }
  }

  // Also support importing a raw AsyncStorage JSON object directly.
  return entriesFromBackupData(payload, true);
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { t, language } = useLanguage();
  const childProfile = useChildProfile() as any;

  const {
    children = [],
    activeChild,
    savedRecipes = [],
    removeSavedRecipe,
    switchToChild,
  } = childProfile;

  const [showChildren, setShowChildren] = useState(false);
  const [showImportGuide, setShowImportGuide] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [importingData, setImportingData] = useState(false);


  const getText = (en: string, zh: string, ms: string) => {
    if (language === 'zh') return zh;
    if (language === 'ms') return ms;
    return en;
  };


  const getChildCountText = () => {
    if (children.length === 0) {
      return getText('No children registered', '还没有注册小孩档案', 'Belum ada profil kanak-kanak');
    }

    if (children.length === 1) {
      return getText('1 child registered', '已注册 1 个小孩', '1 profil kanak-kanak');
    }

    return getText(
      `${children.length} children registered`,
      `已注册 ${children.length} 个小孩`,
      `${children.length} profil kanak-kanak`
    );
  };

  const getGenderText = (gender?: string | null) => {
    if (gender === 'boy') return getText('boy', '男孩', 'lelaki');
    if (gender === 'girl') return getText('girl', '女孩', 'perempuan');
    return getText('child', '小孩', 'anak');
  };

  const getTagText = (tag: string) => {
    const value = String(tag || '').toLowerCase();

    if (value.includes('vegetarian')) return getText('Vegetarian', '素食', 'Vegetarian');
    if (value.includes('halal')) return getText('Halal', '清真', 'Halal');
    if (value.includes('lactose')) return getText('Lactose intolerance', '乳糖不耐受', 'Intoleransi laktosa');
    if (value.includes('seafood')) return getText('No seafood', '不吃海鲜', 'Tiada makanan laut');

    return tag;
  };

  const getLocalizedRecipeName = (recipe: any) => {
    if (language === 'zh') {
      return recipe?.nameCn || recipe?.strMealCn || recipe?.meal?.strMealCn || recipe?.meal?.nameCn || recipe?.name || recipe?.meal?.strMeal || getText('Recipe', '食谱', 'Resipi');
    }

    if (language === 'ms') {
      return recipe?.nameMs || recipe?.strMealMs || recipe?.meal?.strMealMs || recipe?.meal?.nameMs || recipe?.name || recipe?.meal?.strMeal || getText('Recipe', '食谱', 'Resipi');
    }

    return recipe?.nameEn || recipe?.strMealEn || recipe?.name || recipe?.meal?.strMealEn || recipe?.meal?.strMeal || getText('Recipe', '食谱', 'Resipi');
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
  const visibleChildren = useMemo<any[]>(() => {
    if (!children || children.length === 0) return [];
    return children.slice(0, 2);
  }, [children]);

  const handleSwitchChild = (childId: number) => {
    switchToChild(childId);
  };

  const exportAllDataToLocal = async () => {
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

      if (Object.keys(data).length === 0) {
        throw new Error(
          getText(
            'There is no app data to export yet.',
            '当前还没有可以导出的 App 数据。',
            'Belum ada data app untuk dieksport.'
          )
        );
      }

      const payload: BackupPayload = {
        backupType: BACKUP_TYPE,
        appName: 'JomHealthy',
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data,
      };

      const fileName = createBackupFileName();
      const backupText = JSON.stringify(payload, null, 2);

      const StorageAccessFramework = (FileSystem as any).StorageAccessFramework;

      if (Platform.OS === 'android' && StorageAccessFramework) {
        const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (permission.granted && permission.directoryUri) {
          const fileUri = await StorageAccessFramework.createFileAsync(
            permission.directoryUri,
            fileName,
            'application/json'
          );

          await FileSystem.writeAsStringAsync(fileUri, backupText, {
            encoding: FileSystem.EncodingType.UTF8,
          });

          Alert.alert(
            getText('Export complete', '导出完成', 'Eksport selesai'),
            getText(
              `Backup saved to your selected folder.\n\n${fileName}`,
              `备份已保存到你选择的文件夹。\n\n${fileName}`,
              `Sandaran telah disimpan ke folder yang dipilih.\n\n${fileName}`
            )
          );

          return;
        }
      }

      const fileUri = `${getBackupDirectory()}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, backupText, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const sharingAvailable = await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        Alert.alert(
          getText('Export complete', '导出完成', 'Eksport selesai'),
          getText(
            `Backup file created.\n\n${fileName}`,
            `备份文件已创建。\n\n${fileName}`,
            `Fail sandaran telah dibuat.\n\n${fileName}`
          )
        );
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: getText(
          'Save JomHealthy backup file',
          '保存 JomHealthy 备份文件',
          'Simpan fail sandaran JomHealthy'
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
      const entries = extractBackupEntries(payload);

      if (entries.length === 0) {
        throw new Error(
          getText(
            'This backup file does not contain any JomHealthy data.',
            '这个备份文件里面没有 JomHealthy 数据。',
            'Fail sandaran ini tidak mengandungi data JomHealthy.'
          )
        );
      }

      await AsyncStorage.multiSet(entries);

      if (typeof childProfile.reloadChildProfileData === 'function') {
        await childProfile.reloadChildProfileData();
      } else if (typeof childProfile.reloadFromStorage === 'function') {
        await childProfile.reloadFromStorage();
      } else if (typeof childProfile.refreshFromStorage === 'function') {
        await childProfile.refreshFromStorage();
      } else if (typeof childProfile.loadFromStorage === 'function') {
        await childProfile.loadFromStorage();
      }

      setShowImportGuide(false);

      Alert.alert(
        getText('Import complete', '导入完成', 'Import selesai'),
        getText(
          `Restored ${entries.length} data item(s) and refreshed the profile.`,
          `已恢复 ${entries.length} 条数据，并已自动刷新档案。`,
          `${entries.length} item data telah dipulihkan dan profil telah dikemas kini.`
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
        />

        <View style={styles.body}>
          <Card>
            <View style={styles.profileRow}>
              <Text style={styles.avatar}>{activeChild?.avatar || '👶'}</Text>

              <View style={styles.profileInfo}>
                <Text style={styles.name} numberOfLines={1}>
                  {activeChild?.nickname || getText('No Child Selected', '未选择小孩', 'Tiada Anak Dipilih')}
                </Text>

                <Text style={styles.meta}>
                  {getChildCountText()}
                </Text>

                {activeChild && (
                  <Text style={styles.meta}>
                    {activeChild.age} {getText('years', '岁', 'tahun')} · {getGenderText(activeChild.gender)} · {activeChild.height}cm ·{' '}
                    {activeChild.weight}kg
                  </Text>
                )}
              </View>

              <View style={styles.childSwitchSlot}>
                {visibleChildren.length > 0 ? (
                  <View style={styles.childSwitchWrap}>
                    {visibleChildren.map((child: any) => {
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
                {getText('Preferences & Restrictions', '偏好与限制', 'Pilihan & Sekatan')}
              </Text>

              <View style={styles.tags}>
                {tags.map((tag: string) => (
                  <Text key={getTagText(tag)} style={styles.tag}>
                    {getTagText(tag)}
                  </Text>
                ))}
              </View>
            </Card>
          )}

          <Card>
            <Pressable
              style={styles.settingRow}
              onPress={exportAllDataToLocal}
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
                    'Save JSON backup to phone storage',
                    '保存 JSON 备份到手机本地',
                    'Simpan sandaran JSON ke storan telefon'
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
                    'Choose a backup file from phone storage',
                    '从手机本地选择备份文件',
                    'Pilih fail sandaran daripada storan telefon'
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

          <SectionTitle title={getText('Saved Recipes', '收藏食谱', 'Resipi Tersimpan')} />

          {savedRecipes.length === 0 ? (
            <Card style={styles.emptySavedCard}>
              <Text style={styles.emptySavedEmoji}>🔖</Text>
              <Text style={styles.emptySavedTitle}>{getText('No saved recipes yet', '还没有收藏食谱', 'Belum ada resipi disimpan')}</Text>
              <Text style={styles.emptySavedText}>
                {getText('Open a recipe detail page and tap Save to add it here.', '打开食谱详情页，点击收藏即可显示在这里。', 'Buka halaman butiran resipi dan tekan Simpan untuk tambah di sini.')}
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
                      {getLocalizedRecipeName(recipe)}
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
                <Ionicons name="document-attach-outline" size={24} color="#22C55E" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.importTitle}>
                  {getText('Import Backup', '导入备份', 'Import Sandaran')}
                </Text>
                <Text style={styles.importSubTitle}>
                  {getText(
                    'Choose the JomHealthy backup JSON file from your phone.',
                    '从手机本地选择 JomHealthy 备份 JSON 文件。',
                    'Pilih fail JSON sandaran JomHealthy daripada telefon anda.'
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
                  '1. Tap Choose Backup File.',
                  '1. 点击选择备份文件。',
                  '1. Ketik Pilih Fail Sandaran.'
                )}
              </Text>
              <Text style={styles.importStepText}>
                {getText(
                  '2. Select the JomHealthy_Backup_xxx.json file.',
                  '2. 选择 JomHealthy_Backup_xxx.json 文件。',
                  '2. Pilih fail JomHealthy_Backup_xxx.json.'
                )}
              </Text>
              <Text style={styles.importStepText}>
                {getText(
                  '3. After import, the profile will refresh automatically.',
                  '3. 导入后档案会自动刷新。',
                  '3. Selepas import, profil akan dikemas kini secara automatik.'
                )}
              </Text>
            </View>


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
                'Only JSON backup files exported by JomHealthy can be imported.',
                '只能导入由 JomHealthy 导出的 JSON 备份文件。',
                'Hanya fail sandaran JSON yang dieksport oleh JomHealthy boleh diimport.'
              )}
            </Text>
          </View>
        </View>
      </Modal>

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
