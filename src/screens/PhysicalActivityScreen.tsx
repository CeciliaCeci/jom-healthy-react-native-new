import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Animated, ScrollView } from 'react-native';
import { useChildProfile } from '../context/ChildProfileContext';
import { Header, Screen } from '../components/Common';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G, Text as SvgText, TSpan } from 'react-native-svg';

const ACTIVITY_TYPES = [
  { id: 'Play', icon: '🏃', color: '#F59E0B' },
  { id: 'Sports', icon: '⚽', color: '#10B981' },
  { id: 'Walking', icon: '👟', color: '#3B82F6' },
  { id: 'Cycling', icon: '🚲', color: '#8B5CF6' },
  { id: 'Swimming', icon: '🏊', color: '#06B6D4' },
  { id: 'Other', icon: '➕', color: '#64748B' },
];

export default function PhysicalActivityScreen({ navigation }: any) {
  const { activeChild, activityHistory, addActivity, dailyActivityGoal = 60 } = useChildProfile();
  const [selectedType, setSelectedType] = useState('Play');
  
  // Calculate today's total minutes
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysRecords = activityHistory.filter(r => r.date === todayStr);
  const totalMinutes = todaysRecords.reduce((sum, r) => sum + r.minutes, 0);

  // Animation for the progress ring
  const animatedValue = useRef(new Animated.Value(0)).current;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  
  useEffect(() => {
    const progress = Math.min(totalMinutes / dailyActivityGoal, 1);
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [totalMinutes]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const handleAddActivity = (mins: number) => {
    addActivity(mins, selectedType);
  };

  return (
    <Screen>
      <Header title="Physical Activity" onBack={() => navigation.goBack()} />
      
      <ScrollView contentContainerStyle={styles.container}>
        {/* --- PROGRESS RING --- */}
        <View style={styles.ringSection}>
          <Svg width={180} height={180} viewBox="0 0 180 180">
            <G rotation="-90" origin="90, 90">
              <Circle cx="90" cy="90" r={radius} stroke="#E2E8F0" strokeWidth="15" fill="none" />
              <AnimatedCircle
                cx="90" cy="90" r={radius}
                stroke={totalMinutes >= dailyActivityGoal ? '#10B981' : '#F59E0B'}
                strokeWidth="15" fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </G>
            <SvgText x="90" y="85" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#1E293B">
              {totalMinutes}
            </SvgText>
            <SvgText x="90" y="105" textAnchor="middle" fontSize="12" fill="#64748B">
                {`of ${dailyActivityGoal} mins`}
            </SvgText>
          </Svg>
        </View>

        {/* --- TYPE SELECTION --- */}
        <Text style={styles.sectionTitle}>Activity Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {ACTIVITY_TYPES.map((type) => (
            <Pressable 
              key={type.id} 
              style={[styles.chip, selectedType === type.id && { backgroundColor: type.color, borderColor: type.color }]}
              onPress={() => setSelectedType(type.id)}
            >
              <Text style={[styles.chipText, selectedType === type.id && { color: 'white' }]}>
                {type.icon} {type.id}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* --- QUICK ADD --- */}
        <View style={styles.quickAddRow}>
          {[15, 30, 60].map((mins) => (
            <Pressable key={mins} style={styles.addBtn} onPress={() => handleAddActivity(mins)}>
              <Ionicons name="add-circle" size={20} color="#F59E0B" />
              <Text style={styles.addBtnText}>{mins}m</Text>
            </Pressable>
          ))}
        </View>

        {/* --- LOG LIST --- */}
        <Text style={styles.sectionTitle}>Today's Movement</Text>
        {todaysRecords.length === 0 ? (
          <Text style={styles.emptyText}>Keep moving! No activity logged yet.</Text>
        ) : (
          todaysRecords.map((item, idx) => (
            <View key={idx} style={styles.historyItem}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyIcon}>
                  {ACTIVITY_TYPES.find(t => t.id === item.activityType)?.icon || '🏃'}
                </Text>
                <View>
                  <Text style={styles.historyType}>{item.activityType}</Text>
                  <Text style={styles.historyTime}>{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                </View>
              </View>
              <Text style={styles.historyAmount}>{item.minutes} mins</Text>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  ringSection: { alignItems: 'center', marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#1E293B' },
  chipScroll: { marginBottom: 20 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 10 },
  chipText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  quickAddRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  addBtn: { flexDirection: 'row', gap: 6, backgroundColor: 'white', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', width: '31%', elevation: 2 },
  addBtnText: { fontWeight: '700', color: '#F59E0B' },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: 'white', borderRadius: 12, marginBottom: 8, elevation: 1 },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyIcon: { fontSize: 20 },
  historyType: { fontWeight: 'bold', color: '#334155' },
  historyTime: { color: '#94A3B8', fontSize: 12 },
  historyAmount: { fontWeight: 'bold', color: '#F59E0B' },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 10, fontStyle: 'italic' }
});