import { Plus } from 'phosphor-react-native';
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
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
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
            <View className="mb-xl">
              {loading && !categorias.length ? (
                <>
                  <View className="h-xl w-[120px] bg-secondary rounded-full mb-sm" />
                  <View className="h-lg w-6xl bg-secondary rounded-full" />
                </>
              ) : (
                <>
                  <Text className="text-muted-foreground text-title font-medium mb-sm">{MESES[mes - 1]}</Text>
                  <Text className="text-white text-menu font-medium">
                    ${totalMes.toLocaleString('es-CL')}
                  </Text>
                </>
              )}
            </View>

            {/* Nueva Categoría Action */}
            <Pressable
              className="flex-row items-center gap-md mb-xl active:opacity-80"
              onPress={() => router.push('/captura')}
            >
              <View className="bg-secondary rounded-full w-xxl h-xxl items-center justify-center">
                <Plus size={16} color="#60677D" />
              </View>
              <Text className="text-muted-foreground text-menu font-medium">Nueva categoría</Text>
            </Pressable>

            {loading && !categorias.length && (
              <View className="gap-lg">
                {[1, 2, 3, 4].map((item) => (
                  <View key={item} className="flex-row items-center gap-md">
                    <View className="h-[36px] w-6xl bg-secondary rounded-full" />
                    <View className="h-xxl w-xxl bg-secondary rounded-full" />
                    <View className="h-lg w-[100px] bg-secondary rounded-full" />
                  </View>
                ))}
              </View>
            )}

            {!loading && categorias.length === 0 && (
              <Text className="text-muted-foreground text-body font-medium">No hay datos para este mes</Text>
            )}
          </>
        }
        renderItem={({ item: [cat, info] }) => {
          const emoji = require('../../../packages/ui/tokens').EMOJIS_CAT[cat] || require('../../../packages/ui/tokens').EMOJIS_CAT["Sin categoría"];

          return (
            <View className="flex-row items-center gap-md mb-lg">
              <View className="bg-secondary rounded-full px-lg py-sm">
                <Text className="text-white text-body font-medium">
                  ${info.total.toLocaleString('es-CL')}
                </Text>
              </View>
              <View className="bg-secondary rounded-full w-xxl h-xxl items-center justify-center">
                <Text className="text-body">{emoji}</Text>
              </View>
              <Text className="text-muted-foreground text-menu font-medium">{cat}</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
