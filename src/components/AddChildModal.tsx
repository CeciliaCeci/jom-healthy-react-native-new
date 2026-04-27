import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useChildProfile } from '../context/ChildProfileContext';
import { colors } from '../theme/colors';
import { Card, Chip, IconButton, PrimaryButton, SecondaryButton } from './Common';
import TagInput from './TagInput';

type Child = {
  id: number;
  avatar: string;
  nickname: string;
  birthday?: string;
  age: number;
  height: number;
  weight: number;
  gender: 'boy' | 'girl';
  allergies?: string[];
  restrictions?: { vegetarian?: boolean; halal?: boolean; lactoseIntolerance?: boolean; noSeafood?: boolean };
};

export default function AddChildModal({
  visible,
  onClose,
  onSuccess,
  childToEdit,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  childToEdit?: Child | null;
}) {
  const { addChild, updateChild } = useChildProfile();
  const avatars = ['😊', '😺', '🐶', '🐯', '🐻', '🧒', '🧚', '🦄', '🐰', '🐼', '🦁', '🐘', '🐸', '🦊'];
  const [selectedAvatar, setSelectedAvatar] = useState(childToEdit?.avatar || '😊');
  const [gender, setGender] = useState<'boy' | 'girl'>(childToEdit?.gender || 'boy');
  const [nickname, setNickname] = useState(childToEdit?.nickname || '');
  const [birthday, setBirthday] = useState(childToEdit?.birthday || '');
  const [height, setHeight] = useState(childToEdit?.height?.toString() || '');
  const [weight, setWeight] = useState(childToEdit?.weight?.toString() || '');
  const [allergies, setAllergies] = useState<string[]>(childToEdit?.allergies || []);
  const [restrictions, setRestrictions] = useState({
    vegetarian: childToEdit?.restrictions?.vegetarian || false,
    halal: childToEdit?.restrictions?.halal || false,
    lactoseIntolerance: childToEdit?.restrictions?.lactoseIntolerance || false,
    noSeafood: childToEdit?.restrictions?.noSeafood || false,
  });

  useEffect(() => {
    if (!visible) return;
    setSelectedAvatar(childToEdit?.avatar || '😊');
    setGender(childToEdit?.gender || 'boy');
    setNickname(childToEdit?.nickname || '');
    setBirthday(childToEdit?.birthday || '');
    setHeight(childToEdit?.height?.toString() || '');
    setWeight(childToEdit?.weight?.toString() || '');
    setAllergies(childToEdit?.allergies || []);
    setRestrictions({
      vegetarian: childToEdit?.restrictions?.vegetarian || false,
      halal: childToEdit?.restrictions?.halal || false,
      lactoseIntolerance: childToEdit?.restrictions?.lactoseIntolerance || false,
      noSeafood: childToEdit?.restrictions?.noSeafood || false,
    });
  }, [visible, childToEdit]);

  const valid = useMemo(() => nickname.trim() && birthday.trim() && Number(height) > 0 && Number(weight) > 0, [nickname, birthday, height, weight]);

  const calculateAge = (value: string) => {
    const parts = value.replace(/-/g, '/').split('/');
    if (parts.length !== 3) return 7;
    const birthDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    const monthDiff = now.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) age -= 1;
    return Math.max(0, age || 7);
  };

  const save = () => {
    if (!valid) return;
    const h = Number(height) / 100;
    const w = Number(weight);
    const bmiValue = w / (h * h);
    const child = {
      id: childToEdit?.id || Date.now(),
      nickname: nickname.trim(),
      avatar: selectedAvatar,
      age: calculateAge(birthday),
      height: Number(height),
      weight: Number(weight),
      gender,
      bmi: Number(bmiValue.toFixed(1)),
      status: bmiValue < 14 ? 'Underweight' : bmiValue < 18 ? 'Normal' : 'Overweight',
      birthday,
      preferences: [],
      allergies,
      restrictions,
    };
    childToEdit ? updateChild(child) : addChild(child);
    onSuccess?.();
    onClose();
  };

  const RowSwitch = ({ label, value, keyName }: { label: string; value: boolean; keyName: keyof typeof restrictions }) => (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch value={value} onValueChange={(next) => setRestrictions((prev) => ({ ...prev, [keyName]: next }))} thumbColor={value ? colors.primaryDark : '#F3F4F6'} trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }} />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Card style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{childToEdit ? 'Edit Child Profile' : 'Add Child'}</Text>
            <IconButton icon="close" onPress={onClose} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 18 }}>
            <Text style={styles.label}>Avatar</Text>
            <View style={styles.avatarGrid}>
              {avatars.map((avatar) => <Chip key={avatar} label={avatar} selected={selectedAvatar === avatar} onPress={() => setSelectedAvatar(avatar)} />)}
            </View>
            <SecondaryButton title="Random Avatar" icon="shuffle" onPress={() => setSelectedAvatar(avatars[Math.floor(Math.random() * avatars.length)])} />

            <Text style={styles.label}>Nickname</Text>
            <TextInput value={nickname} onChangeText={setNickname} placeholder="e.g. Aiman" style={styles.input} />
            <Text style={styles.label}>Birthday</Text>
            <TextInput value={birthday} onChangeText={setBirthday} placeholder="YYYY/MM/DD" style={styles.input} keyboardType="numbers-and-punctuation" />

            <View style={styles.twoCols}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Height (cm)</Text>
                <TextInput value={height} onChangeText={setHeight} placeholder="118" style={styles.input} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Weight (kg)</Text>
                <TextInput value={weight} onChangeText={setWeight} placeholder="23" style={styles.input} keyboardType="numeric" />
              </View>
            </View>

            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderRow}>
              <Chip label="Boy" icon="male" selected={gender === 'boy'} onPress={() => setGender('boy')} />
              <Chip label="Girl" icon="female" selected={gender === 'girl'} onPress={() => setGender('girl')} />
            </View>

            <Text style={styles.label}>Cannot Eat / Allergies</Text>
            <TagInput tags={allergies} onChange={setAllergies} suggestions={['Peanuts', 'Dairy', 'Shellfish', 'Eggs', 'Soy', 'Wheat', 'Tree nuts']} placeholder="Add allergy..." />

            <Text style={styles.label}>Dietary Restrictions</Text>
            <View style={styles.restrictions}>
              <RowSwitch label="Vegetarian" value={restrictions.vegetarian} keyName="vegetarian" />
              <RowSwitch label="Halal" value={restrictions.halal} keyName="halal" />
              <RowSwitch label="Lactose Intolerance" value={restrictions.lactoseIntolerance} keyName="lactoseIntolerance" />
              <RowSwitch label="No Seafood" value={restrictions.noSeafood} keyName="noSeafood" />
            </View>

            <PrimaryButton title={childToEdit ? 'Save Changes' : 'Create Profile'} icon="save" disabled={!valid} onPress={save} style={{ marginTop: 18 }} />
          </ScrollView>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  label: { marginTop: 16, marginBottom: 8, color: colors.text, fontWeight: '800' },
  input: { backgroundColor: colors.bg, borderRadius: 16, minHeight: 48, paddingHorizontal: 14, color: colors.text },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  twoCols: { flexDirection: 'row', gap: 12 },
  genderRow: { flexDirection: 'row' },
  restrictions: { backgroundColor: colors.bg, borderRadius: 18, paddingHorizontal: 14 },
  switchRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  switchLabel: { color: colors.text, fontWeight: '700' },
});
