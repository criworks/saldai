import type { CambioDeMovimiento } from '@saldai/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { llaves } from '@/lib/consultas'
import { editarMovimiento, eliminarMovimiento } from './api'

/**
 * Editar y eliminar un movimiento ya registrado.
 *
 * Las dos mutaciones invalidan el prefijo de los gastos y no la llave de un mes
 * puntual: una edición de fecha mueve el movimiento de mes, así que las llaves
 * afectadas son dos, y la de origen la pantalla no la tiene a mano cuando la
 * respuesta ya trae la fila nueva. Invalidar el prefijo cubre las dos sin que
 * nadie tenga que acordarse de la fecha anterior (ver `llaves`).
 *
 * Sin alta optimista, al contrario del registro: ahí el gasto aparece al toque
 * porque el usuario está escribiendo uno nuevo y el provisorio es lo que da la
 * sensación de guardado. Acá el movimiento ya está en la lista y lo que el
 * usuario necesita saber es si su corrección quedó guardada, así que la fila se
 * actualiza con lo que respondió el servidor.
 */
export function useMovimiento() {
  const cliente = useQueryClient()

  const invalidar = () => {
    cliente.invalidateQueries({ queryKey: llaves.todosLosGastos() })
    cliente.invalidateQueries({ queryKey: llaves.todosLosTotalesAnuales() })
  }

  const edicion = useMutation({
    mutationFn: ({ id, cambio }: { id: string; cambio: CambioDeMovimiento }) =>
      editarMovimiento(id, cambio),
    onSuccess: invalidar,
  })

  const borrado = useMutation({
    mutationFn: (id: string) => eliminarMovimiento(id),
    onSuccess: invalidar,
  })

  return {
    editar: edicion.mutateAsync,
    editando: edicion.isPending,
    errorAlEditar: edicion.error instanceof Error ? edicion.error.message : null,
    eliminar: borrado.mutateAsync,
    eliminando: borrado.isPending,
    errorAlEliminar: borrado.error instanceof Error ? borrado.error.message : null,
  }
}
