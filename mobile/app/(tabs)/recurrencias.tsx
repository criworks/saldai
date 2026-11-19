import { formatearMonto, isoAChileno } from '@saldai/core';
import { useRouter } from 'expo-router';
import { Plus } from 'phosphor-react-native';
import React from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert } from '@/components/ui/Alert';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors } from '@/constants/theme';
import { descripcionDeFrecuencia, useRecurrencias } from '@/features/recurrencias';

/**
 * Los planes de recurrencia del perfil: la lista.
 *
 * Crear y editar no están acá: están en la vista de un plan
 * (`app/(tabs)/recurrencia.tsx`), que tiene la forma de un movimiento. Antes un
 * plan se creaba escribiendo la línea cruda en un campo de esta pantalla y se
 * editaba en un bottom sheet con otros seis campos, así que el producto tenía
 * tres formas de decir lo mismo según por dónde se entrara.
 *
 * Lo que esta pantalla **no** hace es registrar movimientos: un plan propone, y
 * confirmar —en el mes— es lo que crea el movimiento.
 */
export default function RecurrenciasScreen() {
  const { recurrencias, cargando, error } = useRecurrencias();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Alert
        visible={!!error}
        message="No se pudieron leer tus recurrencias."
        type="error"
      />

      <FlatList
        data={recurrencias}
        keyExtractor={(plan) => plan.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 40, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View className="w-full flex-col">
            <Text className="text-foreground text-subtitle font-medium">Recurrencias</Text>
            <Text className="text-muted-foreground text-base font-normal pt-sm">
              Saldai te las propone y las confirmás vos. No registra nada solo.
            </Text>

            <Pressable
              onPress={() => router.push('/recurrencia')}
              accessibilityRole="button"
              accessibilityLabel="Nueva recurrencia"
              testID="nueva-recurrencia"
              className="flex-row h-control px-xl mt-xl justify-center items-center gap-sm rounded-lg bg-foreground active:opacity-80"
            >
              <Plus size={16} color={colors.bg} weight="bold" />
              <Text className="text-background text-body font-semibold">Nueva recurrencia</Text>
            </Pressable>

            <SectionHeader title="Activas" />
          </View>
        }
        ListEmptyComponent={
          cargando ? (
            <View className="w-full items-center pt-xl">
              <ActivityIndicator color={colors.text} />
            </View>
          ) : (
            <Text className="text-muted-foreground text-body font-normal pt-sm">
              Todavía no tenés ninguna.
            </Text>
          )
        }
        ItemSeparatorComponent={() => <View className="h-sm" />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/recurrencia', params: { id: item.id } })}
            accessibilityRole="button"
            accessibilityLabel={`Editar la recurrencia de ${item.item}`}
            className="flex-row items-center justify-between w-full px-lg py-md rounded-lg bg-card active:opacity-80"
          >
            <View className="flex-col flex-1 pr-md">
              <Text className="text-card-foreground text-body font-medium" numberOfLines={1}>
                {item.item}
              </Text>
              <Text className="text-muted-foreground text-base font-normal">
                {`${descripcionDeFrecuencia(item.frecuencia)} · desde el ${isoAChileno(item.vigente_desde)}`}
              </Text>
            </View>
            <Text className="text-card-foreground text-body font-medium">
              {formatearMonto(item.monto)}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
