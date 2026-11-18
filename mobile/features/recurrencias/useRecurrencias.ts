import type { CambioDeRecurrencia, NuevaRecurrencia } from '@saldai/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { llaves } from '@/lib/consultas'
import { zonaDelDispositivo } from '@/lib/zona'
import { crearRecurrencia, editarRecurrencia, fetchRecurrencias, terminarRecurrencia } from './api'

/**
 * Los planes del perfil, crear uno y editarlo de aquí en adelante.
 *
 * Las dos mutaciones invalidan también las propuestas: un plan nuevo propone
 * desde su fecha ancla, que puede ser pasada, así que la lista de pendientes
 * cambia en el mismo momento. Sin esto, el usuario crea el plan del arriendo y
 * no le aparece nada que confirmar hasta el próximo refetch.
 */
export function useRecurrencias() {
  const cliente = useQueryClient()
  const zona = zonaDelDispositivo()

  const consulta = useQuery({
    queryKey: llaves.recurrencias(),
    queryFn: () => fetchRecurrencias(zona),
  })

  const invalidar = () => {
    cliente.invalidateQueries({ queryKey: llaves.recurrencias() })
    cliente.invalidateQueries({ queryKey: llaves.propuestas() })
  }

  const alta = useMutation({
    mutationFn: (plan: NuevaRecurrencia) => crearRecurrencia({ ...plan, zona }),
    onSuccess: invalidar,
  })

  const edicion = useMutation({
    mutationFn: ({ id, cambio }: { id: string; cambio: CambioDeRecurrencia }) =>
      editarRecurrencia(id, cambio),
    onSuccess: invalidar,
  })

  // Terminar deja de proponer desde hoy. Invalida lo mismo que las otras dos:
  // las propuestas pendientes de hoy en adelante dejan de existir en el mismo
  // momento, y las de antes siguen ahí hasta que se decidan.
  const termino = useMutation({
    mutationFn: (id: string) => terminarRecurrencia(id, zona),
    onSuccess: invalidar,
  })

  return {
    recurrencias: consulta.data?.datos ?? [],
    cargando: consulta.isLoading,
    error: consulta.error instanceof Error ? consulta.error.message : null,
    crear: alta.mutateAsync,
    creando: alta.isPending,
    editar: edicion.mutateAsync,
    editando: edicion.isPending,
    terminar: termino.mutateAsync,
    terminando: termino.isPending,
  }
}
