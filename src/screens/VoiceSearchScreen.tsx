import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/colors';
import { Header, PrimaryButton, Screen } from '../components/Common';

export default function VoiceSearchScreen() {
  const navigation = useNavigation<any>();
  const { language } = useLanguage();
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const voiceRef = useRef<any>(null);
  const getText = (en: string, zh: string, ms: string) => language === 'zh' ? zh : language === 'ms' ? ms : en;

  useEffect(() => {
    try {
      // Real speech recognition requires a development build with @react-native-voice/voice.
      // Expo Go does not include this native module, so we keep a manual fallback.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Voice = require('@react-native-voice/voice').default;
      voiceRef.current = Voice;
      Voice.onSpeechStart = () => setListening(true);
      Voice.onSpeechEnd = () => setListening(false);
      Voice.onSpeechError = () => setListening(false);
      Voice.onSpeechResults = (event: any) => {
        const text = event.value?.[0] || '';
        setTranscript(text);
        setListening(false);
      };
      setVoiceReady(true);
      return () => {
        Voice.destroy?.().then(Voice.removeAllListeners);
      };
    } catch {
      setVoiceReady(false);
    }
  }, []);

  const startListening = async () => {
    if (!voiceRef.current) {
      Alert.alert(
        getText('Voice module unavailable', '语音模块不可用', 'Modul suara tidak tersedia'),
        getText('Expo Go does not support native speech recognition. Type the food name below, or use a development build to enable real voice input.', 'Expo Go 不支持原生语音识别。你可以先在下面输入食物名称，或者使用 Development Build 开启真实语音。', 'Expo Go tidak menyokong pengecaman suara natif. Taip nama makanan di bawah, atau guna development build.')
      );
      return;
    }
    try {
      setTranscript('');
      setListening(true);
      await voiceRef.current.start(language === 'zh' ? 'zh-CN' : language === 'ms' ? 'ms-MY' : 'en-US');
    } catch (error) {
      setListening(false);
      Alert.alert(getText('Voice error', '语音错误', 'Ralat suara'), String(error));
    }
  };

  const stopListening = async () => {
    try {
      await voiceRef.current?.stop?.();
    } finally {
      setListening(false);
    }
  };

  const searchTranscript = () => {
    const foodName = transcript.trim();
    if (!foodName) {
      Alert.alert(getText('No food name', '没有食物名称', 'Tiada nama makanan'), getText('Please speak or type a food name.', '请说出或输入食物名称。', 'Sila sebut atau taip nama makanan.'));
      return;
    }
    navigation.replace('FoodInfo', { foodName, source: 'voice' });
  };

  return (
    <Screen padded={false}>
      <Header title={getText('Voice Search', '语音搜索', 'Carian Suara')} subtitle={getText('Speak or type the name of a food', '说出或输入食物名称', 'Sebut atau taip nama makanan')} icon="mic" onBack={() => navigation.goBack()} />
      <View style={styles.center}>
        <Pressable style={[styles.micCircle, listening && styles.micCircleActive]} onPress={listening ? stopListening : startListening}>
          <Ionicons name={listening ? 'stop' : 'mic'} size={54} color="white" />
        </Pressable>
        <Text style={styles.title}>{listening ? getText('Listening...', '正在听...', 'Mendengar...') : getText('Voice Food Search', '语音食物搜索', 'Carian Makanan Suara')}</Text>
        <Text style={styles.sub}>{voiceReady ? getText('Tap the mic and say “Nasi Lemak”', '点击麦克风并说“椰浆饭”', 'Tekan mikrofon dan sebut “Nasi Lemak”') : getText('Manual fallback is enabled in Expo Go', 'Expo Go 中已启用手动备用输入', 'Input manual diaktifkan dalam Expo Go')}</Text>

        <View style={styles.inputWrap}>
          <Ionicons name="restaurant" size={20} color={colors.primaryDark} />
          <TextInput
            value={transcript}
            onChangeText={setTranscript}
            placeholder={getText('Food name from voice...', '语音识别的食物名称...', 'Nama makanan daripada suara...')}
            placeholderTextColor="#A8AFBA"
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={searchTranscript}
          />
        </View>
        <PrimaryButton title={getText('Search Food', '搜索食物', 'Cari Makanan')} icon="search" onPress={searchTranscript} style={{ marginTop: 16, minWidth: 180 }} />
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  center: { flex: 1, minHeight: 560, alignItems: 'center', justifyContent: 'center', padding: 20 },
  micCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primaryDark, shadowOpacity: 0.35, shadowRadius: 30, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
  micCircleActive: { borderWidth: 10, borderColor: '#BBF7D0' },
  title: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 26 },
  sub: { color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  inputWrap: { marginTop: 28, width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'white', borderRadius: 18, paddingHorizontal: 14, minHeight: 56, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  input: { flex: 1, color: colors.text, fontSize: 15 },
});
