import { formatearNumero, type Metodo } from '@saldai/core'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Calendar, CaretDown } from 'phosphor-react-native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Keyboard, Pressable, Text, TextInput, View } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { Input } from '@/components/ui/Input'
import { colors, LARGO_MAXIMO_NOTAS } from '@/constants/theme'
import { usePreferencias } from '@/features/perfil'
import { CategorySelector } from './CategorySelector'
import { PaymentMethodSelector } from './PaymentMethodSelector'

/** Lo que el formulario tiene en pantalla. Todo texto, como lo escribe el usuario. */
export interface ValoresDelMovimiento {
  /** Solo dígitos, sin separadores. */
  monto: string
  item: string
  /** La categoría elegida, o `''` para dejarlo sin categoría. */
  categoria: string
  metodo: Metodo
  notas: string
}

export interface FormularioDeMovimientoProps {
  valores: ValoresDelMovimiento
  /**
   * Un campo que cambió, como parche y no como par campo/valor: la fecha vive
   * en la pantalla y no acá, así que un par genérico obligaba a las dos puntas
   * a hablar de la misma forma exacta del objeto. Un parche no.
   */
  onCambiar: (cambio: Partial<ValoresDelMovimiento>) => void
  /** Lo que dice el chip: "Hoy", "Ayer" o 05/03/2026. */
  fechaTexto: string
  /** El día con el que abre el calendario. */
  fechaDelPicker: Date
  onElegirFecha: (fecha: Date) => void
  /**
   * La categoría que el parser deduce de la descripción, mientras se escribe.
   * Solo la captura la tiene: editando, el usuario ya no está escribiendo una
   * línea.
   */
  categoriaInferida?: string
  /** El campo de nota. La captura no lo muestra: ahí se escribe una línea. */
  mostrarNotas?: boolean
  /** Una escritura en vuelo: apaga los campos y muestra el indicador. */
  ocupado?: boolean
  /** Abre con el cursor en el monto. Es lo que hace la captura. */
  enfocarAlEntrar?: boolean
  /** Lo que va entre la descripción y los selectores, a la izquierda de la fecha. */
  accionesDeLaFila?: React.ReactNode
}

/**
 * El formulario de un movimiento: el mismo para crear, para editar y para
 * confirmar una propuesta.
 *
 * Era tres pantallas parecidas —la captura, el editor y el confirmador— con el
 * mismo monto, la misma descripción, el mismo chip de fecha y los mismos dos
 * selectores, escritos tres veces. Tres copias de un formulario no se
 * desincronizan de golpe: se desincronizan de a una, cuando alguien arregla el
 * teclado en una sola, y entonces la app tiene dos maneras de hacer lo mismo
 * según por dónde se entró.
 *
 * Lo que cambia entre los tres casos es **qué hacen los botones de abajo**, y
 * eso no está acá: la barra es del footer de la app, que sabe en qué ruta está.
 *
 * La fecha entra y sale como texto y como `Date`, no como ISO: la captura la
 * guarda como la escribió la persona ("Hoy", "Ayer") porque el parser la lee
 * después, y el editor la guarda en ISO porque es lo que tiene la columna. La
 * conversión la hace cada pantalla, que es la que sabe qué va a hacer con ella.
 */
export function FormularioDeMovimiento({
  valores,
  onCambiar,
  fechaTexto,
  fechaDelPicker,
  onElegirFecha,
  categoriaInferida,
  mostrarNotas,
  ocupado,
  enfocarAlEntrar,
  accionesDeLaFila,
}: FormularioDeMovimientoProps) {
  // Las dos funciones conmutables salen de las preferencias del perfil: lo que
  // no se registra no se edita, y al revés.
  const { categoriasVisibles, metodosVisibles } = usePreferencias()

  const montoRef = useRef<TextInput>(null)
  const descripcionRef = useRef<TextInput>(null)
  const [mostrarPicker, setMostrarPicker] = useState(false)
  const insets = useSafeAreaInsets()

  // Altura del teclado como shared value, actualizada en el hilo de UI
  // siguiendo la animación real del sistema cuadro a cuadro. Es lo que hace
  // que el form acompañe al teclado en vez de saltar cuando ya terminó.
  const { height: alturaTeclado } = useReanimatedKeyboardAnimation()

  // El form está anclado abajo en los dos estados del diseño; lo único que
  // cambia es qué ocupa el espacio debajo: el footer, o el teclado. Un solo
  // valor cubre los dos, así que la transición entre ellos es continua y no
  // hay booleano de "teclado visible" del que salgan saltos.
  const espacioFooter = 96 + insets.bottom
  const estiloEspacio = useAnimatedStyle(() => ({
    // `height` llega negativa (el signo sirve para un translateY directo);
    // acá hace falta la magnitud.
    paddingBottom: Math.max(Math.abs(alturaTeclado.value), espacioFooter),
  }))

  useFocusEffect(
    useCallback(() => {
      if (!enfocarAlEntrar) return

      const enfoque = setTimeout(() => montoRef.current?.focus(), 100)
      return () => {
        clearTimeout(enfoque)
        Keyboard.dismiss()
      }
    }, [enfocarAlEntrar])
  )

  // El picker sube con el teclado abierto y queda tapado a medias, así que
  // antes de abrirlo se baja. Es lo que ya hacía la captura.
  const abrirCalendario = () => {
    Keyboard.dismiss()
    setMostrarPicker(true)
  }

  const montoFormateado = valores.monto ? formatearNumero(parseInt(valores.monto, 10)) : ''

  return (
    <Pressable
      // Tocar fuera de los campos baja el teclado. Los taps sobre un input o
      // sobre el chip de fecha los atiende ese elemento y no llegan acá.
      accessible={false}
      onPress={() => Keyboard.dismiss()}
      className="flex-1 bg-background justify-end items-center"
    >
      <Animated.View style={[{ width: '100%' }, estiloEspacio]}>
        <View className="w-full flex-col items-center px-xl pt-3xl pb-lg">
          <View className="flex-col items-start gap-lg w-full">
            <View className="flex-row justify-end items-center w-full mb-sm">
              <Text className="text-muted-foreground text-display font-light mr-xs">$</Text>
              <Input
                variante="sin-fondo"
                ref={montoRef}
                value={montoFormateado}
                onChangeText={(texto) => onCambiar({ monto: texto.replace(/[^0-9]/g, '') })}
                placeholder="0"
                keyboardType="numeric"
                returnKeyType="next"
                onSubmitEditing={() => descripcionRef.current?.focus()}
                editable={!ocupado}
                accessibilityLabel="Monto"
                className={`text-display font-light min-w-[30px] text-right ${ocupado ? 'opacity-50' : ''}`}
              />
            </View>

            <View className="flex-row py-lg justify-between items-center w-full">
              <Input
                variante="sin-fondo"
                ref={descripcionRef}
                value={valores.item}
                onChangeText={(texto) => onCambiar({ item: texto })}
                placeholder="Descripción..."
                maxLength={40}
                returnKeyType="next"
                onSubmitEditing={abrirCalendario}
                editable={!ocupado}
                accessibilityLabel="Descripción"
                className={`flex-1 text-body text-right w-full ${ocupado ? 'opacity-50' : ''}`}
              />
            </View>

            {mostrarNotas && (
              <Input
                value={valores.notas}
                onChangeText={(texto) => onCambiar({ notas: texto })}
                placeholder="Nota (opcional)"
                multiline
                textAlignVertical="top"
                maxLength={LARGO_MAXIMO_NOTAS}
                editable={!ocupado}
                accessibilityLabel="Nota"
              />
            )}

            {/*
              La fila de la fecha. A su izquierda van las acciones que cada
              pantalla agregue —hoy, la recurrencia—, así que el chip queda
              siempre a la derecha, que es donde el diseño lo tiene.
            */}
            <View className="flex-row justify-end items-center gap-sm w-full">
              {ocupado && <ActivityIndicator size="small" color={colors.warning} className="mr-2" />}
              {accionesDeLaFila}

              <Pressable
                className={`flex-row px-md py-sm justify-center items-center gap-sm rounded-full bg-secondary ${ocupado ? 'opacity-50' : ''}`}
                disabled={ocupado}
                onPress={abrirCalendario}
                accessibilityRole="button"
                accessibilityLabel="Fecha"
              >
                <Calendar size={16} color={colors.textMuted} />
                <Text className="text-foreground text-body font-medium">{fechaTexto}</Text>
                <CaretDown size={16} color={colors.textMuted} />
              </Pressable>
            </View>

            <View
              className={`w-full ${ocupado ? 'opacity-50' : ''}`}
              pointerEvents={ocupado ? 'none' : 'auto'}
            >
              {categoriasVisibles && (
                <CategorySelector
                  selectedCategory={valores.categoria}
                  inferredCategory={categoriaInferida}
                  onSelectCategory={(categoria) => onCambiar({ categoria })}
                />
              )}
              {metodosVisibles && (
                <PaymentMethodSelector
                  method={valores.metodo}
                  onSelectMethod={(metodo) => onCambiar({ metodo })}
                />
              )}
            </View>
          </View>
        </View>
      </Animated.View>

      {mostrarPicker && (
        <DateTimePicker
          value={fechaDelPicker}
          mode="date"
          display="default"
          onChange={(_evento, elegida) => {
            setMostrarPicker(false)
            if (elegida) onElegirFecha(elegida)
          }}
        />
      )}
    </Pressable>
  )
}
