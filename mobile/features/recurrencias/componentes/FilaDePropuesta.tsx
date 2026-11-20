import { formatearMonto, isoAChileno, type PropuestaPendiente } from '@saldai/core'
import { Check, X } from 'phosphor-react-native'
import React from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { ExpenseItem } from '@/features/movimientos'
import { colors } from '@/constants/theme'
import { llaveDePropuesta } from '../propuestas'

export interface FilaDePropuestaProps {
  propuesta: PropuestaPendiente
  /** Abre la propuesta para corregirla antes de decidirla. */
  onElegir: (propuesta: PropuestaPendiente) => void
  /** Confirma tal cual, sin abrir nada. */
  onConfirmar: (propuesta: PropuestaPendiente) => void
  /** Omite esta vez. El plan sigue vivo y vuelve a proponer la próxima. */
  onOmitir: (propuesta: PropuestaPendiente) => void
  /** La categoría se dibuja solo si el perfil la tiene prendida. */
  categoriasVisibles?: boolean
  /** Lo mismo con el método. */
  metodosVisibles?: boolean
  /** Hay una decisión en vuelo sobre esta propuesta: apaga los dos botones. */
  ocupada?: boolean
}

/**
 * Una propuesta sin decidir, como una fila más del día que le toca.
 *
 * Va **en el listado del mes y bajo el encabezado de su fecha**, no en un
 * bloque aparte arriba: una propuesta del 5 es plata que salió el 5, y sacarla
 * de su día obligaba a llevar la fecha escrita al lado de las acciones para
 * poder distinguir dos propuestas del mismo plan. Bajo su encabezado la fecha
 * ya está dicha una vez, para la propuesta y para los movimientos de ese día.
 *
 * Se ve **como una fila del mes** —el mismo `ExpenseItem`, con el reloj
 * adelante— y no como una tarjeta: es lo que va a ser si se confirma, así que
 * mostrarla distinta obligaría a traducir mentalmente entre las dos formas. Lo
 * que la diferencia es el reloj, que es lo que marca que todavía está por
 * confirmar, y que trae las dos decisiones al lado.
 *
 * Las dos decisiones están **en la fila**: confirmar tal cual es el caso común
 * —el plan ya tiene el monto y la fecha— y mandarlo a un formulario para tocar
 * un botón sería un paso de más en lo único que la app pide. Tocar la fila
 * abre la propuesta para corregirla, que es el caso del monto que cambia mes a
 * mes.
 *
 * Estos montos **no están** en el total del mes de arriba: no son movimientos
 * hasta que se los confirma.
 */
export function FilaDePropuesta({
  propuesta,
  onElegir,
  onConfirmar,
  onOmitir,
  categoriasVisibles,
  metodosVisibles,
  ocupada,
}: FilaDePropuestaProps) {
  // La fecha larga va en las etiquetas de accesibilidad y no en pantalla: un
  // lector de pantalla lee la fila sola, sin el encabezado del día que la
  // agrupa, así que sin la fecha dos propuestas del mismo plan se escuchan
  // idénticas.
  const fecha = isoAChileno(propuesta.fecha)

  return (
    <View className="flex-row items-center gap-sm w-full">
      <Pressable
        onPress={() => onElegir(propuesta)}
        disabled={ocupada}
        accessibilityRole="button"
        accessibilityLabel={`${propuesta.movimiento.item} del ${fecha}, por confirmar`}
        className={`flex-1 active:opacity-60 ${ocupada ? 'opacity-40' : ''}`}
      >
        <ExpenseItem
          recurrente
          monto={formatearMonto(propuesta.movimiento.monto)}
          titulo={propuesta.movimiento.item}
          categoria={categoriasVisibles ? propuesta.movimiento.categoria : undefined}
          metodo={metodosVisibles ? propuesta.movimiento.metodo : undefined}
        />
      </Pressable>

      {ocupada ? (
        <ActivityIndicator size="small" color={colors.textMuted} />
      ) : (
        <>
          {/*
            Omitir no pide confirmación: no borra nada, el plan sigue vivo y
            vuelve a proponer la próxima vez. Un modal para decir "esta vez no"
            sería fricción sin nada que proteger.
          */}
          <Pressable
            onPress={() => onOmitir(propuesta)}
            accessibilityRole="button"
            accessibilityLabel={`Omitir ${propuesta.movimiento.item} del ${fecha}`}
            testID={`omitir-${llaveDePropuesta(propuesta)}`}
            className="w-xxl h-xxl rounded-full items-center justify-center active:opacity-60"
          >
            <X size={16} color={colors.textMuted} />
          </Pressable>

          <Pressable
            onPress={() => onConfirmar(propuesta)}
            accessibilityRole="button"
            accessibilityLabel={`Confirmar ${propuesta.movimiento.item} del ${fecha}`}
            testID={`confirmar-${llaveDePropuesta(propuesta)}`}
            className="w-xxl h-xxl rounded-full bg-foreground items-center justify-center active:opacity-60"
          >
            <Check size={16} color={colors.bg} weight="bold" />
          </Pressable>
        </>
      )}
    </View>
  )
}
