import { Portal } from '@rn-primitives/portal'
import { formatearNumero, type Gasto } from '@saldai/core'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Calendar, CaretDown, Trash, X } from 'phosphor-react-native'
import React, { useEffect, useMemo, useState } from 'react'
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
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'
import { Input } from '@/components/ui/Input'
import { colors, LARGO_MAXIMO_NOTAS } from '@/constants/theme'
import { usePreferencias } from '@/features/perfil'
import { CategorySelector } from './CategorySelector'
import { PaymentMethodSelector } from './PaymentMethodSelector'
import { borradorDe, cambioPendiente, hayAlgoQueGuardar } from '../edicion'
import { useMovimiento } from '../useMovimiento'

export interface EditorDeMovimientoProps {
  /** El movimiento a editar. `null` tiene el editor cerrado. */
  movimiento: Gasto | null
  onCerrar: () => void
}

/** `AAAA-MM-DD` a Date del día en hora local, para el picker. */
function fechaLocal(iso: string): Date {
  const [anio, mes, dia] = iso.split('-').map(Number)
  if (!anio || !mes || !dia) return new Date()
  return new Date(anio, mes - 1, dia)
}

/** Date del picker a `AAAA-MM-DD`, que es lo que guarda la columna. */
function aIso(fecha: Date): string {
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mm}-${dd}`
}

/**
 * El editor de un movimiento ya registrado: cambiar el monto, la descripción,
 * la fecha, la nota, la categoría y el método, o eliminarlo.
 *
 * Acá no corre el parser, al contrario de la captura: el usuario no está
 * escribiendo una línea sino corrigiendo campos sueltos, y `input_original`
 * queda como está porque sigue siendo lo que escribió. Lo que se manda es
 * **solo lo que cambió** (ver `cambioPendiente`), porque la API marca como
 * editados a mano los campos que recibe y esa marca decide si un reclasificar
 * masivo puede tocar la fila.
 *
 * La categoría y el método se muestran con la misma cuenta que la captura: solo
 * si el perfil los tiene prendidos. Editar una categoría que el usuario no ve
 * en ningún otro lado no tendría dónde mostrarse.
 */
export function EditorDeMovimiento({ movimiento, onCerrar }: EditorDeMovimientoProps) {
  const { categoriasVisibles, metodosVisibles } = usePreferencias()
  const { editar, editando, eliminar, eliminando } = useMovimiento()

  const [borrador, setBorrador] = useState(() =>
    movimiento ? borradorDe(movimiento) : null
  )
  const [mostrarPicker, setMostrarPicker] = useState(false)
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)
  const [error, setError] = useState('')

  // El borrador se rearma cuando cambia el movimiento que se abre, y no al
  // montar: el editor se queda montado entre aperturas, así que sin esto la
  // segunda fila que se toca se abriría con los valores de la primera.
  useEffect(() => {
    setBorrador(movimiento ? borradorDe(movimiento) : null)
    setError('')
  }, [movimiento])

  const puedeGuardar = useMemo(
    () => (movimiento && borrador ? hayAlgoQueGuardar(movimiento, borrador) : false),
    [movimiento, borrador]
  )

  if (!movimiento || !borrador) return null

  const ocupado = editando || eliminando

  const cambiar = <C extends keyof typeof borrador>(campo: C, valor: (typeof borrador)[C]) => {
    setBorrador((previo) => (previo ? { ...previo, [campo]: valor } : previo))
  }

  const guardar = async () => {
    const cambio = cambioPendiente(movimiento, borrador)
    // El botón ya está apagado cuando no hay nada que guardar; esto es por si
    // el tap llega igual, para no mandar un PATCH vacío que la API rechaza.
    if (Object.keys(cambio).length === 0) return

    try {
      await editar({ id: String(movimiento.id), cambio })
      onCerrar()
    } catch (e) {
      // El editor queda abierto con lo escrito: cerrarlo ante un error perdería
      // la corrección sin haberla guardado.
      setError(e instanceof Error ? e.message : 'No se pudo guardar el cambio')
    }
  }

  const borrar = async () => {
    setConfirmarBorrado(false)
    try {
      await eliminar(String(movimiento.id))
      onCerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar el movimiento')
    }
  }

  const montoFormateado = borrador.monto ? formatearNumero(parseInt(borrador.monto, 10)) : ''

  return (
    <Portal name="editor-de-movimiento">
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
          {/* Tocar fuera cierra sin guardar. */}
          <Pressable className="absolute inset-0" onPress={onCerrar} accessibilityLabel="Cerrar" />

          <View className="w-full px-xl pt-xl pb-10 rounded-t-[30px] bg-card">
            <View className="flex-row items-center justify-between w-full pb-lg">
              <Text className="text-card-foreground text-subtitle font-medium">Movimiento</Text>
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
                    value={montoFormateado}
                    onChangeText={(texto) => cambiar('monto', texto.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    keyboardType="numeric"
                    editable={!ocupado}
                    accessibilityLabel="Monto"
                    className="text-title font-light text-right min-w-[30px]"
                  />
                </View>

                <Input
                  value={borrador.item}
                  onChangeText={(texto) => cambiar('item', texto)}
                  placeholder="Descripción"
                  maxLength={40}
                  editable={!ocupado}
                  accessibilityLabel="Descripción"
                />

                <View className="flex-row items-center justify-end w-full">
                  <Pressable
                    disabled={ocupado}
                    onPress={() => setMostrarPicker(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Fecha"
                    className={`flex-row px-md py-sm justify-center items-center gap-sm rounded-full bg-secondary active:opacity-80 ${
                      ocupado ? 'opacity-50' : ''
                    }`}
                  >
                    <Calendar size={16} color={colors.textMuted} />
                    <Text className="text-foreground text-body font-medium">
                      {borrador.fecha.split('-').reverse().join('/')}
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
                  editable={!ocupado}
                  accessibilityLabel="Nota"
                />

                <View pointerEvents={ocupado ? 'none' : 'auto'} className={ocupado ? 'opacity-50' : ''}>
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
                disabled={!puedeGuardar || ocupado}
                accessibilityRole="button"
                accessibilityLabel="Guardar cambios"
                className={`h-control px-xl justify-center items-center rounded-lg bg-foreground active:opacity-80 ${
                  !puedeGuardar || ocupado ? 'opacity-40' : ''
                }`}
              >
                {editando ? (
                  <ActivityIndicator size="small" color={colors.bg} />
                ) : (
                  <Text className="text-background text-body font-semibold">Guardar</Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => setConfirmarBorrado(true)}
                disabled={ocupado}
                accessibilityRole="button"
                accessibilityLabel="Eliminar este movimiento"
                className={`flex-row h-control px-xl justify-center items-center gap-sm rounded-lg active:opacity-80 ${
                  ocupado ? 'opacity-40' : ''
                }`}
              >
                <Trash size={16} color={colors.errorStrong} />
                <Text className="text-destructive text-body font-medium">Eliminar</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>

        {mostrarPicker && (
          <DateTimePicker
            value={fechaLocal(borrador.fecha)}
            mode="date"
            display="default"
            onChange={(_evento, elegida) => {
              setMostrarPicker(false)
              if (elegida) cambiar('fecha', aIso(elegida))
            }}
          />
        )}
      </Modal>

      <ConfirmationModal
        visible={confirmarBorrado}
        title={`Confirma que vas a eliminar "${movimiento.item}". No se puede recuperar.`}
        icon={<Trash size={24} color={colors.errorStrong} weight="regular" />}
        buttonText="Eliminar movimiento"
        buttonVariant="destructive"
        onConfirm={borrar}
        onCancel={() => setConfirmarBorrado(false)}
      />
    </Portal>
  )
}
