import { useRouter } from 'expo-router'
import { CaretRight } from 'phosphor-react-native'
import React, { useMemo } from 'react'
import {
  Pressable,
  RefreshControl,
  SectionList,
  Text,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { ExpenseItem } from '../../components/ui/ExpenseItem'
import { formatearMonto } from '@saldai/core'
import { colors, MESES } from '../../constants/theme'
import { useGastos, Gasto } from '../../hooks/useGastos'
import { Alert } from '../../components/ui/Alert'

/**
 * `AAAA-MM-DD` a Date del día, en hora local.
 *
 * La columna es `date` y la API devuelve ISO, así que no hay más formatos que
 * atender; antes esto también aceptaba `DD/MM/AAAA`, que era el formato viejo
 * de la columna. Se arma con las partes y no con `new Date(iso)` porque esa
 * forma lo interpreta en UTC y en Chile corre el día para atrás.
 */
function fechaDelDia(iso: string): Date {
  const partes = iso?.split('-').map(Number)
  if (!partes || partes.length !== 3 || partes.some(Number.isNaN)) return new Date(0)

  const [anio, mes, dia] = partes
  return new Date(anio, mes - 1, dia)
}

/** El título de cada grupo: "Hoy", "Ayer" o "Jue 26". */
function tituloDelDia(dia: Date): string {
  if (isNaN(dia.getTime()) || dia.getTime() === 0) return 'Desconocido'

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const ayer = new Date(hoy)
  ayer.setDate(ayer.getDate() - 1)

  if (dia.getTime() === hoy.getTime()) return 'Hoy'
  if (dia.getTime() === ayer.getTime()) return 'Ayer'

  // El resto, abreviado y sin el punto que agrega la plataforma: "Jue 26".
  const formato = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric' })
  const texto = formato.format(dia).replace('.', '')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export default function DashboardScreen() {
  const router = useRouter()
  const {
    mes,
    datos,
    loading,
    refreshing,
    error,
    fetchGastos,
    totalMes,
  } = useGastos()

  const insets = useSafeAreaInsets()
  const listPaddingBottom = 220 + insets.bottom;

  // Los gastos agrupados por día, en el orden en que se muestran: el día más
  // nuevo primero. Es lo que SectionList espera como `sections`.
  const secciones = useMemo(() => {
    const conFecha = (datos?.datos ?? []).map((g) => ({
      ...g,
      diaDelGasto: fechaDelDia(g.fecha),
    }))

    conFecha.sort((a, b) => b.diaDelGasto.getTime() - a.diaDelGasto.getTime())

    // Un Map y no un objeto: el Map mantiene el orden de inserción, que acá es
    // el orden en que se van a ver los grupos.
    const porDia = new Map<string, Gasto[]>()
    for (const gasto of conFecha) {
      const titulo = tituloDelDia(gasto.diaDelGasto)
      if (!porDia.has(titulo)) porDia.set(titulo, [])
      porDia.get(titulo)!.push(gasto)
    }

    return Array.from(porDia, ([titulo, data]) => ({ titulo, data }))
  }, [datos?.datos])

  const sinGastos = !loading && !error && (!datos || datos.cantidad === 0)

  // El bloque de arriba (mes y total) va como encabezado de la lista y no
  // afuera, así se desplaza con los gastos como estaba antes.
  const encabezado = (
    <View className="w-full flex-col pt-xl pb-lg">
      {loading ? (
        <View className="flex-col gap-sm w-full items-start">
          <View className="h-[28px] w-[120px] bg-secondary rounded-full" />
          <View className="h-lg w-[80px] bg-secondary rounded-full mt-1" />
        </View>
      ) : (
        <View className="flex-col gap-sm w-full items-start">
          <Pressable
            className="flex-row items-center justify-start gap-xs active:opacity-80 py-2 -ml-2 px-2 rounded-md"
            onPress={() => router.navigate('/meses')}
          >
            <Text className="text-muted-foreground text-title font-normal leading-[normal]">
              {MESES[mes - 1]}
            </Text>
            <CaretRight size={20} className="text-muted-foreground" weight="bold" />
          </Pressable>
          <Text className="text-foreground text-body font-medium leading-[normal] text-right">
            {formatearMonto(totalMes)}
          </Text>
        </View>
      )}
    </View>
  )

  // Esqueleto de la primera carga de un mes que no se había visto. Con caché,
  // volver a un mes ya visto no pasa por acá.
  const esqueleto = (
    <View className="flex-col gap-xl w-full">
      {[1, 2].map((grupo) => (
        <View key={grupo} className="flex-col items-start w-full gap-xl">
          <View className="flex-col items-start w-full pt-xl">
            <View className="h-[22px] w-[80px] bg-secondary rounded-full" />
          </View>
          <View className="flex-col w-full gap-xl">
            {[1, 2, 3].map((item) => (
              <View key={item} className="flex-row items-center justify-between w-full">
                <View className="flex-row items-center gap-xs">
                  <View className="h-[34px] w-[90px] bg-secondary rounded-full" />
                </View>
                <View className="h-[22px] w-[60px] bg-secondary rounded-full" />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  )

  const vacio = loading ? (
    esqueleto
  ) : error ? (
    // Se muestra si la consulta falló incluso después de los reintentos.
    <View className="w-full flex-col pt-xl pb-24 items-center">
      <Text className="text-destructive text-body font-medium text-center">Error al cargar datos</Text>
      <Pressable onPress={() => fetchGastos()} className="mt-4 px-6 py-3 bg-secondary rounded-full active:opacity-80">
        <Text className="text-foreground font-medium">Reintentar</Text>
      </Pressable>
    </View>
  ) : sinGastos ? (
    <View className="w-full flex-col pt-xl items-start">
      <Text className="text-muted-foreground text-body font-medium">No hay gastos este mes</Text>
    </View>
  ) : null

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <Alert visible={!!error} message={error || ''} type="error" />

      {/*
        SectionList y no un ScrollView con todos los gastos dibujados: la lista
        crece con cada mes y solo lo que está en pantalla se monta. Los títulos
        de día no quedan pegados arriba, porque el diseño los tiene scrolleando
        con los gastos.
      */}
      <SectionList
        sections={secciones}
        keyExtractor={(gasto) => String(gasto.id)}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 40,
          paddingBottom: listPaddingBottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchGastos()}
            tintColor={colors.bgElevated}
          />
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={encabezado}
        ListEmptyComponent={vacio}
        renderSectionHeader={({ section }) => (
          // El primer día va más arriba que los siguientes: entre dos grupos
          // el diseño deja el doble de aire que entre el encabezado y el
          // primer grupo, que antes salía de sumar dos gaps.
          <View
            className={`flex-col items-start w-full pb-xl ${
              secciones[0] === section ? 'pt-xl' : 'pt-4xl'
            }`}
          >
            <Text className="text-muted-foreground text-subtitle font-normal leading-[normal]">
              {section.titulo}
            </Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View className="h-xl" />}
        renderItem={({ item }) => (
          <ExpenseItem monto={formatearMonto(item.monto)} titulo={item.item} />
        )}
      />
    </SafeAreaView>
  )
}
