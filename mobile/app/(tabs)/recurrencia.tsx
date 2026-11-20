import {
  isoAChileno,
  METODO_DEFAULT,
  proximaOcurrencia,
  SIN_CATEGORIA,
  type Frecuencia,
  type Recurrencia,
} from '@saldai/core'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Trash } from 'phosphor-react-native'
import React, { useEffect, useState } from 'react'
import { DeviceEventEmitter, Text, View } from 'react-native'
import { Alert } from '@/components/ui/Alert'
import { ConfirmationModal } from '@/components/ui/ConfirmationModal'
import { colors } from '@/constants/theme'
import {
  diaDesdeIso,
  FormularioDeMovimiento,
  isoDelDia,
  type BorradorDeMovimiento,
} from '@/features/movimientos'
import { BotonDeRecurrencia, useRecurrencias } from '@/features/recurrencias'

/** El borrador de un plan nuevo: vacío, anclado hoy y mensual. */
function borradorNuevo(): BorradorDeMovimiento {
  return {
    monto: '',
    item: '',
    categoria: '',
    metodo: METODO_DEFAULT,
    fecha: isoDelDia(new Date()),
    notas: '',
  }
}

/**
 * El borrador de un plan que ya existe.
 *
 * La fecha **no** es el ancla del plan sino desde cuándo valdrá el cambio, y
 * arranca en la próxima ocurrencia y no en hoy: ese `desde` pasa a ser el ancla
 * del plan que sigue, así que con hoy el arriendo del 5 se mudaría al día en que
 * a alguien le tocó corregir el monto (ver `proximaOcurrencia`).
 */
function borradorDePlan(plan: Recurrencia): BorradorDeMovimiento {
  return {
    monto: String(plan.monto),
    item: plan.item,
    // Las dos columnas admiten null en un plan viejo, de antes de que el
    // catálogo fuera obligatorio; el formulario habla de "sin categoría" y del
    // método por defecto, como la captura.
    categoria: !plan.categoria || plan.categoria === SIN_CATEGORIA ? '' : plan.categoria,
    metodo: plan.metodo ?? METODO_DEFAULT,
    fecha: proximaOcurrencia(plan, { desde: isoDelDia(new Date()) }) ?? plan.vigente_desde,
    notas: plan.notas ?? '',
  }
}

/**
 * Un plan de recurrencia: crearlo y editarlo, con la forma de un movimiento.
 *
 * Es la misma pantalla y el mismo formulario que un movimiento porque un plan es
 * un movimiento que se repite: antes se creaba escribiendo la línea cruda
 * ("525457, arriendo, basicos, tc") en un campo suelto y se editaba en un bottom
 * sheet con otros seis campos, así que el producto tenía tres maneras de decir lo
 * mismo según por dónde se entrara.
 *
 * Lo propio del plan son dos cosas, y las dos están en la fila de la fecha: cada
 * cuánto se repite, en el botón de alarma, y desde cuándo. "Desde cuándo"
 * significa distinto según el caso, y es la única sutileza de esta pantalla:
 *
 * - **Plan nuevo:** es el ancla, la primera ocurrencia. De ahí sale el día del
 *   mes, el de la semana o el día y mes de todas las siguientes.
 * - **Plan que ya existe:** es desde cuándo vale el cambio. Lo pendiente de antes
 *   de esa fecha queda con los valores viejos —de eso se trata la cadena de
 *   planes— y de ahí en adelante rige lo nuevo.
 *
 * Esta pantalla no registra movimientos: el plan **propone**, y confirmar en el
 * mes es lo que crea el movimiento.
 */
export default function RecurrenciaScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id?: string }>()

  const { recurrencias, crear, creando, editar, editando, terminar, terminando } =
    useRecurrencias()

  const plan = id ? recurrencias.find((r) => r.id === id) ?? null : null

  // Qué plan está en pantalla, o `nuevo`. Esta ruta vive en las tabs y **queda
  // montada** al volver atrás, así que sin atar el borrador a esta llave entrar
  // de nuevo reusa el estado de la vez anterior: "Nueva recurrencia" abriría
  // con los valores del plan que se acababa de editar.
  const llaveDelPlan = id ?? 'nuevo'

  // Se arma una sola vez por plan, con lo primero que llega: un refetch de la
  // lista pisaría lo que la persona está escribiendo, y terminar un plan lo saca
  // de la lista justo mientras la pantalla vuelve atrás.
  const [borrador, setBorrador] = useState<BorradorDeMovimiento | null>(null)
  const [original, setOriginal] = useState<Recurrencia | null>(null)
  const [frecuencia, setFrecuencia] = useState<Frecuencia>('mensual')
  const [cargado, setCargado] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)

  useEffect(() => {
    if (cargado === llaveDelPlan) return

    if (!id) {
      setBorrador(borradorNuevo())
      setOriginal(null)
      setFrecuencia('mensual')
    } else if (plan) {
      setBorrador(borradorDePlan(plan))
      setOriginal(plan)
      setFrecuencia(plan.frecuencia)
    } else {
      // La lista todavía no llegó: la pantalla espera en vez de mostrar el plan
      // anterior.
      return
    }

    setCargado(llaveDelPlan)
    setError('')
    setConfirmarEliminar(false)
  }, [cargado, llaveDelPlan, id, plan])

  const ocupado = creando || editando || terminando

  const cambiar = (cambio: Partial<BorradorDeMovimiento>) => {
    setBorrador((previo) => (previo ? { ...previo, ...cambio } : previo))
  }

  const guardar = async () => {
    if (!borrador) return

    const monto = parseInt(borrador.monto, 10)
    const item = borrador.item.trim()
    if (!Number.isInteger(monto) || monto <= 0 || !item) {
      setError('Un plan necesita monto e item')
      return
    }

    try {
      if (original) {
        await editar({
          id: original.id,
          cambio: {
            desde: borrador.fecha,
            monto,
            item,
            categoria: (borrador.categoria || SIN_CATEGORIA) as 'Sin categoría',
            metodo: borrador.metodo,
            notas: borrador.notas.trim() || null,
            frecuencia,
          },
        })
      } else {
        // La línea va sin fecha y el ancla viaja aparte, en `desde`: la fecha de
        // la línea la leería el parser con su propio "hoy", y acá el día lo
        // eligió la persona en el calendario.
        await crear({
          input: [monto, item, borrador.categoria, borrador.metodo].join(', '),
          frecuencia,
          desde: borrador.fecha,
          notas: borrador.notas.trim() || null,
        })
      }
      router.back()
    } catch (e) {
      // La pantalla queda abierta con lo escrito: salir ante un error perdería
      // el plan sin haberlo guardado.
      setError(e instanceof Error ? e.message : 'No se pudo guardar la recurrencia')
    }
  }

  const eliminar = async () => {
    // Un plan que todavía no existe no se termina: el tacho es salir sin crearlo.
    if (!original) {
      router.back()
      return
    }

    try {
      await terminar(original.id)
      router.back()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la recurrencia')
    }
  }

  const pedirEliminar = () => {
    if (!original) {
      router.back()
      return
    }
    setConfirmarEliminar(true)
  }

  // Sin arreglo de dependencias a propósito, igual que en la vista del
  // movimiento: las dos funciones se rearman en cada render y se vuelven a
  // suscribir con ellas, así el tap del footer llega al borrador que está en
  // pantalla y no al del primer render.
  useEffect(() => {
    const check = DeviceEventEmitter.addListener('guardarMovimiento', guardar)
    const tacho = DeviceEventEmitter.addListener('descartarMovimiento', pedirEliminar)
    return () => {
      check.remove()
      tacho.remove()
    }
  })

  if (!borrador || cargado !== llaveDelPlan) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-muted-foreground text-body font-normal">
          Esa recurrencia ya no está.
        </Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background">
      <Alert visible={!!error} message={error} type="error" />

      <View className="px-xl pt-xl">
        <Text className="text-card-foreground text-subtitle font-medium">
          {original ? 'Recurrencia' : 'Nueva recurrencia'}
        </Text>
        <Text className="text-muted-foreground text-base font-normal">
          {original
            ? `Lo que cambies vale desde el ${isoAChileno(borrador.fecha)}`
            : 'Se propone y la confirmás vos. No registra nada solo.'}
        </Text>
      </View>

      <FormularioDeMovimiento
        valores={borrador}
        onCambiar={cambiar}
        fechaTexto={isoAChileno(borrador.fecha)}
        fechaDelPicker={diaDesdeIso(borrador.fecha)}
        onElegirFecha={(elegida) => cambiar({ fecha: isoDelDia(elegida) })}
        mostrarNotas
        ocupado={ocupado}
        enfocarAlEntrar={!original}
        accionesDeLaFila={
          // Acá no hay "quitar": todo lo de esta pantalla es recurrente, y
          // eliminar el plan es el tacho de la barra de abajo.
          <BotonDeRecurrencia
            frecuenciaElegida={frecuencia}
            onElegir={setFrecuencia}
            onQuitar={() => {}}
            permitirQuitar={false}
            ocupado={ocupado}
          />
        }
      />

      <ConfirmationModal
        visible={confirmarEliminar}
        title={`"${borrador.item}" deja de proponerse desde hoy. Los movimientos que ya se crearon quedan como están.`}
        icon={<Trash size={24} color={colors.errorStrong} weight="regular" />}
        buttonText="Eliminar la recurrencia"
        buttonVariant="destructive"
        onConfirm={() => {
          setConfirmarEliminar(false)
          eliminar()
        }}
        onCancel={() => setConfirmarEliminar(false)}
      />
    </View>
  )
}
