import { anioDeIso, mesDeIso, METODO_DEFAULT, parsearGasto } from '@saldai/core'
import type { Gasto, GastosDelMes } from '@saldai/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { CampoClave } from '../constants/theme'
import { llaves } from '../lib/consultas'
import { crearGasto } from '../services/api'

/**
 * La llave de caché del mes al que pertenece una fecha ISO. `null` si la fecha
 * no se pudo leer, que es lo mismo que decir que no hay mes que actualizar.
 */
function llaveDelMesDe(fecha: string | null | undefined) {
  const mes = mesDeIso(fecha)
  const anio = anioDeIso(fecha)
  if (mes === null || anio === null) return null
  return llaves.gastosDelMes(mes, anio)
}

/**
 * Arma el gasto provisorio que se muestra mientras la API responde.
 *
 * El parser vive en `@saldai/core`, así que mobile puede leer el input sin
 * pasar por la red y el gasto aparece en la lista al toque. No se le pasa zona
 * horaria a propósito: el core asume Chile, igual que la API, y lo que importa
 * es que el "ayer" provisorio caiga en el mismo día que el del servidor.
 */
function gastoProvisorio(input: string): Gasto | null {
  const { ok, datos } = parsearGasto(input)
  if (!ok || !datos) return null

  return {
    // La fila real trae el id de Postgres; este es solo para la key de la lista
    // y lo reemplaza el refetch de `onSettled`.
    id: `provisorio-${Date.now()}`,
    monto: datos.monto,
    monto_formateado: datos.montoFormateado,
    item: datos.item,
    categoria: datos.categoria,
    fecha: datos.fecha,
    metodo: datos.metodo,
  }
}

export function useGastoMutation() {
  const cliente = useQueryClient()
  // El mensaje de resultado se borra a los 4 segundos. Si el usuario guarda
  // otro gasto antes, el temporizador del anterior se cancela: si no, borraba
  // el mensaje del nuevo apenas aparecía.
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [valores, setValores] = useState<Record<CampoClave, string>>({
    monto: '',
    item: '',
    categoria: '',
    fecha: '',
  })
  const [metodo, setMetodo] = useState(METODO_DEFAULT)
  const [mensaje, setMensaje] = useState('')
  const [lastSaved, setLastSaved] = useState<{ monto: string, descripcion: string } | null>(null)

  // Si la pantalla se va antes de que el temporizador corra, no queda un
  // setState pendiente sobre algo que ya no está montado.
  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current)
  }, [])

  const handleChange = (key: CampoClave, val: string) => {
    setValores(prev => ({ ...prev, [key]: val }))
  }

  const buildInput = () => {
    return [valores.monto, valores.item, valores.categoria, valores.fecha, metodo].join(', ')
  }

  const limpiarEnUnRato = () => {
    if (temporizador.current) clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => {
      mutacion.reset()
      setMensaje('')
      setLastSaved(null)
    }, 4000)
  }

  const mutacion = useMutation({
    mutationFn: (input: string) => crearGasto(input),

    // Alta optimista: el gasto entra en la lista del mes que le toca por fecha,
    // que no siempre es el mes que se está mirando (un gasto de "ayer" el día 1
    // es del mes anterior).
    async onMutate(input: string) {
      if (temporizador.current) clearTimeout(temporizador.current)
      const provisorio = gastoProvisorio(input)
      if (!provisorio) return {}

      const llave = llaveDelMesDe(provisorio.fecha)
      if (!llave) return {}
      await cliente.cancelQueries({ queryKey: llave })

      const previo = cliente.getQueryData<GastosDelMes>(llave)
      // Si ese mes no está en caché no hay nada que mostrar de más: lo va a
      // traer completo cuando se abra.
      if (previo) {
        cliente.setQueryData<GastosDelMes>(llave, {
          ...previo,
          datos: [provisorio, ...(previo.datos ?? [])],
          total: (previo.total ?? 0) + provisorio.monto,
        })
      }

      return { llave, previo }
    },

    onError(error, _input, contexto) {
      // Si la API rechazó el gasto, la lista vuelve a como estaba.
      if (contexto?.llave && contexto.previo) {
        cliente.setQueryData(contexto.llave, contexto.previo)
      }
      setMensaje(error instanceof Error ? error.message : 'no se pudo conectar con la api')
      limpiarEnUnRato()
    },

    onSuccess(json) {
      setMensaje(`${json.datos.montoFormateado} · ${json.datos.categoria}`)
      setLastSaved({
        monto: json.datos.montoFormateado,
        descripcion: json.datos.item,
      })

      setValores({ monto: '', item: '', categoria: '', fecha: '' })
      setMetodo(METODO_DEFAULT)

      limpiarEnUnRato()
    },

    // El gasto guardado trae el id y los campos como los dejó el servidor, así
    // que el mes afectado y los totales del año se vuelven a pedir igual.
    onSettled(json, _error, _input, contexto) {
      const fecha = json?.datos.fecha
      const llave = (fecha && llaveDelMesDe(fecha)) || contexto?.llave
      if (llave) cliente.invalidateQueries({ queryKey: llave })

      const anio = anioDeIso(fecha)
      if (anio !== null) {
        cliente.invalidateQueries({ queryKey: llaves.totalesAnuales(anio) })
      }
    },
  })

  const guardarGasto = async (onSuccessCallback?: () => void) => {
    if (!valores.monto || !valores.item) return

    try {
      await mutacion.mutateAsync(buildInput())
      onSuccessCallback?.()
    } catch {
      // El mensaje lo pone `onError`; acá solo se evita el unhandled rejection.
    }
  }

  const listo = Boolean(valores.monto && valores.item)

  // Las pantallas hablan de 'idle' | 'loading' | 'ok' | 'error', no de los
  // nombres de react-query.
  const estado = mutacion.isPending
    ? 'loading'
    : mutacion.isError
      ? 'error'
      : mutacion.isSuccess
        ? 'ok'
        : 'idle'

  return {
    valores,
    metodo,
    setMetodo,
    estado,
    mensaje,
    handleChange,
    guardarGasto,
    listo,
    lastSaved
  }
}
