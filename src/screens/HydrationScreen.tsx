import React from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useChildProfile } from '../context/ChildProfileContext';
import { Header, Screen } from '../components/Common';
import { Ionicons } from '@expo/vector-icons';

export default function HydrationScreen({ navigation }: any) {
  const { activeChild, todayWaterIntake, dailyWaterGoal, addWater, hydrationHistory } = useChildProfile();

  const progressPercent = Math.min((todayWaterIntake / dailyWaterGoal) * 100, 100);

  // Filter history for today only for the list
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysRecords = hydrationHistory.filter(r => r.date === todayStr);

  return (
    <Screen>
      <Header title="Daily Hydration" onBack={() => navigation.goBack()} />
      
      <View style={styles.container}>
        {/* Goal & Progress Display (User Story 1.2) */}
        <View style={styles.progressCard}>
          <Text style={styles.goalText}>
            Goal for {activeChild?.nickname}: {dailyWaterGoal} ml
          </Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.intakeText}>
            {todayWaterIntake} ml / {dailyWaterGoal} ml
          </Text>
        </View>

        {/* Input Buttons (User Story 1.1) */}
        <Text style={styles.sectionTitle}>Add Water</Text>
        <View style={styles.quickAddRow}>
          {[100, 200, 500].map((amount) => (
            <Pressable key={amount} style={styles.addBtn} onPress={() => addWater(amount)}>
              <Ionicons name="water" size={24} color="#3B82F6" />
              <Text style={styles.addBtnText}>+{amount}ml</Text>
            </Pressable>
          ))}
        </View>

        {/* History Display (User Story 1.1) */}
        <Text style={styles.sectionTitle}>Today's Log</Text>
        {todaysRecords.length === 0 ? (
          <Text style={styles.emptyText}>No water logged yet today.</Text>
        ) : (
          todaysRecords.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <Text style={styles.historyTime}>
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={styles.historyAmount}>+{item.amount} ml</Text>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1 },
  progressCard: { backgroundColor: '#EFF6FF', padding: 20, borderRadius: 16, marginBottom: 24 },
  goalText: { fontSize: 16, fontWeight: '700', color: '#1E3A8A', marginBottom: 12 },
  progressBarBg: { height: 16, backgroundColor: '#DBEAFE', borderRadius: 8, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#3B82F6' },
  intakeText: { marginTop: 8, textAlign: 'right', color: '#2563EB', fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  quickAddRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  addBtn: { backgroundColor: 'white', padding: 16, borderRadius: 12, alignItems: 'center', width: '30%', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  addBtnText: { marginTop: 8, fontWeight: '600', color: '#3B82F6' },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: 'white', borderRadius: 8, marginBottom: 8 },
  historyTime: { color: '#666' },
  historyAmount: { fontWeight: 'bold', color: '#3B82F6' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20 }
});