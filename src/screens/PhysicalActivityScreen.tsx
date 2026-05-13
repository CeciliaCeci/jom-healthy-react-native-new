import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, Modal, ScrollView, Pressable, 
  TouchableOpacity, Dimensions, TouchableWithoutFeedback 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useActivity } from '../context/PhysicalActivityContext'; 
import { useChildProfile } from '../context/ChildProfileContext';

const { width } = Dimensions.get('window');

const PhysicalActivityScreen = ({ navigation }: any) => {
  // Pull shared state and functions from Context
  const { todayTotal, dailyGoal, logMinutes, updateGoal } = useActivity();
  const { activeChild } = useChildProfile();
  
  const [minutesToLog, setMinutesToLog] = useState(15);
  const [selectedCategory, setSelectedCategory] = useState('Outdoor');

  const [modalVisible, setModalVisible] = useState(false);
  const [activeRecommendation, setActiveRecommendation] = useState({ title: '', mins: 20 });
  const [popupMins, setPopupMins] = useState(20);

  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [tempGoal, setTempGoal] = useState(dailyGoal);

  const openLogPopup = (title: string, defaultMins: number) => {
    setActiveRecommendation({ title, mins: defaultMins });
    setPopupMins(defaultMins);
    setModalVisible(true);
  };

  const handlePopupSubmit = () => {
    logMinutes(popupMins);
    setModalVisible(false);
  };

  const categories = [
    { id: 'Outdoor', icon: '🏃', label: 'Outdoor' },
    { id: 'Sports', icon: '⚽', label: 'Sports' },
    { id: 'Indoor', icon: '🤸', label: 'Indoor' },
    { id: 'Family', icon: '👪', label: 'Family' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#334155" />
        </Pressable>
        <Text style={styles.headerTitle}>Log Activity</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        
        {/* 1. Log Activity Card*/}
        <View style={styles.inlineLogContainer}>
           <View style={styles.logBox}>
              <Text style={styles.logQuestion}>How many minutes did {activeChild?.nickname} play today?</Text>
              
              <View style={styles.counterRow}>
                <TouchableOpacity 
                  onPress={() => setMinutesToLog(Math.max(0, minutesToLog - 1))} 
                  style={styles.roundBtn}
                >
                  <Ionicons name="remove" size={28} color="#69B679" />
                </TouchableOpacity>
                <View style={{ alignItems: 'center', minWidth: 100 }}>
                  <Text style={styles.bigNumber}>{minutesToLog}</Text>
                  <Text style={styles.minsLabel}>minutes</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setMinutesToLog(minutesToLog + 1)} 
                  style={styles.roundBtn}
                >
                  <Ionicons name="add" size={28} color="#69B679" />
                </TouchableOpacity>
              </View>

              <View style={styles.quickSelectRow}>
                {[5, 10, 15].map(m => (
                  <TouchableOpacity 
                    key={m} 
                    style={[styles.quickBtn, minutesToLog === m && styles.quickBtnActive]}
                    onPress={() => setMinutesToLog(m)}
                  >
                    <Text style={[styles.quickText, minutesToLog === m && styles.quickTextActive]}>{m} min</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity 
                style={styles.mainLogBtn} 
                onPress={() => logMinutes(minutesToLog)}
              >
                <Text style={styles.mainLogBtnText}>Log Activity</Text>
              </TouchableOpacity>
            </View>
        </View>

        {/* 2. Categories Scroll */}
        <Text style={styles.sectionTitle}>💡 Recommended for {activeChild?.nickname}</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.categoryScrollContent} 
          style={styles.categoryScroll}
        >
          {categories.map((cat) => (
            <Pressable 
              key={cat.id}
              onPress={() => setSelectedCategory(cat.id)}
              style={[
                styles.categoryBtn, 
                selectedCategory === cat.id && styles.categoryBtnActive
              ]}
            >
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text style={[
                styles.categoryLabel, 
                selectedCategory === cat.id && styles.categoryLabelActive
              ]}>{cat.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* 3. Recommendation Cards*/}
        <ActivityRecommendationCard 
          title="Park Adventure"
          desc="Running, tag games, or exploring nature"
          tag="15-20 mins"
          subtext="Fresh air and natural exploration"
          onLog={() => openLogPopup("Park Adventure", 20)}
        />

        <ActivityRecommendationCard 
          title="Nature Walk"
          desc="Walking trails, bird watching, or collecting leaves"
          tag="20-25 mins"
          subtext="Develops curiosity and observation"
          onLog={() => openLogPopup("Nature Walk", 25)}
        />

        {/* 4. Synced Summary Card*/}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Today's Total</Text>
              <Text style={styles.summaryValue}>
                {todayTotal} <Text style={styles.unitText}>mins</Text>
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={styles.goalHeader}>
                 <Text style={styles.summaryLabel}>Daily Goal</Text>
                 <Pressable style={styles.editIcon} onPress={() => {
                    setTempGoal(dailyGoal);
                    setGoalModalVisible(true);
                  }}>
                    <Ionicons name="pencil" size={14} color="#69B679" />
                </Pressable>
              </View>
              <Text style={styles.summaryValue}>
                {dailyGoal} <Text style={styles.unitText}>mins</Text>
              </Text>
            </View>
          </View>
          <View style={styles.progressBarBg}>
             <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${Math.min((todayTotal / dailyGoal) * 100, 100)}%` }
                ]} 
             />
          </View>
        </View>

      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
            <View style={styles.modalBackgroundClick} />
          </TouchableWithoutFeedback>
          
          <View style={styles.modalContent}>
            <View style={styles.popupIconCircle}>
                <Text style={{ fontSize: 32 }}>🏃</Text>
            </View>

            <Text style={styles.popupTitle}>{activeRecommendation.title}</Text>
            <Text style={styles.popupSubtitle}>How long did they play?</Text>

            <View style={styles.popupCounterRow}>
              <TouchableOpacity 
                style={styles.popupSmallBtn} 
                onPress={() => setPopupMins(Math.max(1, popupMins - 1))}
              >
                <Ionicons name="remove" size={24} color="#69B679" />
              </TouchableOpacity>
              
              <View style={{ alignItems: 'center', marginHorizontal: 20 }}>
                <Text style={styles.popupBigNumber}>{popupMins}</Text>
                <Text style={styles.popupMinsLabel}>minutes</Text>
              </View>

              <TouchableOpacity 
                style={styles.popupSmallBtn} 
                onPress={() => setPopupMins(popupMins + 1)}
              >
                <Ionicons name="add" size={24} color="#69B679" />
              </TouchableOpacity>
            </View>

            <Text style={styles.popupInstruction}>Tap +/- to adjust duration</Text>

            <View style={styles.popupActionRow}>
                <TouchableOpacity 
                    style={styles.cancelBtn} 
                    onPress={() => setModalVisible(false)}
                >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.confirmLogBtn} 
                    onPress={handlePopupSubmit}
                >
                    <Text style={styles.confirmLogText}>Log It</Text>
                </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={goalModalVisible}
        onRequestClose={() => setGoalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.goalModalContent}>
            <Text style={styles.popupTitle}>Customize Daily Goal</Text>
            <Text style={styles.popupSubtitle}>Set a realistic target for {activeChild?.nickname}</Text>

            <View style={styles.goalSetterRow}>
              <TouchableOpacity 
                style={styles.goalAdjBtn} 
                onPress={() => setTempGoal(Math.max(5, tempGoal - 5))}
              >
                <Ionicons name="remove" size={32} color="#69B679" />
              </TouchableOpacity>
              
              <View style={styles.goalDisplayBox}>
                <Text style={styles.goalBigNum}>{tempGoal}</Text>
                <Text style={styles.goalUnitText}>mins / day</Text>
              </View>

              <TouchableOpacity 
                style={styles.goalAdjBtn} 
                onPress={() => setTempGoal(tempGoal + 5)}
              >
                <Ionicons name="add" size={32} color="#69B679" />
              </TouchableOpacity>
            </View>

            <Text style={styles.popupInstruction}>Tap +/- to adjust in 5-min intervals</Text>

            <View style={styles.recommendationTag}>
              <Text style={styles.recommendationText}>💡 Recommended: 60 - 90 mins / day</Text>
            </View>

            <View style={styles.popupActionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setGoalModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmLogBtn} onPress={() => {
                updateGoal(tempGoal);
                setGoalModalVisible(false);
              }}>
                <Text style={styles.confirmLogText}>Set Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Sub-component for Recommendations
const ActivityRecommendationCard = ({ title, desc, tag, subtext, onLog }: any) => (
  <View style={styles.recCard}>
    <View style={styles.recHeader}>
      <View style={styles.recIconCircle}>
        <Text style={{ fontSize: 24 }}>🏃</Text>
      </View>
      
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={styles.recTitleRow}>
          <Text style={styles.recTitle}>{title}</Text>
          <View style={styles.timeTag}>
            <Text style={styles.timeTagText}>{tag}</Text>
          </View>
        </View>
        <Text style={styles.recDesc}>{desc}</Text>
        <Text style={styles.recGreenSub}>✓ {subtext}</Text>
      </View>
    </View>

    <View style={styles.recButtonRow}>
      <TouchableOpacity style={styles.watchBtn}>
        <Ionicons name="play" size={16} color="#475569" style={{ marginRight: 6 }} />
        <Text style={styles.watchBtnText}>Watch Video</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.tapLogBtnLarge} onPress={onLog}>
        <Text style={styles.tapLogTextLarge}>Tap to Log</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 60, 
    paddingBottom: 15, 
    backgroundColor: '#FFF' 
  },
  backBtn: { 
    padding: 8, 
    marginLeft: -8 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1E293B' 
  },

  // Log Box Styles
  inlineLogContainer: { 
    padding: 20 
  },
  logBox: { 
    backgroundColor: '#ECF9F1', 
    padding: 24, 
    borderRadius: 35, 
    borderWidth: 1, 
    borderColor: '#DCFCE7' 
  },
  logQuestion: { 
    textAlign: 'center', 
    fontSize: 16, 
    color: '#334155', 
    fontWeight: '700', 
    marginBottom: 20 
  },
  counterRow: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 25, 
    marginBottom: 25 
  },
  roundBtn: { 
    width: 55, 
    height: 55, 
    backgroundColor: '#FFF', 
    borderRadius: 28, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
  bigNumber: { 
    fontSize: 56, 
    fontWeight: '800', 
    color: '#69B679' 
  },
  minsLabel: { 
    color: '#64748B', 
    marginTop: -5, 
    fontWeight: '600' 
  },
  quickSelectRow: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 10, 
    marginBottom: 25 
  },
  quickBtn: { 
    paddingHorizontal: 18, 
    paddingVertical: 10, 
    borderRadius: 20, 
    backgroundColor: '#FFF', 
    borderWidth: 1, 
    borderColor: '#69B67930' 
  },
  quickBtnActive: { 
    backgroundColor: '#69B679', 
    borderColor: '#69B679' 
  },
  quickText: { 
    color: '#69B679', 
    fontWeight: '600' 
  },
  quickTextActive: { 
    color: '#FFF' 
  },
  mainLogBtn: { 
    backgroundColor: '#69B679', 
    padding: 18, 
    borderRadius: 25, 
    alignItems: 'center' 
  },
  mainLogBtnText: { 
    color: '#FFF', 
    fontSize: 18, 
    fontWeight: '700' 
  },

  // Recommendations
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    marginLeft: 20, 
    marginBottom: 12, 
    color: '#334155' 
  },
  categoryScroll: { 
    marginBottom: 20 
  },
  categoryScrollContent: { 
    paddingHorizontal: 20, 
    gap: 10 
  },
  categoryBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 15, 
    backgroundColor: '#F1F5F9' 
  },
  categoryBtnActive: { 
    backgroundColor: '#69B679' 
  },
  categoryIcon: { 
    marginRight: 8, 
    fontSize: 16 
  },
  categoryLabel: { 
    fontWeight: '600', 
    color: '#475569' 
  },
  categoryLabelActive: { 
    color: '#FFF' 
  },

  // Recommendation Card Styles
  recCard: { 
    marginHorizontal: 20, 
    marginBottom: 16, 
    padding: 20, 
    backgroundColor: '#FFF', 
    borderRadius: 32, 
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  recHeader: { 
    flexDirection: 'row', 
    marginBottom: 18 
  },
  recIconCircle: { 
    width: 60, 
    height: 60, 
    backgroundColor: '#F0FDF4', 
    borderRadius: 30, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  recTitleRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  recTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1E293B' 
  },
  timeTag: { 
    backgroundColor: '#ECF9F1', 
    paddingHorizontal: 12, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  timeTagText: { 
    color: '#69B679', 
    fontSize: 13, 
    fontWeight: '700' 
  },
  recDesc: { 
    color: '#64748B', 
    fontSize: 14, 
    marginTop: 4, 
    lineHeight: 20 
  },
  recGreenSub: { 
    color: '#69B679', 
    fontSize: 13, 
    fontWeight: '600', 
    marginTop: 10 
  },
  recButtonRow: { flexDirection: 'row', gap: 12 },
  watchBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    backgroundColor: '#F1F5F9', 
    paddingVertical: 14, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  watchBtnText: { color: '#475569', fontWeight: '700', fontSize: 15 },
  tapLogBtnLarge: { 
    flex: 1, 
    backgroundColor: '#73BC7D', 
    paddingVertical: 14, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  tapLogTextLarge: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  // Summary Card
  summaryCard: { 
    margin: 20, 
    padding: 24, 
    borderRadius: 24, 
    backgroundColor: '#FFF', 
    borderWidth: 1, 
    borderColor: '#F1F5F9' 
  },
  summaryRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 15 
  },
  summaryLabel: { 
    color: '#64748B', 
    fontSize: 14, 
    marginBottom: 4 
  },
  summaryValue: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#1E293B' 
  },
  unitText: { 
    fontSize: 14, 
    color: '#94A3B8', 
    fontWeight: '400' 
  },
  goalHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6 
  },
  editIcon: { 
    backgroundColor: '#F0FDF4', 
    padding: 4, 
    borderRadius: 10 
  },
  progressBarBg: { 
    height: 8, 
    backgroundColor: '#F1F5F9', 
    borderRadius: 4, 
    overflow: 'hidden' 
  },
  progressBarFill: { 
    height: '100%', 
    backgroundColor: '#69B679' 
  },

  // Recommended Activity Popup Styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalBackgroundClick: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0 
  },
  modalContent: { 
    width: '85%', 
    backgroundColor: '#FFF', 
    borderRadius: 40, 
    padding: 30, 
    alignItems: 'center' 
  },
  popupIconCircle: { 
    width: 80, 
    height: 80, 
    backgroundColor: '#F0FDF4', 
    borderRadius: 40, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  popupTitle: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#000', 
    marginBottom: 5 
  },
  popupSubtitle: { 
    fontSize: 16, 
    color: '#64748B', 
    marginBottom: 30 
  },
  popupCounterRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 10 
  },
  popupSmallBtn: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#F0FDF4', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  popupBigNumber: { 
    fontSize: 64, 
    fontWeight: '800', 
    color: '#69B679' 
  },
  popupMinsLabel: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#334155', 
    marginTop: -10 
  },
  popupInstruction: { 
    color: '#94A3B8', 
    fontSize: 14, 
    marginBottom: 30 
  },
  popupActionRow: { 
    flexDirection: 'row', 
    gap: 15, 
    width: '100%' 
  },
  cancelBtn: { 
    flex: 1, 
    paddingVertical: 18, 
    borderRadius: 20, 
    backgroundColor: '#F1F5F9', 
    alignItems: 'center' 
  },
  cancelBtnText: { 
    color: '#475569', 
    fontWeight: '700', 
    fontSize: 16 
  },
  confirmLogBtn: { 
    flex: 1, 
    paddingVertical: 18, 
    borderRadius: 20, 
    backgroundColor: '#73BC7D', 
    alignItems: 'center' 
  },
  confirmLogText: { 
    color: '#FFF', 
    fontWeight: '700', 
    fontSize: 16 
  },

  // Modify Goal Popup Styles
  goalModalContent: {
    width: '90%',
    backgroundColor: '#FFF',
    borderRadius: 45,
    padding: 35,
    alignItems: 'center',
  },
  goalSetterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    gap: 15,
  },
  goalAdjBtn: {
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalDisplayBox: {
    width: 140,
    height: 140,
    backgroundColor: '#F0FDF4', // The light mint background
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalBigNum: {
    fontSize: 72,
    fontWeight: '800',
    color: '#69B679',
  },
  goalUnitText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '600',
    marginTop: -10,
  },
  recommendationTag: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 30,
  },
  recommendationText: {
    color: '#D97706',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default PhysicalActivityScreen;