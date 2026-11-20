import {
  FRECUENCIAS,
  isoAChileno,
  repeticionDelPlan,
  SIN_REPETICION,
  type Frecuencia,
  type Recurrencia,
  type Repeticion,
} from '@saldai/core'
import { Portal } from '@rn-primitives/portal'
import { Alarm, Check, Trash, X } from 'phosphor-react-native'
import React, { useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'
import { colors } from '@/constants/theme'
import { descripcionDeRepeticion, NOMBRES_FRECUENCIAS, reglaCompleta } from '../frecuencias'
import { SelectorDeRepeticion } from './SelectorDeRepeticion'

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
  /** La regla elegida y todavía no guardada, igual que `frecuenciaElegida`. */
  repeticionElegida?: Partial<Repeticion> | null
  /**
   * La fecha desde la que el plan rige: la del movimiento, o la del plan si ya
   * existe. De ahí sale el default de cada campo de la regla.
   */
  ancla?: string | null
  /**
   * Guardar: crea el plan, lo ata o le cambia la frecuencia y la regla.
   *
   * Las dos van juntas en una sola llamada porque una regla sin su frecuencia
   * no se puede validar —"el último viernes" no significa nada en un plan
   * semanal— y guardarlas por separado dejaría un plan en un estado que el
   * check de la tabla rechaza.
   */
  onElegir: (frecuencia: Frecuencia, repeticion: Repeticion) => void
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

/** Dos reglas son la misma si sus cuatro campos coinciden. */
function mismaRegla(a: Repeticion, b: Repeticion) {
  return (
    a.diaDeLaSemana === b.diaDeLaSemana &&
    a.semanaDelMes === b.semanaDelMes &&
    a.diaDelMes === b.diaDelMes &&
    a.mesDelAnio === b.mesDelAnio
  )
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
  repeticionElegida,
  ancla,
  onElegir,
  onQuitar,
  permitirQuitar = true,
  ocupado,
}: BotonDeRecurrenciaProps) {
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)

  const frecuencia = plan?.frecuencia ?? frecuenciaElegida ?? null
  const activo = !!frecuencia
  const reglaGuardada = plan ? repeticionDelPlan(plan) : reglaCompleta(repeticionElegida)
  const anclaEfectiva = plan?.vigente_desde ?? ancla ?? null

  /**
   * El borrador de la hoja: `null` con la hoja cerrada.
   *
   * La frecuencia y la regla se eligen juntas y se guardan al tocar "Listo", y
   * no una escritura por toque: cambiar de "mes" a "año" y después el mes del
   * año serían dos llamadas, y la primera guardaría un plan a medio configurar
   * que ya empezó a proponer.
   */
  const [borrador, setBorrador] = useState<{
    frecuencia: Frecuencia
    repeticion: Repeticion
  } | null>(null)

  const abrir = () =>
    setBorrador({ frecuencia: frecuencia ?? 'mensual', repeticion: reglaGuardada })

  const cambiarFrecuencia = (elegida: Frecuencia) =>
    setBorrador((previo) =>
      previo
        ? {
            frecuencia: elegida,
            // La regla de la frecuencia vieja no vale en la nueva, así que
            // vuelve a derivarse del ancla. Es lo mismo que hace el core
            // cuando un cambio de frecuencia viene sin regla.
            repeticion: elegida === previo.frecuencia ? previo.repeticion : SIN_REPETICION,
          }
        : previo
    )

  const guardar = () => {
    if (!borrador) return
    setBorrador(null)
    // Guardar sin haber cambiado nada no escribe: con plan sería un "editar de
    // aquí en adelante" que corta la cadena en dos por nada.
    if (activo && borrador.frecuencia === frecuencia && mismaRegla(borrador.repeticion, reglaGuardada)) {
      return
    }
    onElegir(borrador.frecuencia, borrador.repeticion)
  }

  return (
    <>
      <Pressable
        onPress={abrir}
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

      {borrador && (
        <Portal name="selector-de-recurrencia">
          <Modal
            visible
            transparent
            animationType="slide"
            statusBarTranslucent
            onRequestClose={() => setBorrador(null)}
          >
            <View className="flex-1 justify-end bg-background/60">
              <Pressable
                className="absolute inset-0"
                onPress={() => setBorrador(null)}
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
                    {/*
                      Qué día va a caer, escrito, y desde cuándo. Es lo que hace
                      visible un ancla mal guardada sin esperar a que el plan
                      proponga el mes que viene.
                    */}
                    <Text className="text-muted-foreground text-base font-normal">
                      {descripcionDeRepeticion(
                        borrador.frecuencia,
                        borrador.repeticion,
                        anclaEfectiva
                      )}
                      {plan ? ` · desde el ${isoAChileno(plan.vigente_desde)}` : ''}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setBorrador(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Cerrar"
                    className="w-xxl h-xxl rounded-full bg-secondary items-center justify-center active:opacity-80"
                  >
                    <X size={16} color={colors.textMuted} />
                  </Pressable>
                </View>

                {/*
                  La hoja scrollea: con los 31 días del mes, el selector no
                  entra en una pantalla de teléfono y el botón de guardar
                  quedaría abajo del borde, fuera de alcance.
                */}
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  className="max-h-[420px] w-full"
                >
                  {FRECUENCIAS.map((opcion) => (
                    <Pressable
                      key={opcion}
                      onPress={() => cambiarFrecuencia(opcion)}
                      accessibilityRole="button"
                      accessibilityLabel={`Cada ${NOMBRES_FRECUENCIAS[opcion].toLowerCase()}`}
                      accessibilityState={{ selected: opcion === borrador.frecuencia }}
                      className="flex-row h-control items-center justify-between active:opacity-80"
                    >
                      <Text className="text-card-foreground text-body font-normal">
                        {`Cada ${NOMBRES_FRECUENCIAS[opcion].toLowerCase()}`}
                      </Text>
                      {opcion === borrador.frecuencia && (
                        <Check size={16} color={colors.textMuted} />
                      )}
                    </Pressable>
                  ))}

                  <SelectorDeRepeticion
                    frecuencia={borrador.frecuencia}
                    repeticion={borrador.repeticion}
                    ancla={anclaEfectiva}
                    onCambiar={(repeticion) =>
                      setBorrador((previo) => (previo ? { ...previo, repeticion } : previo))
                    }
                  />

                  <Pressable
                    onPress={guardar}
                    accessibilityRole="button"
                    accessibilityLabel="Listo"
                    className="h-control px-xl mt-xl justify-center items-center rounded-lg bg-foreground active:opacity-80"
                  >
                    <Text className="text-background text-body font-semibold">Listo</Text>
                  </Pressable>
                </ScrollView>

                {activo && permitirQuitar && (
                  <Pressable
                    onPress={() => {
                      setBorrador(null)
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
