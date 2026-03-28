import React, { useMemo } from 'react'
import {
  RefreshControl,
  ScrollView,
  Text,
  View
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { ExpenseItem } from '../../components/ui/ExpenseItem'
import { MESES } from '../../constants/theme'
import { useGastos, Gasto } from '../../hooks/useGastos'

// Helper para parsear fechas string (DD/MM/YYYY o ISO) a Date
function parseExpenseDate(dateString: string): Date {
  if (!dateString) return new Date(0);
  
  if (dateString.includes('/')) {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      return new Date(year, month - 1, day);
    }
  } else if (dateString.includes('-')) {
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts.map(Number);
      return new Date(year, month - 1, day);
    }
  }
  
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

// Helper para agrupar fechas: "Hoy", "Ayer" o "Ddd DD"
function formatGroupDate(expenseDate: Date): string {
  if (isNaN(expenseDate.getTime()) || expenseDate.getTime() === 0) {
    return 'Desconocido';
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateToCompare = new Date(expenseDate);
  dateToCompare.setHours(0, 0, 0, 0);

  if (dateToCompare.getTime() === today.getTime()) {
    return 'Hoy';
  }
  if (dateToCompare.getTime() === yesterday.getTime()) {
    return 'Ayer';
  }

  // Si no es hoy ni ayer, Ddd DD (ej. Jue 26)
  const formatter = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric' });
  let formatted = formatter.format(expenseDate);
  // Capitalize la primera letra y limpiar punto si la plataforma lo añade (ej: jue. 26 -> Jue 26)
  formatted = formatted.replace('.', '');
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export default function DashboardScreen() {
  const {
    mes,
    datos,
    loading,
    refreshing,
    fetchGastos,
    totalMes,
  } = useGastos()

  const insets = useSafeAreaInsets()
  const listPaddingBottom = 220 + insets.bottom;

  // Agrupar los gastos por fecha
  const gastosAgrupados = useMemo(() => {
    if (!datos?.datos) return [];
    
    // Transformar a un array con la fecha real parseada
    const withDates = datos.datos.map(g => ({
      ...g,
      parsedDate: parseExpenseDate(g.fecha)
    }));

    // Ordenar por fecha descendente (más actual primero, más antigua abajo)
    withDates.sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime());

    // Usamos Map para garantizar que se respete el orden de inserción de las llaves (las fechas más nuevas)
    const groupsMap = new Map<string, typeof withDates>();
    
    withDates.forEach((g) => {
      const label = formatGroupDate(g.parsedDate);
      if (!groupsMap.has(label)) {
        groupsMap.set(label, []);
      }
      groupsMap.get(label)!.push(g);
    });

    return Array.from(groupsMap.entries()).map(([label, items]) => ({
      label,
      data: items
    }));
  }, [datos?.datos]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ 
          paddingHorizontal: 24, // px-[24px] global container
          paddingTop: 40,        // pt-[40px] top section start
          paddingBottom: listPaddingBottom, // pb-[24px] is the internal padding, but we need safe footer margin
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchGastos(true)}
            tintColor="#262A35" // color secondary
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-col gap-lg w-full items-center">
          
          {/* Header Block (Mes y Total) */}
          <View className="w-full flex-col pt-xl rounded-[40px]">
            {loading && !datos ? (
              <View className="flex-col gap-sm w-full items-start">
                <View className="h-[28px] w-[120px] bg-secondary rounded-full" />
                <View className="h-[16px] w-[80px] bg-secondary rounded-full" />
              </View>
            ) : (
              <View className="flex-col gap-sm w-full items-start">
                <Text className="text-muted-foreground text-title font-normal leading-[normal]">
                  {MESES[mes - 1]}
                </Text>
                <Text className="text-foreground text-body font-medium leading-[normal] text-right">
                  ${totalMes.toLocaleString('es-CL')}
                </Text>
              </View>
            )}
          </View>

          {/* List Body (list-gastos container con gap-[24px]) */}
          {loading && !datos ? (
            <View className="flex-col gap-xl w-full rounded-[40px]">
              {[1, 2].map((group) => (
                <View key={group} className="flex-col w-full gap-xl">
                  <View className="h-[20px] w-[60px] bg-secondary rounded-full pt-xl" />
                  <View className="flex-col gap-xl">
                    {[1, 2, 3].map((item) => (
                      <View key={item} className="flex-row items-center gap-sm">
                        <View className="h-[32px] w-[90px] bg-secondary rounded-full" />
                        <View className="h-[14px] w-[60px] bg-secondary rounded-full" />
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : !datos || datos.cantidad === 0 ? (
            <View className="w-full flex-col rounded-[40px]">
               <Text className="text-muted-foreground text-body font-medium">No hay gastos este mes</Text>
            </View>
          ) : (
            <View className="flex-col w-full gap-xl rounded-[40px]">
              {gastosAgrupados.map((group) => (
                <View key={group.label} className="flex-col items-start w-full gap-xl">
                  {/* List Header ("Hoy", "Ayer") */}
                  <View className="flex-col items-start w-full pt-xl">
                    <Text className="text-muted-foreground text-subtitle font-normal leading-[normal]">
                      {group.label}
                    </Text>
                  </View>
                  
                  {/* Items Container */}
                  <View className="flex-col w-full gap-xl">
                    {group.data.map(g => (
                      <ExpenseItem
                        key={g.id}
                        monto={`$${g.monto.toLocaleString('es-CL')}`}
                        titulo={g.item}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
