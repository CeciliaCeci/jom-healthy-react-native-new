import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChildProfile } from '../context/ChildProfileContext';
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
  const [showAdd, setShowAdd] = useState(false);
  const [childToEdit, setChildToEdit] = useState<Child | null>(null);
  const [toast, setToast] = useState('');

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
    Alert.alert('Delete Profile?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeChild(id) },
    ]);
  };

  return (
    <>
      <Modal visible={visible && !showAdd} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <Card style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>Children Profiles</Text>
              <IconButton icon="close" onPress={onClose} />
            </View>

            <PrimaryButton title="Add New Child" icon="add" onPress={openAddChild} />

            <ScrollView style={{ marginTop: 14 }} showsVerticalScrollIndicator={false}>
              {children.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyEmoji}>👶</Text>
                  <Text style={styles.emptyText}>No child profile yet</Text>
                  <Text style={styles.emptySub}>Tap Add New Child to create one.</Text>
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
                          {child.age} years · {child.height}cm · {child.weight}kg
                        </Text>
                        {active && <Text style={styles.activeText}>Active profile</Text>}
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

            <SecondaryButton title="Done" onPress={onClose} style={{ marginTop: 14 }} />
          </Card>
        </View>
      </Modal>

      <AddChildModal
        visible={visible && showAdd}
        childToEdit={childToEdit}
        onClose={handleCloseAdd}
        onSuccess={() => setToast(childToEdit ? 'Profile Updated!' : 'Profile Created!')}
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
