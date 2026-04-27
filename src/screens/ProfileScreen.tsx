import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useChildProfile } from '../context/ChildProfileContext';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/colors';
import { Card, Header, IconButton, PrimaryButton, Screen, SectionTitle } from '../components/Common';
import ChildrenProfilesModal from '../components/ChildrenProfilesModal';
import LanguageModal from '../components/LanguageModal';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { t, language } = useLanguage();
  const { children, activeChild, savedRecipes, removeSavedRecipe } = useChildProfile();
  const [showChildren, setShowChildren] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const langCode = language === 'zh' ? 'ZH' : language === 'ms' ? 'MS' : 'EN';

  const tags = [
    ...(activeChild?.allergies || []),
    ...(activeChild?.restrictions?.vegetarian ? ['Vegetarian'] : []),
    ...(activeChild?.restrictions?.halal ? ['Halal'] : []),
    ...(activeChild?.restrictions?.lactoseIntolerance ? ['Lactose intolerance'] : []),
    ...(activeChild?.restrictions?.noSeafood ? ['No seafood'] : []),
  ];

  return (
    <>
      <Screen padded={false}>
        <Header
          title={t('profile')}
          subtitle={t('manageAccount')}
          icon="person"
          right={
            <Pressable style={styles.langButton} onPress={() => setShowLanguage(true)}>
              <Text style={styles.langText}>{langCode}</Text>
            </Pressable>
          }
        />
        <View style={styles.body}>
          <Card>
            <View style={styles.profileRow}>
              <Text style={styles.avatar}>{activeChild?.avatar || '👶'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{activeChild?.nickname || 'No Child Selected'}</Text>
                <Text style={styles.meta}>{children.length === 0 ? 'No children registered' : children.length === 1 ? '1 child registered' : `${children.length} children registered`}</Text>
                {activeChild && <Text style={styles.meta}>{activeChild.age} years · {activeChild.height}cm · {activeChild.weight}kg</Text>}
              </View>
              <IconButton icon="people" onPress={() => setShowChildren(true)} />
            </View>
            <PrimaryButton title={t('manageChildren')} icon="settings" onPress={() => setShowChildren(true)} style={{ marginTop: 16 }} />
          </Card>

          {activeChild && tags.length > 0 && (
            <Card>
              <Text style={styles.sectionHeading}>Preferences & Restrictions</Text>
              <View style={styles.tags}>{tags.map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}</View>
            </Card>
          )}

          <Card>
            {[
              [t('exportData'), 'JSON backup', 'download'],
              [t('importData'), 'Restore backup', 'cloud-upload'],
            ].map(([title, sub, icon]: any) => (
              <Pressable key={title} style={styles.settingRow}>
                <View style={styles.settingIcon}><Ionicons name={icon} color={colors.primaryDark} size={18} /></View>
                <View style={{ flex: 1 }}><Text style={styles.settingTitle}>{title}</Text><Text style={styles.meta}>{sub}</Text></View>
                <Ionicons name="chevron-forward" color={colors.muted} size={18} />
              </Pressable>
            ))}
          </Card>

          <SectionTitle title="Saved Recipes" />
          {savedRecipes.length === 0 ? (
            <Card style={styles.emptySavedCard}>
              <Text style={styles.emptySavedEmoji}>🔖</Text>
              <Text style={styles.emptySavedTitle}>No saved recipes yet</Text>
              <Text style={styles.emptySavedText}>Open a recipe detail page and tap Save to add it here.</Text>
            </Card>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
              {savedRecipes.map((recipe: any) => (
                <Pressable
                  key={recipe.id}
                  onPress={() => recipe.meal && navigation.navigate('RecipeDetail', { meal: recipe.meal })}
                  style={styles.recipeCard}
                >
                  {recipe.imageUrl ? <Image source={{ uri: recipe.imageUrl }} style={styles.recipeImage} /> : <View style={styles.recipePlaceholder}><Text style={{ fontSize: 28 }}>🍽️</Text></View>}
                  <Text style={styles.recipeName}>{recipe.name}</Text>
                  <Pressable style={styles.removeSaved} onPress={() => removeSavedRecipe(recipe.id)}>
                    <Ionicons name="close" size={16} color="white" />
                  </Pressable>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </Screen>
      <ChildrenProfilesModal visible={showChildren} onClose={() => setShowChildren(false)} />
      <LanguageModal visible={showLanguage} onClose={() => setShowLanguage(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 14, paddingBottom: 110 },
  langButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  langText: { color: 'white', fontWeight: '800' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { fontSize: 44 },
  name: { color: colors.text, fontSize: 20, fontWeight: '900' },
  meta: { color: colors.muted, marginTop: 3, fontSize: 12 },
  sectionHeading: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { color: colors.primaryDark, backgroundColor: colors.primaryLight, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 99, fontSize: 12, fontWeight: '800' },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  settingIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  settingTitle: { color: colors.text, fontWeight: '800' },
  emptySavedCard: { alignItems: 'center', paddingVertical: 28 },
  emptySavedEmoji: { fontSize: 42 },
  emptySavedTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 10 },
  emptySavedText: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  recipeCard: { width: 180, backgroundColor: 'white', borderRadius: 22, padding: 12, marginRight: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  recipeImage: { width: '100%', height: 100, borderRadius: 16, backgroundColor: colors.bg },
  recipePlaceholder: { width: '100%', height: 100, borderRadius: 16, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  recipeName: { color: colors.text, fontWeight: '800', marginTop: 10 },
  removeSaved: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
});
