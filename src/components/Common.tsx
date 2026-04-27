import React, { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

export function Screen({ children, padded = true }: PropsWithChildren<{ padded?: boolean }>) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, padded && styles.padded]}>
      {children}
    </ScrollView>
  );
}

export function Header({
  title,
  subtitle,
  icon,
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) + 12 }]}>
      <View style={styles.headerGlowOne} />
      <View style={styles.headerGlowTwo} />
      <View style={styles.headerRow}>
        {onBack ? (
          <IconButton icon="arrow-back" onPress={onBack} tone="light" />
        ) : icon ? (
          <Ionicons name={icon} size={24} color="white" />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
        </View>
        {right}
      </View>
    </View>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  icon,
  loading,
  style,
}: {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryButton,
        disabled && styles.disabledButton,
        pressed && !disabled ? styles.pressed : null,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color="white" /> : icon ? <Ionicons name={icon} size={18} color="white" /> : null}
      <Text style={styles.primaryButtonText}>{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  title,
  onPress,
  icon,
  style,
}: {
  title: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, style]}>
      {icon ? <Ionicons name={icon} size={18} color={colors.primaryDark} /> : null}
      <Text style={styles.secondaryButtonText}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  tone = 'default',
  size = 42,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  tone?: 'default' | 'light' | 'danger';
  size?: number;
}) {
  const color = tone === 'light' ? 'white' : tone === 'danger' ? colors.danger : colors.primaryDark;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        tone === 'light' && styles.iconButtonLight,
        tone === 'danger' && styles.iconButtonDanger,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={Math.floor(size * 0.48)} color={color} />
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      {icon ? <Ionicons name={icon} size={14} color={selected ? 'white' : colors.primaryDark} /> : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ emoji, title, subtitle, action }: { emoji: string; title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <Card style={styles.emptyCard}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
      {action}
    </Card>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionTitleWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );
}

export const commonStyles = styles;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 28 },
  padded: { paddingHorizontal: 20 },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 26,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerGlowOne: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.12)',
    left: -50,
    top: -20,
  },
  headerGlowTwo: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.08)',
    right: -20,
    bottom: -10,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, zIndex: 1 },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.92)', marginTop: 5, fontSize: 14 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 18,
    paddingHorizontal: 18,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: { color: 'white', fontWeight: '700', fontSize: 15 },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 18,
    paddingHorizontal: 16,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  disabledButton: { opacity: 0.45 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  iconButton: { backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  iconButtonLight: { backgroundColor: 'rgba(255,255,255,0.20)' },
  iconButtonDanger: { backgroundColor: '#FEE2E2' },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: { backgroundColor: colors.primaryDark },
  chipText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  chipTextSelected: { color: 'white' },
  emptyCard: { alignItems: 'center', paddingVertical: 36 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: colors.muted, textAlign: 'center', marginVertical: 14, lineHeight: 20 },
  sectionTitleWrap: { marginTop: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  sectionSubtitle: { color: colors.muted, marginTop: 4 },
});
