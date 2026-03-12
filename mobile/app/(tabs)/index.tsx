import { useEffect } from 'react'
import {
  RefreshControl,
  ScrollView,
  Text,
  View
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { ExpenseItem } from '../../components/ui/ExpenseItem'
import { MESES } from '../../constants/theme'
import { useFilter } from '../../contexts/FilterContext'
import { useGastos } from '../../hooks/useGastos'
export { categoryColor, COLORES_CAT, EMOJIS_CAT } from '@expenses/ui/tokens'

export default function DashboardScreen() {
  const {
    mes,
    setMes,
    datos,
    loading,
    refreshing,
    fetchGastos,
    categorias,
    totalMes,
  } = useGastos()

  const insets = useSafeAreaInsets()
  const listPaddingBottom = 160 + insets.bottom; // Updated to 160px as per guidelines
  const { selectedCategory, setAvailableCategories } = useFilter()

  // Creamos un string con los nombres para que useEffect sepa cuándo cambiaron las categorías reales
  const catNames = categorias.map(c => c[0]).join(',');

  useEffect(() => {
    // Sincronizamos las categorías que realmente tienen gastos este mes hacia el Footer
    setAvailableCategories(categorias.map(c => c[0]));
  }, [catNames, setAvailableCategories]);

  // Filtramos la lista de datos en base a selectedCategory
  const gastosFiltrados = datos?.datos.filter(g =>
    selectedCategory ? g.categoria === selectedCategory : true
  ) || [];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <View className="flex-1 w-full max-w-md mx-auto">
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 40, paddingBottom: listPaddingBottom }} 
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchGastos(true)}
              tintColor="#262A35" // Mantenemos el color en hexadecimal para tintColor que no acepta variables nativas directo
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="mb-[24px]">
            {loading && !datos ? (
              <>
                <View className="h-[24px] w-[120px] bg-secondary rounded-full mb-[8px]" />
                <View className="h-[16px] w-[80px] bg-secondary rounded-full" />
              </>
            ) : (
              <>
                <Text className="text-muted-foreground text-title font-regular mb-[8px]">
                  {MESES[mes - 1]}
                </Text>
                <Text className="text-primary text-body font-regular">
                  ${totalMes.toLocaleString('es-CL')}
                </Text>
              </>
            )}
          </View>

          {loading && !datos ? (
            <View className="mb-[24px]">
              <View className="h-[16px] w-[80px] bg-secondary rounded-full mb-[16px]" />
              <View className="gap-[16px]">
                {[1, 2, 3, 4, 5].map((item) => (
                  <View key={item} className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-[12px]">
                      <View className="w-[40px] h-[40px] bg-secondary rounded-full" />
                      <View className="gap-[4px]">
                        <View className="h-[14px] w-[100px] bg-secondary rounded-full" />
                        <View className="h-[12px] w-[60px] bg-secondary rounded-full" />
                      </View>
                    </View>
                    <View className="h-[14px] w-[70px] bg-secondary rounded-full" />
                  </View>
                ))}
              </View>
            </View>
          ) : !datos || datos.cantidad === 0 ? (
            <Text className="text-muted-foreground text-body font-medium">No hay gastos este mes</Text>
          ) : (
            <View className="mb-[24px]">
              <Text className="text-muted-foreground text-subtitle font-regular mb-[16px]">
                Historial
              </Text>
              {gastosFiltrados.length === 0 ? (
                <Text className="text-muted-foreground text-body font-medium">No hay gastos en esta categoría</Text>
              ) : (
                <View className="gap-[16px]">
                  {gastosFiltrados.map(g => (
                    <ExpenseItem
                      key={g.id}
                      monto={g.monto_formateado}
                      metodoPago={g.metodo}
                      emoji={require('../../../packages/ui/tokens').EMOJIS_CAT[g.categoria] || require('../../../packages/ui/tokens').EMOJIS_CAT["Sin categoría"]}
                      titulo={g.item}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}