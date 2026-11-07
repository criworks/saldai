import { Portal } from '@rn-primitives/portal'
import {
  FRECUENCIAS,
  formatearNumero,
  isoAChileno,
  SIN_CATEGORIA,
  type Frecuencia,
  type Recurrencia,
} from '@saldai/core'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Calendar, CaretDown, X } from 'phosphor-react-native'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { Alert } from '@/components/ui/Alert'
import { Input } from '@/components/ui/Input'
import { CategorySelector, PaymentMethodSelector } from '@/features/gastos'
import { usePreferencias } from '@/features/perfil'
import { colors, LARGO_MAXIMO_NOTAS } from '@/constants/theme'
import { NOMBRES_FRECUENCIAS } from '../frecuencias'
import { useRecurrencias } from '../useRecurrencias'

export interface EditorDeRecurrenciaProps {
  /** El plan a editar. `null` tiene el editor cerrado. */
  recurrencia: Recurrencia | null
  onCerrar: () => void
}

/** `AAAA-MM-DD` a Date del día en hora local, para el picker. */
function fechaLocal(iso: string): Date {
  const [anio, mes, dia] = iso.split('-').map(Number)
  if (!anio || !mes || !dia) return new Date()
  return new Date(anio, mes - 1, dia)
}

/** Date del picker a `AAAA-MM-DD`. */
function aIso(fecha: Date): string {
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mm}-${dd}`
}

/** Hoy, en el día local del dispositivo. */
function hoyLocal(): string {
  return aIso(new Date())
}

/**
 * "Editar de aquí en adelante": cambia el plan desde una fecha.
 *
 * Lo ya confirmado no se toca, y no porque esta pantalla lo cuide: cada
 * ocurrencia confirmada es un movimiento propio y editarlo es otra cosa. Lo que
 * `Desde` protege es lo **pendiente de antes de esa fecha**, que sigue
 * perteneciendo al plan como estaba: por eso la fecha es un campo y no un
 * default silencioso.
 *
 * "Terminar" no borra el plan: le pone fecha de término. Los movimientos que
 * salieron de él siguen existiendo —son gastos del usuario— y las omisiones que
 * decidió también.
 */
export function EditorDeRecurrencia({ recurrencia, onCerrar }: EditorDeRecurrenciaProps) {
  const { categoriasVisibles, metodosVisibles } = usePreferencias()
  const { editar, editando } = useRecurrencias()

  const [borrador, setBorrador] = useState(() => borradorDe(recurrencia))
  const [mostrarPicker, setMostrarPicker] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setBorrador(borradorDe(recurrencia))
    setError('')
  }, [recurrencia])

  if (!recurrencia || !borrador) return null

  const cambiar = <C extends keyof typeof borrador>(campo: C, valor: (typeof borrador)[C]) => {
    setBorrador((previo) => (previo ? { ...previo, [campo]: valor } : previo))
  }

  const monto = parseInt(borrador.monto, 10)
  const puedeGuardar = Number.isInteger(monto) && monto > 0 && !!borrador.item.trim()

  const guardar = async () => {
    try {
      await editar({
        id: recurrencia.id,
        cambio: {
          desde: borrador.desde,
          monto,
          item: borrador.item.trim(),
          categoria: (borrador.categoria || SIN_CATEGORIA) as 'Sin categoría',
          metodo: borrador.metodo,
          notas: borrador.notas.trim() || null,
          frecuencia: borrador.frecuencia,
        },
      })
      onCerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la recurrencia')
    }
  }

  const terminar = async () => {
    try {
      // `desde` es el comienzo del plan y no hoy a propósito: así el cambio es
      // sobre este mismo plan y no crea un sucesor que viviría un solo día.
      await editar({
        id: recurrencia.id,
        cambio: { desde: recurrencia.vigente_desde, hasta: hoyLocal() },
      })
      onCerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo terminar la recurrencia')
    }
  }

  return (
    <Portal name="editor-de-recurrencia">
      <Modal
        visible
        transparent
        animationType="slide"
        onRequestClose={onCerrar}
        statusBarTranslucent
      >
        <Alert visible={!!error} message={error} type="error" />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-background/60"
        >
          <Pressable className="absolute inset-0" onPress={onCerrar} accessibilityLabel="Cerrar" />

          <View className="w-full px-xl pt-xl pb-10 rounded-t-[30px] bg-card">
            <View className="flex-row items-center justify-between w-full pb-lg">
              <View className="flex-col">
                <Text className="text-card-foreground text-subtitle font-medium">Recurrencia</Text>
                <Text className="text-muted-foreground text-base font-normal">
                  {`Desde el ${isoAChileno(recurrencia.vigente_desde)}`}
                </Text>
              </View>
              <Pressable
                onPress={onCerrar}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                className="w-xxl h-xxl rounded-full bg-secondary items-center justify-center active:opacity-80"
              >
                <X size={16} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              className="max-h-[420px]"
            >
              <View className="flex-col gap-lg w-full">
                <View className="flex-row items-center justify-end w-full">
                  <Text className="text-muted-foreground text-title font-light mr-xs">$</Text>
                  <Input
                    variante="sin-fondo"
                    value={borrador.monto ? formatearNumero(monto) : ''}
                    onChangeText={(texto) => cambiar('monto', texto.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    keyboardType="numeric"
                    editable={!editando}
                    accessibilityLabel="Monto"
                    className="text-title font-light text-right min-w-[30px]"
                  />
                </View>

                <Input
                  value={borrador.item}
                  onChangeText={(texto) => cambiar('item', texto)}
                  placeholder="Descripción"
                  maxLength={40}
                  editable={!editando}
                  accessibilityLabel="Descripción"
                />

                <View className="flex-row items-center justify-between w-full">
                  <Text className="text-muted-foreground text-base font-normal">Cada</Text>
                  <View className="flex-row gap-sm">
                    {FRECUENCIAS.map((frecuencia: Frecuencia) => (
                      <Pressable
                        key={frecuencia}
                        onPress={() => cambiar('frecuencia', frecuencia)}
                        disabled={editando}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: borrador.frecuencia === frecuencia }}
                        accessibilityLabel={NOMBRES_FRECUENCIAS[frecuencia]}
                        className={`px-md py-sm rounded-full active:opacity-80 ${
                          borrador.frecuencia === frecuencia ? 'bg-foreground' : 'bg-secondary'
                        }`}
                      >
                        <Text
                          className={`text-base font-medium ${
                            borrador.frecuencia === frecuencia
                              ? 'text-background'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {NOMBRES_FRECUENCIAS[frecuencia]}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View className="flex-row items-center justify-between w-full">
                  <Text className="text-muted-foreground text-base font-normal">Desde</Text>
                  <Pressable
                    disabled={editando}
                    onPress={() => setMostrarPicker(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Desde cuándo vale el cambio"
                    className={`flex-row px-md py-sm justify-center items-center gap-sm rounded-full bg-secondary active:opacity-80 ${
                      editando ? 'opacity-50' : ''
                    }`}
                  >
                    <Calendar size={16} color={colors.textMuted} />
                    <Text className="text-foreground text-body font-medium">
                      {isoAChileno(borrador.desde)}
                    </Text>
                    <CaretDown size={16} color={colors.textMuted} />
                  </Pressable>
                </View>

                <Input
                  value={borrador.notas}
                  onChangeText={(texto) => cambiar('notas', texto)}
                  placeholder="Nota (opcional)"
                  multiline
                  textAlignVertical="top"
                  maxLength={LARGO_MAXIMO_NOTAS}
                  editable={!editando}
                  accessibilityLabel="Nota"
                />

                <View pointerEvents={editando ? 'none' : 'auto'} className={editando ? 'opacity-50' : ''}>
                  {categoriasVisibles && (
                    <CategorySelector
                      selectedCategory={borrador.categoria}
                      onSelectCategory={(categoria) => cambiar('categoria', categoria)}
                    />
                  )}
                  {metodosVisibles && (
                    <PaymentMethodSelector
                      method={borrador.metodo}
                      onSelectMethod={(metodo) => cambiar('metodo', metodo)}
                    />
                  )}
                </View>
              </View>
            </ScrollView>

            <View className="flex-col gap-lg w-full pt-xl">
              <Pressable
                onPress={guardar}
                disabled={!puedeGuardar || editando}
                accessibilityRole="button"
                accessibilityLabel="Guardar de aquí en adelante"
                className={`h-control px-xl justify-center items-center rounded-lg bg-foreground active:opacity-80 ${
                  !puedeGuardar || editando ? 'opacity-40' : ''
                }`}
              >
                {editando ? (
                  <ActivityIndicator size="small" color={colors.bg} />
                ) : (
                  <Text className="text-background text-body font-semibold">
                    Guardar de aquí en adelante
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={terminar}
                disabled={editando}
                accessibilityRole="button"
                accessibilityLabel="Terminar la recurrencia"
                className={`h-control px-xl justify-center items-center rounded-lg active:opacity-80 ${
                  editando ? 'opacity-40' : ''
                }`}
              >
                <Text className="text-muted-foreground text-body font-medium">
                  Terminar la recurrencia
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>

        {mostrarPicker && (
          <DateTimePicker
            value={fechaLocal(borrador.desde)}
            mode="date"
            display="default"
            onChange={(_evento, elegida) => {
              setMostrarPicker(false)
              if (elegida) cambiar('desde', aIso(elegida))
            }}
          />
        )}
      </Modal>
    </Portal>
  )
}

/** Lo que el editor tiene en pantalla, armado desde el plan. */
function borradorDe(recurrencia: Recurrencia | null) {
  if (!recurrencia) return null

  return {
    monto: String(recurrencia.monto),
    item: recurrencia.item,
    categoria: recurrencia.categoria === SIN_CATEGORIA ? '' : (recurrencia.categoria ?? ''),
    metodo: recurrencia.metodo ?? 'TC',
    notas: recurrencia.notas ?? '',
    frecuencia: recurrencia.frecuencia,
    // El cambio vale desde hoy salvo que el usuario elija otra fecha: es lo que
    // significa "de aquí en adelante" sin tocar lo que ya pasó.
    desde: hoyLocal(),
  }
}
