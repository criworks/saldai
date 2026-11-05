import { formatearMonto } from '@saldai/core'
import { useRouter } from 'expo-router'
import { CaretRight } from 'phosphor-react-native'
import React from 'react'
import { Pressable, Text, View } from 'react-native'
import { MESES } from '@/constants/theme'

export interface EncabezadoDelMesProps {
  /** El mes que se está mirando, de 1 a 12. */
  mes: number
  /** El total a mostrar debajo del nombre del mes. */
  total: number
  /** La primera carga del mes: en vez del mes y el total van dos barras. */
  loading?: boolean
}

/**
 * El bloque de arriba de las vistas del mes: el nombre del mes, que lleva a la
 * lista de meses, y un total.
 *
 * Es un componente y no una copia en cada pantalla porque lo usan el listado de
 * movimientos y el desglose por categoría, y en las dos es el mismo bloque con
 * el mismo destino. El total lo decide la pantalla: en el listado filtrado es
 * el de lo que se ve, no el del mes.
 */
export function EncabezadoDelMes({ mes, total, loading }: EncabezadoDelMesProps) {
  const router = useRouter()

  return (
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
            accessibilityRole="button"
            accessibilityLabel={`${MESES[mes - 1]}, elegir otro mes`}
            onPress={() => router.navigate('/meses')}
          >
            <Text className="text-muted-foreground text-title font-normal leading-[normal]">
              {MESES[mes - 1]}
            </Text>
            <CaretRight size={20} className="text-muted-foreground" weight="bold" />
          </Pressable>
          <Text className="text-foreground text-body font-medium leading-[normal] text-right">
            {formatearMonto(total)}
          </Text>
        </View>
      )}
    </View>
  )
}
