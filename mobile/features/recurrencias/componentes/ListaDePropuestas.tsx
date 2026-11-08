import { formatearMonto, isoAChileno, type PropuestaPendiente } from '@saldai/core'
import React from 'react'
import { Pressable, Text, View } from 'react-native'

export interface ListaDePropuestasProps {
  propuestas: PropuestaPendiente[]
  onElegir: (propuesta: PropuestaPendiente) => void
}

/**
 * El bloque de propuestas sin decidir, arriba del listado del mes.
 *
 * Va arriba y no en una pantalla aparte porque es lo único del producto que le
 * pide algo al usuario: una propuesta pendiente es plata que ya salió y que
 * todavía no está contada. En una pestaña propia habría que acordarse de
 * entrar.
 *
 * No muestra el total: estos montos **no están** en el total del mes, y ponerle
 * una suma al lado del total real invita a leerlos como si ya estuvieran
 * contados. Lo que hay que hacer con ellos es decidirlos, uno por uno.
 */
export function ListaDePropuestas({ propuestas, onElegir }: ListaDePropuestasProps) {
  if (propuestas.length === 0) return null

  return (
    <View className="w-full flex-col pt-xl">
      <Text className="text-muted-foreground text-subtitle font-normal leading-[normal]">
        {propuestas.length === 1 ? 'Por confirmar' : `Por confirmar (${propuestas.length})`}
      </Text>

      <View className="w-full flex-col gap-sm pt-lg">
        {propuestas.map((propuesta) => (
          <Pressable
            key={`${propuesta.recurrenciaId}-${propuesta.fecha}`}
            onPress={() => onElegir(propuesta)}
            accessibilityRole="button"
            accessibilityLabel={`Confirmar ${propuesta.movimiento.item} del ${isoAChileno(propuesta.fecha)}`}
            className="flex-row items-center justify-between w-full px-lg py-md rounded-lg bg-card active:opacity-80"
          >
            <View className="flex-col flex-1 pr-md">
              <Text className="text-card-foreground text-body font-medium" numberOfLines={1}>
                {propuesta.movimiento.item}
              </Text>
              <Text className="text-muted-foreground text-base font-normal">
                {isoAChileno(propuesta.fecha)}
              </Text>
            </View>
            <Text className="text-card-foreground text-body font-medium">
              {formatearMonto(propuesta.movimiento.monto)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}
