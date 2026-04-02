import { useRouter } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MESES } from '../../constants/theme';
import { useGastos } from '../../hooks/useGastos';
import { fetchGastosAnuales } from '../../services/api';

export default function MesesScreen() {
  const router = useRouter();
  const { mes, setMes } = useGastos();
  const [totalesAnuales, setTotalesAnuales] = useState<number[]>(Array(12).fill(0));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  
  const currentYear = new Date().getFullYear();

  const loadData = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const data = await fetchGastosAnuales(currentYear);
      if (data.ok && data.totales) {
        setTotalesAnuales(data.totales);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentYear]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleSelectMes = (mesIndex: number) => {
    setMes(mesIndex + 1); // 1-based month
    router.navigate('/'); // go to index
  };

  const currentMonthZeroBased = mes - 1; // context mes is 1-based

  // Convert array to grid of 2 columns
  const rowPairs: [number, number][] = [];
  for (let i = 0; i < 12; i += 2) {
    rowPairs.push([i, i + 1]);
  }

  const listPaddingBottom = 220 + insets.bottom;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ 
          paddingHorizontal: 24,
          paddingTop: 40,
          paddingBottom: listPaddingBottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor="#262A35"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-col gap-xxl w-full items-center pt-xl">
          <View className="flex-row items-center justify-start w-full gap-lg">
            <Text className="text-subtitle text-muted-foreground font-normal">
              {currentYear}
            </Text>
          </View>

          <View className="flex-col w-full gap-xxl">
            {rowPairs.map(([idx1, idx2]) => (
              <View key={idx1} className="flex-row w-full gap-lg items-start">
                
                {/* Month 1 */}
                <Pressable 
                  onPress={() => handleSelectMes(idx1)} 
                  className="flex-1 flex-col gap-sm items-start active:opacity-80"
                >
                  <View className="flex-row items-center gap-sm">
                    <Text className="text-menu text-muted-foreground">
                      {MESES[idx1]}
                    </Text>
                    {currentMonthZeroBased === idx1 && (
                      <View className="w-sm h-sm bg-foreground rounded-full" />
                    )}
                  </View>
                  <Text className="text-body text-foreground font-medium text-right">
                    ${(totalesAnuales[idx1] || 0).toLocaleString('es-CL')}
                  </Text>
                </Pressable>

                {/* Month 2 */}
                <Pressable 
                  onPress={() => handleSelectMes(idx2)} 
                  className="flex-1 flex-col gap-sm items-start active:opacity-80"
                >
                  <View className="flex-row items-center gap-sm">
                    <Text className="text-menu text-muted-foreground">
                      {MESES[idx2]}
                    </Text>
                    {currentMonthZeroBased === idx2 && (
                      <View className="w-sm h-sm bg-foreground rounded-full" />
                    )}
                  </View>
                  <Text className="text-body text-foreground font-medium text-right">
                    ${(totalesAnuales[idx2] || 0).toLocaleString('es-CL')}
                  </Text>
                </Pressable>

              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}