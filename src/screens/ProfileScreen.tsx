import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChildProfile } from '../context/ChildProfileContext';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/colors';
import { Card, Header, IconButton, PrimaryButton, Screen, SectionTitle } from '../components/Common';
import ChildAvatar from '../components/ChildAvatar';
import ChildrenProfilesModal from '../components/ChildrenProfilesModal';
import LanguageModal from '../components/LanguageModal';

export default function ProfileScreen() {
  const { t, language } = useLanguage();
  const { children, activeChild } = useChildProfile();
  const [showChildren, setShowChildren] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const langCode = language === 'zh' ? 'ZH' : language === 'ms' ? 'MS' : 'EN';
  const savedRecipes = [
    { id: '1', name: 'Nasi Lemak with Egg', imageUrl: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&h=300&fit=crop' },
    { id: '2', name: 'Grilled Chicken Rice', imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop' },
    { id: '3', name: 'Tom Yam Soup', imageUrl: 'https://images.unsplash.com/photo-1547928576-e0f0c4d0c34e?w=400&h=300&fit=crop' },
  ];
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
        <Header title={t('profile')} subtitle={t('manageAccount')} icon="person" right={<Pressable style={styles.langButton} onPress={() => setShowLanguage(true)}><Text style={styles.langText}>{langCode}</Text></Pressable>} />
        <View style={styles.body}>
          <Card>
            <View style={styles.profileRow}>
              <ChildAvatar avatar={activeChild?.avatar || '👶'} avatarImageUri={activeChild?.avatarImageUri} size={56} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{activeChild?.nickname || 'No Child Selected'}</Text>
                <Text style={styles.meta}>{children.length === 0 ? 'No children registered' : children.length === 1 ? '1 child registered' : `${children.length} children registered`}</Text>
                {activeChild && <Text style={styles.meta}>{activeChild.age} years · {activeChild.height}cm · {activeChild.weight}kg</Text>}
                {activeChild?.birthday && <Text style={styles.meta}>Birthday · {activeChild.birthday}</Text>}
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
              [t('language'), langCode, 'language', () => setShowLanguage(true)],
              [t('exportData'), 'JSON backup', 'download', undefined],
              [t('importData'), 'Restore backup', 'cloud-upload', undefined],
              [t('notifications'), 'Daily reminders', 'notifications', undefined],
            ].map(([title, sub, icon, onPress]: any) => (
              <Pressable key={title} onPress={onPress} style={styles.settingRow}>
                <View style={styles.settingIcon}><Ionicons name={icon} color={colors.primaryDark} size={18} /></View>
                <View style={{ flex: 1 }}><Text style={styles.settingTitle}>{title}</Text><Text style={styles.meta}>{sub}</Text></View>
                <Ionicons name="chevron-forward" color={colors.muted} size={18} />
              </Pressable>
            ))}
          </Card>

          <SectionTitle title="Saved Recipes" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
            {savedRecipes.map((recipe) => (
              <Card key={recipe.id} style={styles.recipeCard}>
                <Image source={{ uri: recipe.imageUrl }} style={styles.recipeImage} />
                <Text style={styles.recipeName}>{recipe.name}</Text>
              </Card>
            ))}
          </ScrollView>
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
  avatar: { alignSelf: 'flex-start' },
  name: { color: colors.text, fontSize: 20, fontWeight: '900' },
  meta: { color: colors.muted, marginTop: 3, fontSize: 12 },
  sectionHeading: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { color: colors.primaryDark, backgroundColor: colors.primaryLight, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 99, fontSize: 12, fontWeight: '800' },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  settingIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  settingTitle: { color: colors.text, fontWeight: '800' },
  recipeCard: { width: 160, padding: 10, marginRight: 12 },
  recipeImage: { width: '100%', height: 92, borderRadius: 16, backgroundColor: colors.bg },
  recipeName: { color: colors.text, fontWeight: '800', marginTop: 8, fontSize: 13 },
});
