import React from 'react';
import { Image, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

type ChildAvatarProps = {
  avatar: string;
  avatarImageUri?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export default function ChildAvatar({ avatar, avatarImageUri, size = 44, style, textStyle }: ChildAvatarProps) {
  if (avatarImageUri) {
    return <Image source={{ uri: avatarImageUri }} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }, style]} />;
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Text style={[styles.emoji, { fontSize: Math.round(size * 0.52) }, textStyle]}>{avatar || '👶'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.bg,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  emoji: {
    textAlign: 'center',
  },
});