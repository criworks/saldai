import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MESES } from '../../constants/theme';
import { useGastos } from '../../hooks/useGastos';

export default function CategoriasScreen() {
  const router = useRouter();
  const { mes, loading, refreshing, fetchGastos, categorias, totalMes } = useGastos();
  const insets = useSafeAreaInsets();

  // El GradientFooter tiene altura 200px aquí (sin emojis), usamos 140 + insets.bottom para no tener exceso de scroll vacío
  const listPaddingBottom = 140 + insets.bottom;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-[#111217]">
      <FlatList
        data={categorias}
        keyExtractor={([cat]) => cat}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: listPaddingBottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchGastos(true)}
            tintColor="#262A35"
          />
        }
        ListHeaderComponent={
          <>
            {/* Header */}
            <View className="mb-[24px]">
              {loading && !categorias.length ? (
                <>
                  <View className="h-[24px] w-[120px] bg-[#262A35] rounded-full mb-[8px]" />
                  <View className="h-[16px] w-[80px] bg-[#262A35] rounded-full" />
                </>
              ) : (
                <>
                  <Text className="text-[#60677D] text-[24px] font-medium mb-[8px]">{MESES[mes - 1]}</Text>
                  <Text className="text-white text-[16px] font-medium">
                    ${totalMes.toLocaleString('es-CL')}
                  </Text>
                </>
              )}
            </View>

            {/* Nueva Categoría Action */}
            <Pressable
              className="flex-row items-center gap-[12px] mb-[24px] active:opacity-80"
              onPress={() => router.push('/captura')}
            >
              <View className="bg-[#262A35] rounded-full w-[32px] h-[32px] items-center justify-center">
                <Feather name="plus" size={16} color="#60677D" />
              </View>
              <Text className="text-[#60677D] text-[16px] font-medium">Nueva categoría</Text>
            </Pressable>

            {loading && !categorias.length && (
              <View className="gap-[16px]">
                {[1, 2, 3, 4].map((item) => (
                  <View key={item} className="flex-row items-center gap-[12px]">
                    <View className="h-[36px] w-[80px] bg-[#262A35] rounded-full" />
                    <View className="h-[32px] w-[32px] bg-[#262A35] rounded-full" />
                    <View className="h-[16px] w-[100px] bg-[#262A35] rounded-full" />
                  </View>
                ))}
              </View>
            )}

            {!loading && categorias.length === 0 && (
              <Text className="text-[#60677D] text-[14px] font-medium">No hay datos para este mes</Text>
            )}
          </>
        }
        renderItem={({ item: [cat, info] }) => {
          const emoji = require('../../../packages/ui/tokens').EMOJIS_CAT[cat] || require('../../../packages/ui/tokens').EMOJIS_CAT["Sin categoría"];

          return (
            <View className="flex-row items-center gap-[12px] mb-[16px]">
              <View className="bg-[#262A35] rounded-full px-[16px] py-[8px]">
                <Text className="text-white text-[14px] font-medium">
                  ${info.total.toLocaleString('es-CL')}
                </Text>
              </View>
              <View className="bg-[#262A35] rounded-full w-[32px] h-[32px] items-center justify-center">
                <Text className="text-[14px]">{emoji}</Text>
              </View>
              <Text className="text-[#60677D] text-[16px] font-medium">{cat}</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
