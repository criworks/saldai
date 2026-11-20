import type { CambioDeMovimiento } from '@saldai/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMovimientos } from '@/features/movimientos'
import { llaves } from '@/lib/consultas'
import { zonaDelDispositivo } from '@/lib/zona'
import { confirmarPropuesta, fetchPropuestas, omitirPropuesta } from './api'
import { ventanaDePropuestas } from './ventana'

/**
 * Las propuestas pendientes y las dos decisiones que se toman sobre una.
 *
 * Confirmar invalida los movimientos además de las propuestas: el movimiento que se
 * crea entra en un mes que puede no ser el que está en pantalla —se confirma la
 * propuesta de marzo en abril— así que se invalida el prefijo y no la llave de
 * un mes, por lo mismo que en `useMovimiento`.
 *
 * Omitir no crea ningún movimiento, así que no toca la caché de movimientos: lo
 * único que cambia es que esa propuesta ya no está pendiente.
 *
 * Hasta dónde propone la ventana lo decide **el hook** y no cada pantalla, a
 * partir del mes que se está mirando. Es a propósito: el listado del mes y la
 * vista de una propuesta leen la misma consulta, y si cada una armara su
 * ventana por su cuenta quedarían en llaves distintas. Entonces abrir una
 * propuesta de fin de mes desde la lista encontraría una caché que no la tiene
 * y la pantalla no sabría de qué propuesta le están hablando.
 */
export function usePropuestas() {
  const cliente = useQueryClient()
  const zona = zonaDelDispositivo()
  const { mes, anio } = useMovimientos()
  const hasta = ventanaDePropuestas(mes, anio)

  const consulta = useQuery({
    queryKey: llaves.propuestas(hasta),
    queryFn: () => fetchPropuestas(zona, hasta),
  })

  const invalidarPropuestas = () => {
    cliente.invalidateQueries({ queryKey: llaves.todasLasPropuestas() })
  }

  const confirmacion = useMutation({
    mutationFn: ({
      recurrenciaId,
      fecha,
      cambio,
    }: {
      recurrenciaId: string
      fecha: string
      cambio?: CambioDeMovimiento
    }) => confirmarPropuesta(recurrenciaId, fecha, cambio),
    onSuccess: () => {
      invalidarPropuestas()
      cliente.invalidateQueries({ queryKey: llaves.todosLosMovimientos() })
      cliente.invalidateQueries({ queryKey: llaves.todosLosTotalesAnuales() })
    },
  })

  const omision = useMutation({
    mutationFn: ({ recurrenciaId, fecha }: { recurrenciaId: string; fecha: string }) =>
      omitirPropuesta(recurrenciaId, fecha),
    onSuccess: invalidarPropuestas,
  })

  return {
    propuestas: consulta.data?.datos ?? [],
    cantidad: consulta.data?.cantidad ?? 0,
    cargando: consulta.isLoading,
    error: consulta.error instanceof Error ? consulta.error.message : null,
    confirmar: confirmacion.mutateAsync,
    confirmando: confirmacion.isPending,
    omitir: omision.mutateAsync,
    omitiendo: omision.isPending,
  }
}
