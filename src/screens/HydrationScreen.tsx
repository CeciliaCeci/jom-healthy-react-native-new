import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Animated, ScrollView } from 'react-native';
import { useChildProfile } from '../context/ChildProfileContext';
import { Header, Screen } from '../components/Common';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, G, Line, Circle as SvgCircle, Text as SvgText } from 'react-native-svg';

// Predefined drink types and their colors for the pie chart
const DRINK_TYPES = [
  { id: 'Water', icon: '💧', color: '#3B82F6' },
  { id: 'Milk', icon: '🥛', color: '#10B981' },
  { id: 'Juice', icon: '🧃', color: '#F59E0B' },
  { id: 'Tea', icon: '🍵', color: '#8B5CF6' },
  { id: 'Soda', icon: '🥤', color: '#EF4444' },
  { id: 'Other', icon: '➕', color: '#6B7280' },
];

// Generates a consistent unique color based on the drink's name
const getCustomColor = (drinkName: string) => {
  const customColors = ['#F472B6', '#38BDF8', '#FB923C', '#A3E635', '#C084FC', '#FB7185', '#2DD4BF', '#FCD34D'];
  let hash = 0;
  for (let i = 0; i < drinkName.length; i++) {
    hash = drinkName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return customColors[Math.abs(hash) % customColors.length];
};

export default function HydrationScreen({ navigation }: any) {
  const { activeChild, todayWaterIntake, dailyWaterGoal, addWater, hydrationHistory } = useChildProfile();

  const [selectedDrink, setSelectedDrink] = useState('Water');
  const [customDrinkName, setCustomDrinkName] = useState('');
  
  // --- CUP ANIMATION LOGIC ---
  const fillAnimation = useRef(new Animated.Value(0)).current;
  const progressPercent = Math.min((todayWaterIntake / dailyWaterGoal) * 100, 100);

  useEffect(() => {
    Animated.spring(fillAnimation, {
      toValue: progressPercent,
      friction: 6,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [progressPercent]);

  const animatedHeight = fillAnimation.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  // --- DATA FILTERING ---
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysRecords = hydrationHistory.filter(r => r.date === todayStr);

  // --- PIE CHART MATH LOGIC ---
  // 1. Group today's drinks by type
  const groupedData = todaysRecords.reduce((acc, record) => {
    const type = record.drinkType || 'Water';
    acc[type] = (acc[type] || 0) + record.amount;
    return acc;
  }, {} as Record<string, number>);

  const pieChartData = Object.keys(groupedData).map(key => {
    const defaultType = DRINK_TYPES.find(d => d.id === key);
    return {
      type: key,
      amount: groupedData[key],
      color: defaultType ? defaultType.color : getCustomColor(key)
    };
  });

  // Helper to calculate X/Y on a circle for Pie Chart Paths
  const getCoordinatesForAngle = (angleInDegrees: number, radius: number, cx: number, cy: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: cx + (radius * Math.cos(angleInRadians)),
      y: cy + (radius * Math.sin(angleInRadians))
    };
  };

  const handleAddDrink = (amount: number) => {
    const finalDrinkType = selectedDrink === 'Other' && customDrinkName.trim() !== '' 
      ? customDrinkName.trim() 
      : selectedDrink;
    
    addWater(amount, finalDrinkType);
    if(selectedDrink === 'Other') setCustomDrinkName(''); // reset input
  };

  return (
    <Screen>
      <Header title="Daily Hydration" onBack={() => navigation.goBack()} />
      
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* --- ANIMATED CUP VISUAL --- */}
        <View style={styles.cupSection}>
          <View style={styles.cupContainer}>
             <Animated.View style={[styles.cupFill, { height: animatedHeight }]} />
             <Text style={styles.cupText}>{todayWaterIntake} / {dailyWaterGoal} ml</Text>
          </View>
          <Text style={styles.goalText}>Goal for {activeChild?.nickname}</Text>
        </View>

        {/* --- DRINK TYPE SELECTION --- */}
        <Text style={styles.sectionTitle}>What are they drinking?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipContainer}>
          {DRINK_TYPES.map((drink) => (
            <Pressable 
              key={drink.id} 
              style={[styles.chip, selectedDrink === drink.id && { backgroundColor: drink.color, borderColor: drink.color }]}
              onPress={() => setSelectedDrink(drink.id)}
            >
              <Text style={[styles.chipText, selectedDrink === drink.id && { color: 'white' }]}>
                {drink.icon} {drink.id}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Custom Drink Input */}
        {selectedDrink === 'Other' && (
          <TextInput
            style={styles.customInput}
            placeholder="Type custom drink here (e.g., Milo)..."
            value={customDrinkName}
            onChangeText={setCustomDrinkName}
          />
        )}

        {/* --- ADD BUTTONS --- */}
        <View style={styles.quickAddRow}>
          {[100, 200, 500].map((amount) => (
            <Pressable key={amount} style={styles.addBtn} onPress={() => handleAddDrink(amount)}>
              <Ionicons name="add-circle" size={20} color="#3B82F6" />
              <Text style={styles.addBtnText}>{amount}ml</Text>
            </Pressable>
          ))}
        </View>

        {/* --- PIE CHART SECTION --- */}
        {pieChartData.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Drink Distribution</Text>
            <View style={styles.svgWrapper}>
              <Svg width={250} height={250} viewBox="0 0 200 200">
                {(() => {
                  let startAngle = 0;
                  const cx = 100, cy = 100, radius = 50;
                  const totalAmount = pieChartData.reduce((sum, d) => sum + d.amount, 0);

                  return pieChartData.map((slice, index) => {
                    const sliceAngle = (slice.amount / totalAmount) * 360;
                    const endAngle = startAngle + sliceAngle;

                    // If it's a 100% single category, just draw a circle
                    if (sliceAngle === 360) {
                      return (
                         <G key={index}>
                           <SvgCircle cx={cx} cy={cy} r={radius} fill={slice.color} />
                           <SvgText x={cx} y={cy} fill="white" fontSize="12" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">{slice.type}</SvgText>
                         </G>
                      )
                    }

                    // Path Math
                    const startCoords = getCoordinatesForAngle(startAngle, radius, cx, cy);
                    const endCoords = getCoordinatesForAngle(endAngle, radius, cx, cy);
                    const largeArcFlag = sliceAngle > 180 ? 1 : 0;
                    const pathData = [
                      `M ${cx} ${cy}`,
                      `L ${startCoords.x} ${startCoords.y}`,
                      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endCoords.x} ${endCoords.y}`,
                      'Z'
                    ].join(' ');

                    // Arrow Line Math (Points out from center of slice)
                    const midAngle = startAngle + (sliceAngle / 2);
                    const lineStart = getCoordinatesForAngle(midAngle, radius, cx, cy);
                    const lineEnd = getCoordinatesForAngle(midAngle, radius + 20, cx, cy);
                    const textPos = getCoordinatesForAngle(midAngle, radius + 35, cx, cy);

                    startAngle += sliceAngle; // setup for next slice

                    return (
                      <G key={index}>
                        {/* Slice */}
                        <Path d={pathData} fill={slice.color} />
                        {/* Arrow Line pointing out */}
                        <Line x1={lineStart.x} y1={lineStart.y} x2={lineEnd.x} y2={lineEnd.y} stroke={slice.color} strokeWidth="2" />
                        <SvgCircle cx={lineEnd.x} cy={lineEnd.y} r="3" fill={slice.color} />
                        {/* Text Label */}
                        <SvgText x={textPos.x} y={textPos.y} fill="#333" fontSize="12" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">
                          {slice.type}
                        </SvgText>
                      </G>
                    );
                  });
                })()}
              </Svg>
            </View>
          </View>
        )}

        {/* --- HISTORY LIST --- */}
        <Text style={styles.sectionTitle}>Today's Log</Text>
        {todaysRecords.length === 0 ? (
          <Text style={styles.emptyText}>No drinks logged yet today.</Text>
        ) : (
          todaysRecords.map((item) => {
            const defaultType = DRINK_TYPES.find(d => d.id === item.drinkType);
            const drinkColor = defaultType ? defaultType.color : getCustomColor(item.drinkType || '');
            return (
              <View key={item.id} style={styles.historyItem}>
                <View style={styles.historyLeft}>
                   <View style={[styles.historyDot, { backgroundColor: drinkColor }]} />
                   <Text style={styles.historyType}>{item.drinkType || 'Water'}</Text>
                   <Text style={styles.historyTime}>
                     {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </Text>
                </View>
                <Text style={styles.historyAmount}>+{item.amount} ml</Text>
              </View>
            )
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  
  // Cup Styles
  cupSection: { alignItems: 'center', marginBottom: 24, marginTop: 10 },
  cupContainer: {
    width: 120, height: 160,
    borderWidth: 5, borderColor: '#CBD5E1',
    borderTopWidth: 0,
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#F8FAFC',
    position: 'relative'
  },
  cupFill: { width: '100%', backgroundColor: '#60A5FA', opacity: 0.8 },
  cupText: { position: 'absolute', width: '100%', textAlign: 'center', bottom: '40%', fontSize: 16, fontWeight: '900', color: '#1E3A8A' },
  goalText: { marginTop: 12, fontSize: 15, fontWeight: '600', color: '#64748B' },

  // Selection Styles
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  chipScroll: { marginBottom: 16 },
  chipContainer: { flexDirection: 'row', gap: 10, paddingRight: 20 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0' },
  chipText: { fontSize: 15, fontWeight: '600', color: '#475569' },
  customInput: { backgroundColor: 'white', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 15 },
  
  // Add Buttons
  quickAddRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  addBtn: { flexDirection: 'row', gap: 6, backgroundColor: 'white', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', width: '31%', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  addBtnText: { fontWeight: '700', color: '#3B82F6', fontSize: 15 },

  // Chart Styles
  chartSection: { backgroundColor: '#F8FAFC', padding: 20, borderRadius: 16, marginBottom: 30, alignItems: 'center' },
  svgWrapper: { alignItems: 'center', justifyContent: 'center' },

  // History Styles
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: 'white', borderRadius: 12, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyDot: { width: 12, height: 12, borderRadius: 6 },
  historyType: { fontWeight: 'bold', fontSize: 15, color: '#334155' },
  historyTime: { color: '#94A3B8', fontSize: 13, marginLeft: 4 },
  historyAmount: { fontWeight: 'bold', color: '#3B82F6', fontSize: 16 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 10, fontStyle: 'italic' }
});