import React, { useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/colors';
import { Header, PrimaryButton, Screen, SecondaryButton } from '../components/Common';

const sampleFoods = ['Nasi Lemak', 'Grilled Chicken', 'Fried Rice', 'Tom Yam Soup', 'Chicken Rice'];

function mockFoodRecognition() {
  return sampleFoods[Math.floor(Math.random() * sampleFoods.length)];
}

export default function CameraSearchScreen() {
  const navigation = useNavigation<any>();
  const { language } = useLanguage();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const [food, setFood] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [facing, setFacing] = useState<'back' | 'front'>('back');

  const getText = (en: string, zh: string, ms: string) => language === 'zh' ? zh : language === 'ms' ? ms : en;

  const detectAndNavigate = (source: 'camera' | 'gallery') => {
    setCapturing(true);
    setTimeout(() => {
      const result = mockFoodRecognition();
      setFood(result);
      setCapturing(false);
      setTimeout(() => navigation.replace('FoodInfo', { foodName: result, source: source === 'gallery' ? 'camera' : 'camera' }), 650);
    }, 900);
  };

  const capture = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    try {
      setCapturing(true);
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) setImageUri(photo.uri);
      detectAndNavigate('camera');
    } catch (error) {
      setCapturing(false);
      Alert.alert(getText('Camera error', '相机错误', 'Ralat kamera'), String(error));
    }
  };

  const pickFromAlbum = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(getText('Permission needed', '需要权限', 'Kebenaran diperlukan'), getText('Please allow photo library access.', '请允许访问相册。', 'Sila benarkan akses galeri.'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setImageUri(result.assets[0].uri);
      detectAndNavigate('gallery');
    }
  };

  if (!permission) {
    return (
      <Screen padded={false}>
        <Header title={getText('Camera Search', '相机搜索', 'Carian Kamera')} subtitle={getText('Loading camera...', '正在加载相机...', 'Memuat kamera...')} icon="camera" onBack={() => navigation.goBack()} />
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen padded={false}>
        <Header title={getText('Camera Search', '相机搜索', 'Carian Kamera')} subtitle={getText('Camera permission is required', '需要相机权限', 'Kebenaran kamera diperlukan')} icon="camera" onBack={() => navigation.goBack()} />
        <View style={styles.permissionBox}>
          <Ionicons name="camera" size={54} color={colors.primaryDark} />
          <Text style={styles.permissionTitle}>{getText('Allow camera access', '允许相机访问', 'Benarkan akses kamera')}</Text>
          <PrimaryButton title={getText('Allow Camera', '允许相机', 'Benarkan Kamera')} icon="camera" onPress={requestPermission} />
          <SecondaryButton title={getText('Upload from Album', '从相册上传', 'Muat naik dari Galeri')} icon="image" onPress={pickFromAlbum} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <Header title={getText('Camera Search', '相机搜索', 'Carian Kamera')} subtitle={getText('Take a photo or upload from album', '拍照或从相册上传', 'Ambil gambar atau muat naik dari galeri')} icon="camera" onBack={() => navigation.goBack()} />
      <View style={styles.viewer}>
        <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
          <View style={styles.scanBox}>
            <Ionicons name="scan" size={140} color="rgba(255,255,255,0.6)" />
            {capturing && <Text style={styles.detecting}>{getText('Recognizing food...', '正在识别食物...', 'Mengenal pasti makanan...')}</Text>}
            {!!food && <Text style={styles.detected}>{food}</Text>}
          </View>
        </CameraView>
      </View>

      {imageUri && (
        <View style={styles.previewRow}>
          <Image source={{ uri: imageUri }} style={styles.preview} />
          <Text style={styles.previewText}>{getText('Image selected', '已选择图片', 'Imej dipilih')}</Text>
        </View>
      )}

      <View style={styles.bottomBar}>
        <Pressable style={styles.smallCircle} onPress={() => setFacing((prev) => prev === 'back' ? 'front' : 'back')}>
          <Ionicons name="camera-reverse" color="white" size={22} />
        </Pressable>
        <PrimaryButton title={capturing ? getText('Recognizing...', '识别中...', 'Mengesan...') : getText('Capture', '拍照', 'Tangkap')} icon="camera" onPress={capture} disabled={capturing} style={{ minWidth: 140 }} />
        <Pressable style={styles.smallCircle} onPress={pickFromAlbum}>
          <Ionicons name="image" color="white" size={22} />
        </Pressable>
      </View>
      <Text style={styles.note}>{getText('Current recognition is demo data. Connect your food AI API here for real image recognition.', '当前识别是演示数据。接入你的食物识别 AI API 后即可真实识别。', 'Pengecaman kini data demo. Sambungkan API AI makanan untuk pengecaman sebenar.')}</Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  viewer: { backgroundColor: '#111827', minHeight: 500, margin: 20, borderRadius: 28, overflow: 'hidden' },
  camera: { flex: 1, minHeight: 500, alignItems: 'center', justifyContent: 'center' },
  scanBox: { width: 250, height: 250, borderRadius: 28, borderWidth: 3, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.15)' },
  detecting: { color: 'white', fontWeight: '900', marginTop: 12, textAlign: 'center' },
  detected: { color: '#BBF7D0', fontWeight: '900', marginTop: 12, fontSize: 18 },
  permissionBox: { margin: 20, backgroundColor: 'white', borderRadius: 24, padding: 24, gap: 14, alignItems: 'center' },
  permissionTitle: { fontSize: 20, color: colors.text, fontWeight: '900' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, paddingBottom: 16 },
  smallCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  previewRow: { marginHorizontal: 20, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white', borderRadius: 18, padding: 10 },
  preview: { width: 54, height: 54, borderRadius: 12 },
  previewText: { color: colors.text, fontWeight: '800' },
  note: { color: colors.muted, textAlign: 'center', marginHorizontal: 24, marginBottom: 28, fontSize: 12, lineHeight: 18 },
});
