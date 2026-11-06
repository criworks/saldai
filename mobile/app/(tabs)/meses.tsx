import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { formatearMonto } from '@saldai/core';
import { colors, MESES } from '@/constants/theme';
import { consultaDelMes, fetchGastosAnuales, useGastos } from '@/features/gastos';
import { llaves } from '@/lib/consultas';
import { Alert } from '@/components/ui/Alert';

export default function MesesScreen() {
  const router = useRouter();
  const { setMes, anio: currentYear } = useGastos();
  const insets = useSafeAreaInsets();

  // Los totales del año salen de la caché: volver a esta pantalla los muestra
  // al toque y los revalida detrás, y el alta de un gasto los invalida sola.
  const consulta = useQuery({
    queryKey: llaves.totalesAnuales(currentYear),
    queryFn: () => fetchGastosAnuales(currentYear),
  });

  const { refetch, isStale } = consulta;
  const totalesAnuales = consulta.data?.totales ?? Array(12).fill(0);
  const loading = consulta.isPending;
  const refreshing = consulta.isFetching && !consulta.isPending;
  const error = consulta.error instanceof Error ? consulta.error.message : null;

  // Al volver a la pantalla se revalida solo si quedó vieja; si no, lo que ya
  // está en caché se muestra tal cual.
  useFocusEffect(
    useCallback(() => {
      if (isStale) refetch();
    }, [isStale, refetch])
  );

  const cliente = useQueryClient();

  // El pedido del mes sale apenas se apoya el dedo, no cuando se suelta: esos
  // cien y tantos milisegundos más la navegación suelen alcanzar para que el
  // mes llegue sin esqueleto. Si ya está en caché y fresco, no va a la red.
  const adelantarMes = (mesIndex: number) => {
    cliente.prefetchQuery(consultaDelMes(mesIndex + 1, currentYear));
  };

  const handleSelectMes = (mesIndex: number) => {
    setMes(mesIndex + 1); // 1-based month
    router.navigate('/'); // go to index
  };

  // El punto marca el mes del calendario, un "hoy estás acá" que no se mueve
  // al navegar. El mes que se está mirando no se marca acá: se entra a su
  // lista y se vuelve con el nombre del mes o con el tab "En curso", así que
  // esta pantalla no necesita recordar cuál se eligió.
  const hoy = new Date();
  const mesRealZeroBased =
    hoy.getFullYear() === currentYear ? hoy.getMonth() : null;

  // Convert array to grid of 2 columns
  const rowPairs: [number, number][] = [];
  for (let i = 0; i < 12; i += 2) {
    rowPairs.push([i, i + 1]);
  }

  const listPaddingBottom = 220 + insets.bottom;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <Alert visible={!!error} message={error || ''} type="error" />

      <ScrollView
        contentContainerStyle={{ 
          paddingHorizontal: 24,
          paddingTop: 40,
          paddingBottom: listPaddingBottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refetch()}
            tintColor={colors.bgElevated}
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

          {error ? (
            <View className="w-full flex-col pt-xl pb-24 items-center">
               <Text className="text-destructive text-body font-medium text-center">No se pudo cargar el historial anual</Text>
               <Pressable onPress={() => refetch()} className="mt-4 px-6 py-3 bg-secondary rounded-full active:opacity-80">
                  <Text className="text-foreground font-medium">Reintentar</Text>
               </Pressable>
            </View>
          ) : (
            <View className="flex-col w-full gap-xxl">
              {rowPairs.map(([idx1, idx2]) => (
                <View key={idx1} className="flex-row w-full gap-lg items-start">
                  
                  {[idx1, idx2].map((idx) => (
                    <MesCelda
                      key={idx}
                      nombre={MESES[idx]}
                      total={totalesAnuales[idx] || 0}
                      esMesReal={mesRealZeroBased === idx}
                      cargando={loading}
                      onPressIn={() => adelantarMes(idx)}
                      onPress={() => handleSelectMes(idx)}
                    />
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type MesCeldaProps = {
  nombre: string
  total: number
  /** El mes del calendario: lleva el punto. */
  esMesReal: boolean
  cargando: boolean
  onPressIn: () => void
  onPress: () => void
}

function MesCelda({
  nombre,
  total,
  esMesReal,
  cargando,
  onPressIn,
  onPress,
}: MesCeldaProps) {
  return (
    <Pressable
      onPressIn={onPressIn}
      onPress={onPress}
      className="flex-1 flex-col gap-sm items-start active:opacity-80"
      disabled={cargando}
    >
      <View className="flex-row items-center gap-sm">
        <Text className="text-menu text-muted-foreground">{nombre}</Text>
        {esMesReal && <View className="w-sm h-sm bg-foreground rounded-full" />}
      </View>
      {cargando ? (
        <View className="h-[22px] w-[80px] bg-secondary rounded-full" />
      ) : (
        <Text className="text-body text-foreground font-medium text-right">
          {formatearMonto(total)}
        </Text>
      )}
    </Pressable>
  )
}
