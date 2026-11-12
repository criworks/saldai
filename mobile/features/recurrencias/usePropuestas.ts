import type { CambioDeMovimiento } from '@saldai/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { llaves } from '@/lib/consultas'
import { zonaDelDispositivo } from '@/lib/zona'
import { confirmarPropuesta, fetchPropuestas, omitirPropuesta } from './api'

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
 */
export function usePropuestas() {
  const cliente = useQueryClient()
  const zona = zonaDelDispositivo()

  const consulta = useQuery({
    queryKey: llaves.propuestas(),
    queryFn: () => fetchPropuestas(zona),
  })

  const invalidarPropuestas = () => {
    cliente.invalidateQueries({ queryKey: llaves.propuestas() })
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
