import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChildProfile } from '../context/ChildProfileContext';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/colors';
import { Card, IconButton, PrimaryButton, SecondaryButton } from './Common';
import AddChildModal from './AddChildModal';
import ChildAvatar from './ChildAvatar';
import Toast from './Toast';

type Child = {
  id: number;
  avatar: string;
  avatarImageUri?: string;
  nickname: string;
  birthday?: string;
  age: number;
  height: number;
  weight: number;
  gender: 'boy' | 'girl';
  allergies?: string[];
  restrictions?: any;
};

export default function ChildrenProfilesModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { children, activeChild, removeChild, switchToChild } = useChildProfile();
  const { language } = useLanguage();
  const [showAdd, setShowAdd] = useState(false);
  const [childToEdit, setChildToEdit] = useState<Child | null>(null);
  const [toast, setToast] = useState('');

  const getText = (en: string, zh: string, ms: string) => language === 'zh' ? zh : language === 'ms' ? ms : en;

  const openAddChild = () => {
    setChildToEdit(null);
    setShowAdd(true);
  };

  const openEditChild = (child: Child) => {
    setChildToEdit(child);
    setShowAdd(true);
  };

  const handleCloseAdd = () => {
    setShowAdd(false);
    setChildToEdit(null);
  };

  const deleteChild = (id: number) => {
    Alert.alert(getText('Delete Profile?', '删除资料？', 'Padam Profil?'), getText('This action cannot be undone.', '此操作无法撤消。', 'Tindakan ini tidak boleh dibuat asal.'), [
      { text: getText('Cancel', '取消', 'Batal'), style: 'cancel' },
      { text: getText('Delete', '删除', 'Padam'), style: 'destructive', onPress: () => removeChild(id) },
    ]);
  };

  return (
    <>
      <Modal visible={visible && !showAdd} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <Card style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>{getText('Children Profiles', '儿童资料', 'Profil Kanak-kanak')}</Text>
              <IconButton icon="close" onPress={onClose} />
            </View>

            <PrimaryButton title={getText('Add New Child', '添加新孩子', 'Tambah Kanak-kanak Baru')} icon="add" onPress={openAddChild} />

            <ScrollView style={{ marginTop: 14 }} showsVerticalScrollIndicator={false}>
              {children.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyEmoji}>👶</Text>
                  <Text style={styles.emptyText}>{getText('No child profile yet', '还没有儿童资料', 'Belum ada profil kanak-kanak')}</Text>
                  <Text style={styles.emptySub}>{getText('Tap Add New Child to create one.', '点击“添加新孩子”创建一个。', 'Ketik Tambah Kanak-kanak Baru untuk mencipta satu.')}</Text>
                </View>
              ) : (
                children.map((child: Child) => {
                  const active = activeChild?.id === child.id;
                  return (
                    <Pressable
                      key={child.id}
                      onPress={() => switchToChild(child.id)}
                      style={[styles.childCard, active && styles.childCardActive]}
                    >
                      <ChildAvatar avatar={child.avatar} avatarImageUri={child.avatarImageUri} size={48} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.childName}>{child.nickname}</Text>
                        <Text style={styles.childInfo}>
                          {child.age} {getText('years', '岁', 'tahun')} · {child.height}cm · {child.weight}kg
                        </Text>
                        {active && <Text style={styles.activeText}>{getText('Active profile', '当前资料', 'Profil aktif')}</Text>}
                      </View>
                      <View style={styles.actions}>
                        <IconButton icon="pencil" size={36} onPress={() => openEditChild(child)} />
                        <IconButton icon="trash" tone="danger" size={36} onPress={() => deleteChild(child.id)} />
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <SecondaryButton title={getText('Done', '完成', 'Selesai')} onPress={onClose} style={{ marginTop: 14 }} />
          </Card>
        </View>
      </Modal>

      <AddChildModal
        visible={visible && showAdd}
        childToEdit={childToEdit}
        onClose={handleCloseAdd}
        onSuccess={() => setToast(childToEdit ? getText('Profile Updated!', '资料已更新！', 'Profil dikemas kini!') : getText('Profile Created!', '资料已创建！', 'Profil dicipta!'))}
      />

      {!!toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  childCard: { marginBottom: 12, borderRadius: 20, padding: 14, backgroundColor: colors.bg, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: 'transparent' },
  childCardActive: { borderColor: colors.primaryDark, backgroundColor: '#F0FDF4' },
  childName: { fontSize: 17, color: colors.text, fontWeight: '800' },
  childInfo: { color: colors.muted, marginTop: 3 },
  activeText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8 },
  emptyBox: { alignItems: 'center', paddingVertical: 36 },
  emptyEmoji: { fontSize: 42 },
  emptyText: { color: colors.text, fontWeight: '900', marginTop: 8, fontSize: 16 },
  emptySub: { color: colors.muted, fontWeight: '600', marginTop: 6, fontSize: 12 },
});
