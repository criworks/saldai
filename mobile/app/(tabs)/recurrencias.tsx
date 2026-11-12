import {
  FRECUENCIAS,
  formatearMonto,
  isoAChileno,
  type Frecuencia,
  type Recurrencia,
} from '@saldai/core';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors } from '@/constants/theme';
import {
  descripcionDeFrecuencia,
  EditorDeRecurrencia,
  NOMBRES_FRECUENCIAS,
  useRecurrencias,
} from '@/features/recurrencias';

/**
 * Las recurrencias del perfil: crear un plan y editar uno.
 *
 * El plan se escribe con **la misma línea** que un movimiento ("525457,
 * arriendo, basicos, 1/12/2026, tc") y la fecha de esa línea es el ancla de la
 * recurrencia. Es el mismo lenguaje de la captura a propósito: un segundo
 * formulario con seis campos sería otra forma de decir lo mismo, y la línea ya
 * la entiende `@saldai/core`.
 *
 * Lo que esta pantalla **no** hace es registrar movimientos: un plan propone, y
 * confirmar —en el feed— es lo que crea el movimiento.
 */
export default function RecurrenciasScreen() {
  const { recurrencias, cargando, error, crear, creando } = useRecurrencias();

  const [linea, setLinea] = useState('');
  const [frecuencia, setFrecuencia] = useState<Frecuencia>('mensual');
  const [errorAlCrear, setErrorAlCrear] = useState('');
  const [enEdicion, setEnEdicion] = useState<Recurrencia | null>(null);

  const guardar = async () => {
    if (!linea.trim()) return;

    try {
      await crear({ input: linea.trim(), frecuencia });
      setLinea('');
      setErrorAlCrear('');
    } catch (e) {
      // El campo se queda con lo escrito: la línea es lo único que el usuario
      // tipeó y perderla lo obliga a volver a escribirla para corregir una coma.
      setErrorAlCrear(e instanceof Error ? e.message : 'No se pudo crear la recurrencia');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Alert
        visible={!!error || !!errorAlCrear}
        message={error ? 'No se pudieron leer tus recurrencias.' : errorAlCrear}
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

            <View className="w-full flex-col gap-lg pt-xl">
              <Input
                value={linea}
                onChangeText={setLinea}
                placeholder="monto, item, categoría, fecha, método"
                editable={!creando}
                accessibilityLabel="La línea de la recurrencia"
                testID="linea-de-recurrencia"
              />

              <View className="flex-row items-center justify-between w-full">
                <Text className="text-muted-foreground text-base font-normal">Cada</Text>
                <View className="flex-row gap-sm">
                  {FRECUENCIAS.map((f: Frecuencia) => (
                    <Pressable
                      key={f}
                      onPress={() => setFrecuencia(f)}
                      disabled={creando}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: frecuencia === f }}
                      accessibilityLabel={NOMBRES_FRECUENCIAS[f]}
                      className={`px-md py-sm rounded-full active:opacity-80 ${
                        frecuencia === f ? 'bg-foreground' : 'bg-secondary'
                      }`}
                    >
                      <Text
                        className={`text-base font-medium ${
                          frecuencia === f ? 'text-background' : 'text-muted-foreground'
                        }`}
                      >
                        {NOMBRES_FRECUENCIAS[f]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Pressable
                onPress={guardar}
                disabled={!linea.trim() || creando}
                accessibilityRole="button"
                accessibilityLabel="Crear la recurrencia"
                className={`h-control px-xl justify-center items-center rounded-lg bg-foreground active:opacity-80 ${
                  !linea.trim() || creando ? 'opacity-40' : ''
                }`}
              >
                {creando ? (
                  <ActivityIndicator size="small" color={colors.bg} />
                ) : (
                  <Text className="text-background text-body font-semibold">Crear</Text>
                )}
              </Pressable>
            </View>

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
            onPress={() => setEnEdicion(item)}
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

      <EditorDeRecurrencia recurrencia={enEdicion} onCerrar={() => setEnEdicion(null)} />
    </SafeAreaView>
  );
}
