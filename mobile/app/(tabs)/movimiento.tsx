import {
  isoAChileno,
  type Frecuencia,
  type Movimiento,
  type PropuestaPendiente,
} from '@saldai/core'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Trash } from 'phosphor-react-native'
import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, DeviceEventEmitter, Text, View } from 'react-native'
import { Alert } from '@/components/ui/Alert'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'
import { colors } from '@/constants/theme'
import {
  borradorDe,
  cambioPendiente,
  diaDesdeIso,
  FormularioDeMovimiento,
  isoDelDia,
  useMovimiento,
  useMovimientos,
  type BorradorDeMovimiento,
} from '@/features/movimientos'
import { usePreferencias } from '@/features/perfil'
import {
  BotonDeRecurrencia,
  borradorDePropuesta,
  cambioDeLaPropuesta,
  usePropuestas,
  useRecurrenciaDeMovimiento,
  useRecurrencias,
} from '@/features/recurrencias'

/**
 * Un movimiento, en sus dos estados: **por confirmar** y **confirmado**.
 *
 * Es una sola pantalla porque es una sola cosa. Antes eran dos bottom sheets
 * —el editor y el confirmador— con el mismo formulario escrito dos veces, y
 * ninguno de los dos se parecía a la captura, que lo tenía escrito una tercera
 * vez. Lo que de verdad cambia entre los tres casos es qué significan los dos
 * botones de abajo:
 *
 * | Estado        | El check               | El tacho                       |
 * |---------------|------------------------|--------------------------------|
 * | Por confirmar | confirma la propuesta  | la omite (no crea movimiento)  |
 * | Confirmado    | guarda la corrección   | elimina el movimiento          |
 *
 * Omitir y eliminar son lo mismo visto desde la persona: "este movimiento no
 * va". Por eso es el mismo botón, y por eso el ciclo de vida es de la vista y
 * no una columna de la fila: una propuesta pendiente sigue siendo la **ausencia
 * de una decisión** en `ocurrencias_recurrentes`.
 *
 * La barra de abajo la dibuja el footer de la app, que sabe en qué ruta está, y
 * los dos botones llegan acá como eventos.
 */
export default function MovimientoScreen() {
  const router = useRouter()
  const { id, recurrenciaId, fecha } = useLocalSearchParams<{
    id?: string
    recurrenciaId?: string
    fecha?: string
  }>()

  // El movimiento y la propuesta salen de lo que ya está en pantalla y no de
  // una consulta nueva: a esta ruta se entra tocando una fila del mes que se
  // está mirando, así que la fila ya está en la caché. Por la navegación viaja
  // solo su identidad, que es lo único que sobrevive a un refetch.
  const { datos } = useMovimientos()
  const { propuestas, confirmar, confirmando, omitir, omitiendo } = usePropuestas()
  const { atarRecurrencia, atando, editar, editando, eliminar, eliminando } = useMovimiento()

  // La recurrencia es una función conmutable del perfil: apagada, el botón no
  // aparece y no se consulta ningún plan. Si apareciera, se podrían crear planes
  // que después no se ven en ningún lado.
  const { recurrenciasVisibles } = usePreferencias()
  const {
    editar: editarPlan,
    editando: editandoPlan,
    terminar,
    terminando,
  } = useRecurrencias()

  const movimiento = useMemo<Movimiento | null>(
    () => (id ? (datos?.datos ?? []).find((m) => String(m.id) === id) ?? null : null),
    [id, datos]
  )
  const propuesta = useMemo<PropuestaPendiente | null>(
    () =>
      recurrenciaId && fecha
        ? propuestas.find((p) => p.recurrenciaId === recurrenciaId && p.fecha === fecha) ?? null
        : null,
    [recurrenciaId, fecha, propuestas]
  )

  // La identidad de lo que la pantalla está mostrando.
  //
  // Hace falta porque esta ruta vive en las tabs y **queda montada** cuando se
  // vuelve atrás: el siguiente `push` entra al mismo componente con su estado
  // intacto. Sin atar el borrador a esta llave, abrir otra fila mostraba el
  // movimiento anterior, y las acciones se mandaban contra el `original` viejo
  // —con una propuesta en pantalla y un movimiento guardado, el PATCH salía con
  // un id `undefined` y la API respondía que no era un uuid—.
  const llaveDelSujeto = id ?? (recurrenciaId && fecha ? `${recurrenciaId}|${fecha}` : '')

  // Lo que se está editando, y lo que había cuando se abrió. Se arma **una sola
  // vez por sujeto**, con lo primero que llega: un refetch del mes pisaría lo
  // que la persona está escribiendo, y confirmar una propuesta la saca de la
  // lista, así que sin la copia la pantalla se quedaría sin nada que mostrar
  // justo mientras vuelve atrás.
  const [borrador, setBorrador] = useState<BorradorDeMovimiento | null>(null)
  const [original, setOriginal] = useState<Movimiento | PropuestaPendiente | null>(null)
  const [cargado, setCargado] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)

  useEffect(() => {
    if (cargado === llaveDelSujeto) return

    if (propuesta) {
      setBorrador(borradorDePropuesta(propuesta))
      setOriginal(propuesta)
    } else if (movimiento) {
      setBorrador(borradorDe(movimiento))
      setOriginal(movimiento)
    } else {
      // Todavía no llegó a la caché: no se arma nada y la pantalla espera. Sin
      // este caso, el borrador del sujeto anterior seguiría en pantalla.
      return
    }

    setCargado(llaveDelSujeto)
    // El error y el modal son del sujeto anterior y no de este.
    setError('')
    setConfirmarBorrado(false)
  }, [cargado, llaveDelSujeto, movimiento, propuesta])

  const esPropuesta = !!recurrenciaId && !!fecha

  // De qué plan viene este movimiento. En una propuesta llega en los parámetros;
  // en un movimiento registrado, en su fila. En los dos casos lo que importa es
  // el plan **vivo** de la cadena, y eso lo resuelve el hook: desde un movimiento
  // de marzo, el id que trae la fila puede ser una versión ya cerrada.
  const idDelPlan = recurrenciaId ?? movimiento?.recurrencia_id ?? null
  const { plan } = useRecurrenciaDeMovimiento(recurrenciasVisibles ? idDelPlan : null)

  const ocupado =
    editando || eliminando || confirmando || omitiendo || atando || editandoPlan || terminando

  const cambiar = (cambio: Partial<BorradorDeMovimiento>) => {
    setBorrador((previo) => (previo ? { ...previo, ...cambio } : previo))
  }

  /**
   * Elegir la frecuencia, que según el caso crea el plan o lo cambia.
   *
   * Con plan es "editar de aquí en adelante" desde hoy: las propuestas
   * pendientes de antes de hoy siguen siendo del plan como estaba, que es lo que
   * protege la cadena. Sin plan, el movimiento queda atado a uno nuevo anclado en
   * su fecha, y esa primera ocurrencia nace confirmada.
   */
  const elegirFrecuencia = async (frecuencia: Frecuencia) => {
    try {
      if (plan) {
        await editarPlan({ id: plan.id, cambio: { desde: isoDelDia(new Date()), frecuencia } })
      } else if (!esPropuesta && original) {
        await atarRecurrencia({ id: String((original as Movimiento).id), recurrencia: { frecuencia } })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la recurrencia')
    }
  }

  const quitarRecurrencia = async () => {
    if (!plan) return
    try {
      await terminar(plan.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la recurrencia')
    }
  }

  const guardar = async () => {
    if (!borrador || !original) return
    try {
      if (esPropuesta) {
        const laPropuesta = original as PropuestaPendiente
        await confirmar({
          recurrenciaId: laPropuesta.recurrenciaId,
          // La fecha que cierra la propuesta es la **prevista**, la que el plan
          // proponía; si la persona le cambió la fecha, eso va en el cambio.
          fecha: laPropuesta.fecha,
          cambio: cambioDeLaPropuesta(laPropuesta, borrador),
        })
      } else {
        const elMovimiento = original as Movimiento
        const cambio = cambioPendiente(elMovimiento, borrador)
        // Sin nada que guardar el check es simplemente volver: un PATCH vacío
        // lo rechaza la API, y además marcaría campos como editados a mano.
        if (Object.keys(cambio).length > 0) {
          await editar({ id: String(elMovimiento.id), cambio })
        }
      }
      router.back()
    } catch (e) {
      // La pantalla queda abierta con lo escrito: salir ante un error perdería
      // la corrección sin haberla guardado.
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
    }
  }

  const descartar = async () => {
    if (!original) return
    try {
      if (esPropuesta) {
        const laPropuesta = original as PropuestaPendiente
        await omitir({ recurrenciaId: laPropuesta.recurrenciaId, fecha: laPropuesta.fecha })
      } else {
        await eliminar(String((original as Movimiento).id))
      }
      router.back()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo descartar el movimiento')
    }
  }

  // Omitir no pide confirmación: no borra nada y la decisión se puede deshacer
  // desde la pantalla de la recurrencia. Eliminar sí, porque no se recupera.
  const pedirDescartar = () => {
    if (esPropuesta) {
      descartar()
      return
    }
    setConfirmarBorrado(true)
  }

  // Sin arreglo de dependencias a propósito: las dos funciones se rearman en
  // cada render y se vuelven a suscribir con ellas, así el tap del footer
  // siempre llega al borrador que está en pantalla y no al del primer render.
  useEffect(() => {
    const check = DeviceEventEmitter.addListener('guardarMovimiento', guardar)
    const tacho = DeviceEventEmitter.addListener('descartarMovimiento', pedirDescartar)
    return () => {
      check.remove()
      tacho.remove()
    }
  })

  if (!borrador || cargado !== llaveDelSujeto) {
    // O todavía no llegó el mes a la caché, o la fila ya no está (se eliminó en
    // otro lado). Las dos se ven igual y de las dos se sale con la flecha del
    // footer, así que no hay dos mensajes distintos que escribir. Y mientras el
    // borrador sea de otro sujeto no se dibuja: es de la vez anterior que se
    // abrió esta pantalla.
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="small" color={colors.textMuted} />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background">
      <Alert visible={!!error} message={error} type="error" />

      {/*
        El encabezado solo aparece por confirmar: es lo que explica por qué esta
        pantalla está pidiendo algo, y se queda con la fecha **prevista** incluso
        si la persona le cambia la fecha al movimiento. Un movimiento ya
        confirmado no necesita decir que lo está.
      */}
      {esPropuesta && (
        <View className="px-xl pt-xl">
          <Text className="text-card-foreground text-subtitle font-medium">Por confirmar</Text>
          <Text className="text-muted-foreground text-base font-normal">
            {`Del ${isoAChileno((original as PropuestaPendiente | null)?.fecha ?? borrador.fecha)}`}
          </Text>
        </View>
      )}

      <FormularioDeMovimiento
        valores={borrador}
        onCambiar={cambiar}
        fechaTexto={isoAChileno(borrador.fecha)}
        fechaDelPicker={diaDesdeIso(borrador.fecha)}
        onElegirFecha={(elegida) => cambiar({ fecha: isoDelDia(elegida) })}
        mostrarNotas
        ocupado={ocupado}
        accionesDeLaFila={
          recurrenciasVisibles ? (
            <BotonDeRecurrencia
              plan={plan}
              onElegir={elegirFrecuencia}
              onQuitar={quitarRecurrencia}
              ocupado={ocupado}
            />
          ) : null
        }
      />

      <ConfirmationModal
        visible={confirmarBorrado}
        title={`Confirma que vas a eliminar "${borrador.item}". No se puede recuperar.`}
        icon={<Trash size={24} color={colors.errorStrong} weight="regular" />}
        buttonText="Eliminar movimiento"
        buttonVariant="destructive"
        onConfirm={() => {
          setConfirmarBorrado(false)
          descartar()
        }}
        onCancel={() => setConfirmarBorrado(false)}
      />
    </View>
  )
}
