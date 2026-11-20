import { FRECUENCIAS, isoAChileno, type Frecuencia, type Recurrencia } from '@saldai/core'
import { Portal } from '@rn-primitives/portal'
import { Alarm, Check, Trash, X } from 'phosphor-react-native'
import React, { useState } from 'react'
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'
import { colors } from '@/constants/theme'
import { NOMBRES_FRECUENCIAS } from '../frecuencias'

export interface BotonDeRecurrenciaProps {
  /**
   * El plan vivo de este movimiento, o `null` si no tiene.
   *
   * Es el de la cadena, no el que anotó el movimiento: desde un movimiento de
   * marzo se actúa sobre el que sigue proponiendo.
   */
  plan?: Recurrencia | null
  /**
   * La frecuencia elegida y todavía no guardada. Es el caso del alta: el plan
   * recién existe cuando el movimiento existe, así que hasta entonces el estado
   * activo sale de acá.
   */
  frecuenciaElegida?: Frecuencia | null
  /** Elegir una frecuencia: crea el plan, lo ata o le cambia la frecuencia. */
  onElegir: (frecuencia: Frecuencia) => void
  /**
   * Quitar la recurrencia. Con plan es "Eliminar", que corta desde hoy y pide
   * confirmación; sin plan es soltar lo que se acababa de elegir.
   */
  onQuitar: () => void
  /**
   * Si el selector ofrece quitar la recurrencia. En la vista de un plan no:
   * ahí todo es recurrente y el tacho de la barra de abajo es el que lo
   * elimina, así que ofrecerlo dos veces son dos caminos para lo mismo.
   */
  permitirQuitar?: boolean
  ocupado?: boolean
}

/**
 * El botón de alarma de la fila de la fecha: si este movimiento se repite.
 *
 * Idle con fondo transparente y activo con fondo gris, que es lo que el diseño
 * distingue. Activo dice además cada cuánto, porque "recurrente" sin la
 * frecuencia obliga a abrirlo para saber qué quedó configurado.
 *
 * Los tres casos del producto entran por el mismo botón y por eso está acá y no
 * en la pantalla: creando un movimiento, marcando uno que ya existe (de
 * cualquier fecha) o cambiando el plan de uno que ya se repite. Lo que cambia
 * entre ellos es a quién le toca escribir, y eso lo decide quien lo usa.
 *
 * **Eliminar la recurrencia no borra movimientos.** Corta el plan desde hoy: lo
 * ya creado queda, y lo que estaba por confirmar de antes de hoy sigue
 * esperando una decisión. El texto de la confirmación lo dice, porque "eliminar"
 * al lado de un movimiento se lee como borrar el movimiento.
 */
export function BotonDeRecurrencia({
  plan,
  frecuenciaElegida,
  onElegir,
  onQuitar,
  permitirQuitar = true,
  ocupado,
}: BotonDeRecurrenciaProps) {
  const [abierto, setAbierto] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)

  const frecuencia = plan?.frecuencia ?? frecuenciaElegida ?? null
  const activo = !!frecuencia

  const elegir = (elegida: Frecuencia) => {
    setAbierto(false)
    if (elegida === frecuencia) return
    onElegir(elegida)
  }

  return (
    <>
      <Pressable
        onPress={() => setAbierto(true)}
        disabled={ocupado}
        accessibilityRole="button"
        accessibilityLabel={activo ? 'Recurrente' : 'Hacer recurrente'}
        accessibilityState={{ selected: activo }}
        testID="boton-recurrencia"
        className={`flex-row px-md py-sm justify-center items-center gap-sm rounded-full active:opacity-80 ${
          activo ? 'bg-secondary' : 'bg-transparent'
        } ${ocupado ? 'opacity-50' : ''}`}
      >
        {ocupado ? (
          <ActivityIndicator size="small" color={colors.warning} />
        ) : (
          <Alarm size={16} color={activo ? colors.warning : colors.textMuted} />
        )}
        {activo && (
          <Text className="text-warning text-body font-medium">
            {`Cada ${NOMBRES_FRECUENCIAS[frecuencia].toLowerCase()}`}
          </Text>
        )}
      </Pressable>

      {abierto && (
        <Portal name="selector-de-recurrencia">
          <Modal
            visible
            transparent
            animationType="slide"
            statusBarTranslucent
            onRequestClose={() => setAbierto(false)}
          >
            <View className="flex-1 justify-end bg-background/60">
              <Pressable
                className="absolute inset-0"
                onPress={() => setAbierto(false)}
                accessibilityLabel="Cerrar"
              />

              <View className="w-full px-xl pt-xl pb-10 rounded-t-[30px] bg-card">
                <View className="flex-row items-center justify-between w-full pb-lg">
                  <View className="flex-col">
                    <Text className="text-card-foreground text-subtitle font-medium">
                      Se repite
                    </Text>
                    {/*
                      Desde cuándo, cuando ya hay plan: es lo que explica por qué
                      hay meses por confirmar hacia atrás.
                    */}
                    {plan && (
                      <Text className="text-muted-foreground text-base font-normal">
                        {`Desde el ${isoAChileno(plan.vigente_desde)}`}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => setAbierto(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Cerrar"
                    className="w-xxl h-xxl rounded-full bg-secondary items-center justify-center active:opacity-80"
                  >
                    <X size={16} color={colors.textMuted} />
                  </Pressable>
                </View>

                <View className="flex-col w-full">
                  {FRECUENCIAS.map((opcion) => (
                    <Pressable
                      key={opcion}
                      onPress={() => elegir(opcion)}
                      accessibilityRole="button"
                      accessibilityLabel={`Cada ${NOMBRES_FRECUENCIAS[opcion].toLowerCase()}`}
                      accessibilityState={{ selected: opcion === frecuencia }}
                      className="flex-row h-control items-center justify-between active:opacity-80"
                    >
                      <Text className="text-card-foreground text-body font-normal">
                        {`Cada ${NOMBRES_FRECUENCIAS[opcion].toLowerCase()}`}
                      </Text>
                      {opcion === frecuencia && <Check size={16} color={colors.textMuted} />}
                    </Pressable>
                  ))}
                </View>

                {activo && permitirQuitar && (
                  <Pressable
                    onPress={() => {
                      setAbierto(false)
                      // Sin plan todavía no hay nada que cortar: es soltar lo
                      // que se eligió hace diez segundos, y un modal para eso
                      // es fricción sin nada que proteger.
                      if (!plan) {
                        onQuitar()
                        return
                      }
                      setConfirmarEliminar(true)
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={plan ? 'Eliminar la recurrencia' : 'Quitar la recurrencia'}
                    className="flex-row h-control items-center gap-sm pt-xl active:opacity-80"
                  >
                    <Trash size={16} color={colors.errorStrong} />
                    <Text className="text-destructive text-body font-medium">
                      {plan ? 'Eliminar' : 'Quitar'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </Modal>
        </Portal>
      )}

      <ConfirmationModal
        visible={confirmarEliminar}
        title="Se deja de repetir desde hoy. Los movimientos que ya se crearon quedan como están."
        icon={<Trash size={24} color={colors.errorStrong} weight="regular" />}
        buttonText="Eliminar la recurrencia"
        buttonVariant="destructive"
        onConfirm={() => {
          setConfirmarEliminar(false)
          onQuitar()
        }}
        onCancel={() => setConfirmarEliminar(false)}
      />
    </>
  )
}
