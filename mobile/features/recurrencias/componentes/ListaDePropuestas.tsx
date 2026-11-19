import { formatearMonto, isoAChileno, type PropuestaPendiente } from '@saldai/core'
import { Check, X } from 'phosphor-react-native'
import React from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { ExpenseItem } from '@/features/movimientos'
import { colors } from '@/constants/theme'

export interface ListaDePropuestasProps {
  propuestas: PropuestaPendiente[]
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
  /** La propuesta que se está decidiendo, mientras la API responde. */
  decidiendo?: string | null
}

/** La misma llave que usa la lista: un plan y una fecha identifican la propuesta. */
export function llaveDePropuesta(propuesta: PropuestaPendiente): string {
  return `${propuesta.recurrenciaId}-${propuesta.fecha}`
}

/**
 * El bloque de propuestas sin decidir, arriba del listado del mes.
 *
 * Va arriba y no en una pantalla aparte porque es lo único del producto que le
 * pide algo al usuario: una propuesta pendiente es plata que ya salió y que
 * todavía no está contada. En una pestaña propia habría que acordarse de
 * entrar.
 *
 * Cada propuesta se ve **como una fila del mes** —el mismo `ExpenseItem`, con
 * el reloj adelante— y no como una tarjeta aparte: es lo que va a ser si se
 * confirma, así que mostrarla distinta obligaría a traducir mentalmente entre
 * las dos formas. Lo que la diferencia es el reloj y que trae las dos
 * decisiones al lado.
 *
 * Las dos decisiones están **en la fila**: confirmar tal cual es el caso común
 * —el plan ya tiene el monto y la fecha— y mandarlo a un formulario para tocar
 * un botón sería un paso de más en lo único que la app pide. Tocar la fila
 * abre la propuesta para corregirla, que es el caso del monto que cambia mes a
 * mes.
 *
 * No muestra el total: estos montos **no están** en el total del mes, y ponerle
 * una suma al lado del total real invita a leerlos como si ya estuvieran
 * contados. Lo que hay que hacer con ellos es decidirlos, uno por uno.
 */
export function ListaDePropuestas({
  propuestas,
  onElegir,
  onConfirmar,
  onOmitir,
  categoriasVisibles,
  metodosVisibles,
  decidiendo,
}: ListaDePropuestasProps) {
  if (propuestas.length === 0) return null

  return (
    <View className="w-full flex-col pt-xl">
      <Text className="text-muted-foreground text-subtitle font-normal leading-[normal]">
        {propuestas.length === 1 ? 'Por confirmar' : `Por confirmar (${propuestas.length})`}
      </Text>

      <View className="w-full flex-col gap-xl pt-lg">
        {propuestas.map((propuesta) => {
          const llave = llaveDePropuesta(propuesta)
          const ocupada = decidiendo === llave
          const fecha = isoAChileno(propuesta.fecha)

          return (
            <View key={llave} className="flex-row items-center gap-sm w-full">
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

              {/*
                La fecha, corta y al lado de las acciones. En el listado del mes
                la dice el encabezado del día, pero acá no hay encabezados y las
                propuestas de un mismo plan se ven idénticas entre sí: marcar
                como recurrente algo de hace tres meses deja tres filas con el
                mismo item y el mismo monto, y sin la fecha no hay forma de
                saber cuál se está confirmando.
              */}
              <Text className="text-muted-foreground text-detail font-medium">
                {fecha.slice(0, 5)}
              </Text>

              {ocupada ? (
                <ActivityIndicator size="small" color={colors.textMuted} />
              ) : (
                <>
                  {/*
                    Omitir no pide confirmación: no borra nada, el plan sigue
                    vivo y vuelve a proponer la próxima vez. Un modal para
                    decir "esta vez no" sería fricción sin nada que proteger.
                  */}
                  <Pressable
                    onPress={() => onOmitir(propuesta)}
                    accessibilityRole="button"
                    accessibilityLabel={`Omitir ${propuesta.movimiento.item} del ${fecha}`}
                    testID={`omitir-${llave}`}
                    className="w-xxl h-xxl rounded-full items-center justify-center active:opacity-60"
                  >
                    <X size={16} color={colors.textMuted} />
                  </Pressable>

                  <Pressable
                    onPress={() => onConfirmar(propuesta)}
                    accessibilityRole="button"
                    accessibilityLabel={`Confirmar ${propuesta.movimiento.item} del ${fecha}`}
                    testID={`confirmar-${llave}`}
                    className="w-xxl h-xxl rounded-full bg-foreground items-center justify-center active:opacity-60"
                  >
                    <Check size={16} color={colors.bg} weight="bold" />
                  </Pressable>
                </>
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}
