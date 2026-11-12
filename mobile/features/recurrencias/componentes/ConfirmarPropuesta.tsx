import { Portal } from '@rn-primitives/portal'
import { formatearNumero, isoAChileno, type PropuestaPendiente } from '@saldai/core'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Calendar, CaretDown, X } from 'phosphor-react-native'
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
import { Input } from '@/components/ui/Input'
import { CategorySelector, PaymentMethodSelector } from '@/features/movimientos'
import { usePreferencias } from '@/features/perfil'
import { colors, LARGO_MAXIMO_NOTAS } from '@/constants/theme'
import {
  borradorDePropuesta,
  cambioDeLaPropuesta,
  sePuedeConfirmar,
} from '../confirmacion'
import { usePropuestas } from '../usePropuestas'

export interface ConfirmarPropuestaProps {
  /** La propuesta a decidir. `null` tiene el confirmador cerrado. */
  propuesta: PropuestaPendiente | null
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
 * Decidir una propuesta: confirmarla, confirmarla corrigiendo algo, u omitirla.
 *
 * Confirmar es lo que **crea** el movimiento: hasta que el usuario toque el
 * botón, esta propuesta no existe en ninguna suma. Es una decisión de producto
 * —confirmar deja el movimiento en la memoria humana— y por eso no hay nada
 * que registre solo.
 *
 * Los campos abren con lo que el plan propone y lo que viaja es **solo lo que
 * el usuario cambió** (`cambioDeLaPropuesta`), que es "editar solo esta vez":
 * cambia este movimiento y no el plan. Cambiar el plan es otra acción, y está
 * en la pantalla de recurrencias.
 *
 * Omitir no es borrar: deja la fecha decidida, no crea movimiento y la
 * propuesta no vuelve a ofrecerse.
 */
export function ConfirmarPropuesta({ propuesta, onCerrar }: ConfirmarPropuestaProps) {
  const { categoriasVisibles, metodosVisibles } = usePreferencias()
  const { confirmar, confirmando, omitir, omitiendo } = usePropuestas()

  const [borrador, setBorrador] = useState(() =>
    propuesta ? borradorDePropuesta(propuesta) : null
  )
  const [mostrarPicker, setMostrarPicker] = useState(false)
  const [error, setError] = useState('')

  // El borrador se rearma cuando cambia la propuesta que se abre, y no al
  // montar: el componente se queda montado entre aperturas, así que sin esto la
  // segunda propuesta que se toca abriría con los valores de la primera.
  useEffect(() => {
    setBorrador(propuesta ? borradorDePropuesta(propuesta) : null)
    setError('')
  }, [propuesta])

  const puedeConfirmar = useMemo(
    () => (borrador ? sePuedeConfirmar(borrador) : false),
    [borrador]
  )

  if (!propuesta || !borrador) return null

  const ocupado = confirmando || omitiendo

  const cambiar = <C extends keyof typeof borrador>(campo: C, valor: (typeof borrador)[C]) => {
    setBorrador((previo) => (previo ? { ...previo, [campo]: valor } : previo))
  }

  const aceptar = async () => {
    const cambio = cambioDeLaPropuesta(propuesta, borrador)
    try {
      await confirmar({
        recurrenciaId: propuesta.recurrenciaId,
        // La fecha que viaja es la **prevista**, la que el plan proponía: es la
        // que cierra esta propuesta. La fecha corregida, si la hay, va dentro
        // del cambio.
        fecha: propuesta.fecha,
        cambio,
      })
      onCerrar()
    } catch (e) {
      // Queda abierto con lo escrito: cerrarlo ante un error perdería la
      // corrección sin haber confirmado nada.
      setError(e instanceof Error ? e.message : 'No se pudo confirmar')
    }
  }

  const saltear = async () => {
    try {
      await omitir({ recurrenciaId: propuesta.recurrenciaId, fecha: propuesta.fecha })
      onCerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo omitir')
    }
  }

  const montoFormateado = borrador.monto ? formatearNumero(parseInt(borrador.monto, 10)) : ''

  return (
    <Portal name="confirmar-propuesta">
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
                <Text className="text-card-foreground text-subtitle font-medium">Por confirmar</Text>
                {/*
                  La fecha prevista se muestra siempre, incluso si el usuario le
                  cambia la fecha al movimiento: es lo que explica por qué esta
                  propuesta está acá.
                */}
                <Text className="text-muted-foreground text-base font-normal">
                  {`Del ${isoAChileno(propuesta.fecha)}`}
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
                onPress={aceptar}
                disabled={!puedeConfirmar || ocupado}
                accessibilityRole="button"
                accessibilityLabel="Confirmar el movimiento"
                className={`h-control px-xl justify-center items-center rounded-lg bg-foreground active:opacity-80 ${
                  !puedeConfirmar || ocupado ? 'opacity-40' : ''
                }`}
              >
                {confirmando ? (
                  <ActivityIndicator size="small" color={colors.bg} />
                ) : (
                  <Text className="text-background text-body font-semibold">Confirmar</Text>
                )}
              </Pressable>

              {/*
                Omitir no pide confirmación: no borra nada y se puede deshacer
                desde la pantalla de la recurrencia. Un modal encima de un modal
                para decir "no este mes" es fricción sin nada que proteger.
              */}
              <Pressable
                onPress={saltear}
                disabled={ocupado}
                accessibilityRole="button"
                accessibilityLabel="Omitir esta vez"
                className={`h-control px-xl justify-center items-center rounded-lg active:opacity-80 ${
                  ocupado ? 'opacity-40' : ''
                }`}
              >
                {omitiendo ? (
                  <ActivityIndicator size="small" color={colors.textMuted} />
                ) : (
                  <Text className="text-muted-foreground text-body font-medium">
                    Omitir esta vez
                  </Text>
                )}
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
    </Portal>
  )
}
