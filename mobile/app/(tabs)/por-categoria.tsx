import { formatearMonto } from '@saldai/core'
import { useRouter } from 'expo-router'
import React from 'react'
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Alert } from '@/components/ui/Alert'
import { colors } from '@/constants/theme'
import { EncabezadoDelMes, ExpenseItem, useFilter, useMovimientos } from '@/features/movimientos'
import { usePreferencias } from '@/features/perfil'

/**
 * El mes visto por categoría: una fila por categoría con lo que se gastó en
 * ella, de mayor a menor.
 *
 * Es el mismo mes que el listado de movimientos, no otra consulta: la suma por
 * categoría la deriva `MovimientosContext` de los movimientos que ya están en caché. Por
 * eso el mes elegido se arrastra solo y cambiar de mes acá y allá es lo mismo.
 *
 * Las filas se dibujan con `ExpenseItem`, que es monto, burbuja de categoría y
 * nombre: exactamente la forma de esta fila. Tocar una deja el listado filtrado
 * por esa categoría, que es el camino natural desde "en qué se me fue" hacia
 * "en qué exactamente".
 */
export default function PorCategoriaScreen() {
  const router = useRouter()
  const { mes, categorias, loading, refreshing, error, fetchMovimientos, totalMes } = useMovimientos()
  const { setSelectedCategory } = useFilter()
  const { categoriasVisibles } = usePreferencias()

  const insets = useSafeAreaInsets()
  const listPaddingBottom = 220 + insets.bottom

  const verMovimientosDe = (categoria: string) => {
    setSelectedCategory(categoria)
    router.navigate('/')
  }

  const esqueleto = (
    <View className="flex-col w-full gap-xl pt-xl">
      {[1, 2, 3, 4].map((fila) => (
        <View key={fila} className="flex-row items-center gap-sm w-full">
          <View className="h-[34px] w-[90px] bg-secondary rounded-full" />
          <View className="h-xxl w-xxl bg-secondary rounded-full" />
          <View className="h-[22px] w-[100px] bg-secondary rounded-full" />
        </View>
      ))}
    </View>
  )

  const vacio = loading ? (
    esqueleto
  ) : error ? (
    <View className="w-full flex-col pt-xl pb-24 items-center">
      <Text className="text-destructive text-body font-medium text-center">Error al cargar datos</Text>
      <Pressable
        onPress={() => fetchMovimientos()}
        className="mt-4 px-6 py-3 bg-secondary rounded-full active:opacity-80"
      >
        <Text className="text-foreground font-medium">Reintentar</Text>
      </Pressable>
    </View>
  ) : (
    <View className="w-full flex-col pt-xl items-start">
      <Text className="text-muted-foreground text-body font-medium">No hay movimientos este mes</Text>
    </View>
  )

  // A esta pantalla se entra por el chip del footer, que no está si la función
  // está apagada. Igual se cubre el caso: si se llega con las categorías
  // apagadas, se dice dónde prenderlas en vez de mostrar un desglose de algo
  // que el perfil tiene desactivado.
  if (!categoriasVisibles && !loading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
        <View className="flex-1 px-xl pt-4xl">
          <EncabezadoDelMes mes={mes} total={totalMes} />
          <Text className="text-muted-foreground text-body font-normal pt-xl">
            Las categorías están apagadas. Se prenden en Configuraciones.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <Alert visible={!!error} message={error || ''} type="error" />

      <FlatList
        data={categorias}
        keyExtractor={([categoria]) => categoria}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 40,
          paddingBottom: listPaddingBottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchMovimientos()}
            tintColor={colors.bgElevated}
          />
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<EncabezadoDelMes mes={mes} total={totalMes} loading={loading} />}
        ListEmptyComponent={vacio}
        ItemSeparatorComponent={() => <View className="h-xl" />}
        renderItem={({ item: [categoria, info] }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${categoria}, ver sus movimientos`}
            testID={`categoria-${categoria}`}
            className="active:opacity-80"
            onPress={() => verMovimientosDe(categoria)}
          >
            <ExpenseItem
              monto={formatearMonto(info.total)}
              titulo={categoria}
              categoria={categoria}
            />
          </Pressable>
        )}
      />
    </SafeAreaView>
  )
}
