import React, { useMemo, useState } from 'react';
import { 
  Modal, 
  Platform, 
  Pressable, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View,
  ActivityIndicator // Add Loading Indicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar, ChevronDown, Ruler, Weight, X, CheckCircle2, HeartPulse } from 'lucide-react-native'; // 💡 新增 HeartPulse 图标
import { useLanguage } from '../context/LanguageContext';
import { useChildProfile } from '../context/ChildProfileContext';
import { colors } from '../theme/colors';
import { Card, Header, PrimaryButton, Screen } from '../components/Common';
import ChildAvatar from '../components/ChildAvatar';

const HEIGHT_STANDARDS = Array.from({ length: 230 }, (_, i) => i.toString()); // 0cm - 230cm
const WEIGHT_STANDARDS = Array.from({ length: 200 }, (_, i) => i.toString()); // 0kg - 200kg
const BASE_URL = "https://jom-healthy-java.onrender.com";  //Backend URL


export default function HealthCheckScreen() {
  const navigation = useNavigation<any>();
  const { t, language } = useLanguage();
  const { children } = useChildProfile();
  const getText = (en: string, zh: string, ms: string) => language === 'zh' ? zh : language === 'ms' ? ms : en;
  
  // --- The state for the form ---
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [gender, setGender] = useState<number | null>(null);
  const [birthday, setBirthday] = useState("");
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  
  // --- The state for the modals ---
  const [showHeightPicker, setShowHeightPicker] = useState(false);
  const [showWeightPicker, setShowWeightPicker] = useState(false);

  // --- The state for the results and backend engine ---
  const [bmi, setBmi] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [adviceText, setAdviceText] = useState("");
  const [isError, setIsError] = useState(false);

  const handleSelectChild = (child: any) => {
    if (selectedChildId === child.id) {
      setSelectedChildId(null);
      setGender(null);
      setBirthday("");
    } else {
      setSelectedChildId(child.id);
      setGender(child.gender === 'boy' ? 1 : 0);
      setBirthday(child.birthday || "");
    }
    setBmi(null); 
    setAdviceText(""); //  Clear old data
  };

  // Birthday handling logic
  const formatBirthday = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  const normalizeBirthdayInput = (value: string) => {
    const cleaned = value.replace(/-/g, '/').replace(/[^\d/]/g, '');
    const segments = cleaned.split('/').filter(Boolean).slice(0, 3);
    if (segments.length === 0) return '';
    const [year = '', month = '', day = ''] = segments;
    const next = [year.slice(0, 4)];
    if (segments.length >= 2) next.push(month.slice(0, 2).padStart(2, '0'));
    if (segments.length >= 3) next.push(day.slice(0, 2).padStart(2, '0'));
    return next.join('/');
  };

  const parseBirthday = (value: string) => {
    const normalized = normalizeBirthdayInput(value);
    const parts = normalized.split('/');
    if (parts.length !== 3) return null;
    const [year, month, day] = parts.map(Number);
    if (!year || !month || !day) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    if (date.getTime() > Date.now()) return null;
    return date;
  };

  const birthdayDate = useMemo(() => parseBirthday(birthday), [birthday]);
  const isFormValid = birthdayDate !== null && height !== "" && weight !== "" && gender !== null;

  const handleBirthdayChangeText = (value: string) => {
    setBirthday(normalizeBirthdayInput(value));
    setBmi(null);
    setAdviceText("");
  };

  const handleBirthdayPickerChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setBirthday(formatBirthday(selectedDate));
      setBmi(null);
      setAdviceText("");
    }
    if (Platform.OS !== 'ios') setShowBirthdayPicker(false);
  };

  const handleBirthdayBlur = () => {
    const parsed = birthdayDate;
    if (parsed) setBirthday(formatBirthday(parsed));
  };

  // Text formatting tool (from old code)
  const formatAdviceText = (text: string) => {
    if (!text) return "";
    return text
      .replace("Assessment results:", "\n\n📋 Assessment: ")
      .replace(" - It is recommended", "\n\n💡 Advice:\nIt is recommended")
      .replace("- It is recommended", "\n\n💡 Advice:\nIt is recommended");
  };

  // Core method combining frontend calculations with backend API
  const calculateBMI = async () => {
    if (!isFormValid) return;
    
    // 1. Frontend calculation of basic values for large display
    const h = Number(height) / 100;
    const w = Number(weight);
    if (h > 0 && w > 0) {
      const value = w / (h * h);
      setBmi(Number(value.toFixed(1)));
      setStatus(value < 14 ? t('underweight') : value < 18 ? t('normal') : t('overweight'));
      
      // 2. Trigger the backend WHO evaluation engine
      setIsLoading(true);
      setIsError(false);
      setAdviceText("");

      try {
        const url = `${BASE_URL}/api/bmi/evaluate?heightCm=${height}&weightKg=${weight}&birthDateStr=${birthday}&gender=${gender}`; //Server URL
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error('Server response error');
        
        const text = await response.text(); 
        setAdviceText(text);
      } catch (error) {
        console.error("Request to backend failed:", error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const RangeModal = ({ visible, title, options, onClose, onSelect, unit }: any) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color="#475569" size={22} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.sheetList}>
            {options.map((opt: string) => (
              <TouchableOpacity 
                key={opt} 
                style={styles.sheetItem} 
                onPress={() => { onSelect(opt); onClose(); }}
              >
                <Text style={styles.sheetItemText}>{opt} <Text style={styles.sheetItemUnit}>{unit}</Text></Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <Screen padded={false}>
      <Header title={t('checkChildHealth')} icon="fitness" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Card>
          
          {children && children.length > 0 && (
            <View style={[styles.fieldGroup, styles.profileSelectorSection]}>
              <Text style={styles.label}>{t('selectProfile') || 'Quick Select Profile'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.profileScroll}>
                {children.map((child: any) => {
                  const isSelected = selectedChildId === child.id;
                  return (
                    <TouchableOpacity 
                      key={child.id} 
                      onPress={() => handleSelectChild(child)}
                      style={[styles.profileAvatarItem, isSelected && styles.profileAvatarItemSelected]}
                    >
                      <ChildAvatar avatar={child.avatar} avatarImageUri={child.avatarImageUri} size={48} />
                      <Text style={styles.profileNickname} numberOfLines={1}>{child.nickname}</Text>
                      {isSelected && (
                        <View style={styles.selectedCheckmark}>
                          <CheckCircle2 color="#FFFFFF" size={12} fill={colors.primaryDark} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('gender') || 'Gender'}</Text>
            {selectedChildId ? (
              <View style={styles.lockedBox}>
                <Text style={styles.lockedText}>
                  {gender === 1 ? getText('👦 Boy', '👦 男孩', '👦 Lelaki') : getText('👧 Girl', '👧 女孩', '👧 Perempuan')}
                </Text>
              </View>
            ) : (
              <View style={styles.genderRow}>
                <TouchableOpacity 
                  onPress={() => { setGender(1); setBmi(null); setAdviceText(""); }} 
                  style={[styles.genderBtn, gender === 1 ? styles.genderBoyActive : styles.genderInactive]}
                >
                  <Text style={[styles.genderBtnText, gender === 1 ? styles.textBoyActive : styles.textInactive]}>{getText('👦 Boy', '👦 男孩', '👦 Lelaki')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => { setGender(0); setBmi(null); setAdviceText(""); }} 
                  style={[styles.genderBtn, gender === 0 ? styles.genderGirlActive : styles.genderInactive]}
                >
                  <Text style={[styles.genderBtnText, gender === 0 ? styles.textGirlActive : styles.textInactive]}>{getText('👧 Girl', '👧 女孩', '👧 Perempuan')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('birthday') || 'Date of Birth'}</Text>
            {selectedChildId ? (
              <View style={styles.lockedBox}>
                <View style={styles.dateInputLeft}>
                  <Calendar color="#9CA3AF" size={18} />
                  <Text style={styles.lockedText}>{birthday}</Text>
                </View>
              </View>
            ) : (
              <Pressable style={styles.dateButton} onPress={() => setShowBirthdayPicker((prev) => !prev)}>
                <View style={styles.dateInputLeft}>
                  <Calendar color={colors.primaryDark} size={18} />
                  <Text style={[styles.dateButtonText, !birthday && styles.datePlaceholder]}>
                    {birthday || 'YYYY/MM/DD'}
                  </Text>
                </View>
                <Text style={styles.dateButtonAction}>{showBirthdayPicker ? getText('Hide', '隐藏', 'Sembunyi') : getText('Choose', '选择', 'Pilih')}</Text>
              </Pressable>
            )}

            {showBirthdayPicker && !selectedChildId && (
              <View style={styles.pickerWrap}>
                <DateTimePicker 
                  value={birthdayDate || new Date()} 
                  mode="date" 
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'} 
                  maximumDate={new Date()} 
                  onChange={handleBirthdayPickerChange} 
                />
                <TextInput 
                  value={birthday} 
                  onChangeText={handleBirthdayChangeText} 
                  onBlur={handleBirthdayBlur} 
                  placeholder="YYYY/MM/DD" 
                  style={styles.hiddenInput} 
                  keyboardType="numbers-and-punctuation" 
                />
              </View>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('height') || 'Current Height (cm)'}</Text>
            <View style={styles.inputWithAddon}>
              <View style={styles.inputIconBox}><Ruler color="#22BBF7" size={18} /></View>
              <TextInput 
                value={height} 
                onChangeText={(val) => { setHeight(val); setBmi(null); setAdviceText(""); }} 
                placeholder={t('enterHeight') || "118"} 
                keyboardType="numeric" 
                style={styles.flexInput} 
              />
              <TouchableOpacity onPress={() => setShowHeightPicker(true)} style={styles.dropdownAddon}>
                <ChevronDown color={colors.muted} size={20} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('weight') || 'Current Weight (kg)'}</Text>
            <View style={styles.inputWithAddon}>
              <View style={[styles.inputIconBox, { backgroundColor: '#EAF7F0' }]}><Weight color="#16A34A" size={18} /></View>
              <TextInput 
                value={weight} 
                onChangeText={(val) => { setWeight(val); setBmi(null); setAdviceText(""); }} 
                placeholder={t('enterWeight') || "23"} 
                keyboardType="numeric" 
                style={styles.flexInput} 
              />
              <TouchableOpacity onPress={() => setShowWeightPicker(true)} style={styles.dropdownAddon}>
                <ChevronDown color={colors.muted} size={20} />
              </TouchableOpacity>
            </View>
          </View>

          <PrimaryButton 
            title={t('calculateBMI')} 
            onPress={calculateBMI} 
            disabled={!isFormValid || isLoading} 
            style={{ marginTop: 8 }} 
          />
        </Card>

        {/* Result Card */}
        {bmi !== null && (
          <Card style={styles.resultCard}>
            <Text style={styles.resultLabel}>{t('bmiResult')}</Text>
            <Text style={styles.bmi}>{bmi}</Text>
            <Text style={[styles.status, status === t('normal') ? styles.normal : status === t('underweight') ? styles.under : styles.over]}>
              {status}
            </Text>

            {/* WHO Rendering Area */}
            <View style={styles.adviceContainer}>
              {isLoading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={colors.primaryDark} />
                  <Text style={styles.loadingText}>{getText('Analyzing WHO Growth Standard...', '正在分析 WHO 生长标准...', 'Menganalisis Standard Pertumbuhan WHO...')}</Text>
                </View>
              ) : isError ? (
                <Text style={styles.errorText}>{getText('Failed to connect to the medical engine. Please try again.', '无法连接到医疗引擎，请重试。', 'Gagal menyambung ke enjin perubatan. Sila cuba lagi.')}</Text>
              ) : adviceText ? (
                <View>
                  <View style={styles.adviceHeader}>
                    <HeartPulse color={colors.primaryDark} size={20} />
                    <Text style={styles.adviceTitle}>{getText('WHO Medical Analysis', 'WHO 医学分析', 'Analisis Perubatan WHO')}</Text>
                  </View>
                  <Text style={styles.adviceBody}>
                    {formatAdviceText(adviceText).trim()}
                  </Text>
                </View>
              ) : null}
            </View>

            {selectedChildId ? (
              <PrimaryButton 
                title={t('saveRecommendations') || getText('Save Record', '保存记录', 'Simpan Rekod')} 
                icon="save" 
                disabled={isLoading || isError}
                onPress={() => navigation.goBack()} 
                style={{ marginTop: 24, width: '100%' }} 
              />
            ) : (
              <View style={{ marginTop: 24, alignItems: 'center' }}>
                <Text style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', paddingHorizontal: 16 }}>
                  {t('selectProfileToSave') || getText('* Select a profile above to save this record.', '* 请选择上方的档案来保存这条记录。', '* Pilih profil di atas untuk menyimpan rekod ini.')}
                </Text>
              </View>
            )}
          </Card>
        )}
        
      </ScrollView>

      {/* 选择面板 Modals */}
      <RangeModal 
        visible={showHeightPicker} 
        title={getText('Select Height', '选择身高', 'Pilih Tinggi')} 
        options={HEIGHT_STANDARDS} 
        unit="cm" 
        onClose={() => setShowHeightPicker(false)} 
        onSelect={(val: string) => { setHeight(val); setBmi(null); setAdviceText(""); }} 
      />
      <RangeModal 
        visible={showWeightPicker} 
        title={getText('Select Weight', '选择体重', 'Pilih Berat')} 
        options={WEIGHT_STANDARDS} 
        unit="kg" 
        onClose={() => setShowWeightPicker(false)} 
        onSelect={(val: string) => { setWeight(val); setBmi(null); setAdviceText(""); }} 
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 14, paddingBottom: 60 },
  fieldGroup: { marginBottom: 18 },
  label: { color: colors.text, fontWeight: '800', marginBottom: 8, fontSize: 14 },
  
  profileSelectorSection: { paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  profileScroll: { gap: 12, paddingVertical: 4 },
  profileAvatarItem: { alignItems: 'center', width: 64, position: 'relative', opacity: 0.7 },
  profileAvatarItemSelected: { opacity: 1 },
  profileNickname: { fontSize: 12, color: colors.text, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  selectedCheckmark: { position: 'absolute', top: -2, right: 4, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 2 },
  lockedBox: { backgroundColor: '#F3F4F6', borderRadius: 16, minHeight: 52, paddingHorizontal: 14, justifyContent: 'center' },
  lockedText: { color: '#9CA3AF', fontWeight: '700', fontSize: 15 },

  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: { flex: 1, paddingVertical: 12, borderRadius: 16, borderWidth: 2, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  genderInactive: { borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  genderBoyActive: { borderColor: '#4CAF7A', backgroundColor: '#EAF7F0' },
  genderGirlActive: { borderColor: '#FF9F6E', backgroundColor: '#FFE8DC' },
  genderBtnText: { fontWeight: '700', fontSize: 15 },
  textInactive: { color: '#9CA3AF' },
  textBoyActive: { color: '#4CAF7A' },
  textGirlActive: { color: '#FF9F6E' },

  dateButton: { backgroundColor: colors.bg, borderRadius: 16, minHeight: 52, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateInputLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateButtonText: { color: colors.text, fontWeight: '700', fontSize: 15 },
  datePlaceholder: { color: '#9CA3AF', fontWeight: '500' },
  dateButtonAction: { color: colors.primaryDark, fontWeight: '800', fontSize: 13 },
  pickerWrap: { marginTop: 8, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.bg },
  hiddenInput: { position: 'absolute', opacity: 0, height: 0, width: 0 },

  inputWithAddon: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: 16, minHeight: 52, paddingLeft: 6, paddingRight: 6 },
  inputIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EAF6FB', alignItems: 'center', justifyContent: 'center' },
  flexInput: { flex: 1, paddingHorizontal: 12, color: colors.text, fontSize: 15, fontWeight: '600', height: '100%' },
  dropdownAddon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 1 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '60%', paddingBottom: Platform.OS === 'ios' ? 30 : 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  closeBtn: { padding: 4 },
  sheetList: { paddingHorizontal: 20, paddingTop: 10 },
  sheetItem: { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  sheetItemText: { fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center' },
  sheetItemUnit: { fontSize: 14, color: colors.muted, fontWeight: '400' },

  // 💡 结果卡片及 WHO 引擎排版样式
  resultCard: { alignItems: 'center', paddingTop: 24, paddingBottom: 24 },
  resultLabel: { color: colors.muted, fontWeight: '700', fontSize: 15 },
  bmi: { color: colors.text, fontSize: 54, fontWeight: '900', marginVertical: 8 },
  status: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 99, fontWeight: '900', overflow: 'hidden' },
  normal: { backgroundColor: '#DCFCE7', color: '#16A34A' },
  under: { backgroundColor: '#FEF3C7', color: '#D97706' },
  over: { backgroundColor: '#FEE2E2', color: '#DC2626' },
  tip: { color: colors.muted, lineHeight: 21, fontSize: 13 },
  
  adviceContainer: { width: '100%', marginTop: 24, backgroundColor: '#F9FAFB', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6' },
  loadingBox: { padding: 32, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  errorText: { padding: 24, color: '#EF4444', textAlign: 'center', fontSize: 14, fontWeight: '600' },
  adviceHeader: { backgroundColor: '#EAF7F0', paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  adviceTitle: { color: colors.primaryDark, fontWeight: '800', fontSize: 15 },
  adviceBody: { padding: 20, color: '#4B5563', fontSize: 14, lineHeight: 24, fontWeight: '500' },
});