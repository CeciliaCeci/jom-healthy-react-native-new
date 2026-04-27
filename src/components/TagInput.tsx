import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Chip } from './Common';

export default function TagInput({
  tags,
  onChange,
  suggestions,
  placeholder = 'Type or select food preferences...',
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  placeholder?: string;
}) {
  const [value, setValue] = useState('');
  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed]);
    setValue('');
  };
  const removeTag = (tag: string) => onChange(tags.filter((item) => item !== tag));

  return (
    <View>
      {tags.length > 0 && (
        <View style={styles.tags}>
          {tags.map((tag) => (
            <Pressable key={tag} onPress={() => removeTag(tag)} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
              <Ionicons name="close" size={12} color="white" />
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={() => addTag(value)}
        />
        <Pressable onPress={() => addTag(value)} style={styles.addButton}>
          <Ionicons name="add" size={20} color="white" />
        </Pressable>
      </View>
      <View style={styles.suggestions}>
        {suggestions.map((suggestion) => (
          <Chip key={suggestion} label={suggestion} selected={tags.includes(suggestion)} onPress={() => (tags.includes(suggestion) ? removeTag(suggestion) : addTag(suggestion))} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tags: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primaryDark, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 99, marginRight: 8, marginBottom: 8 },
  tagText: { color: 'white', fontWeight: '700', fontSize: 12 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, backgroundColor: colors.bg, borderRadius: 16, paddingHorizontal: 14, minHeight: 46, color: colors.text },
  addButton: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
});
