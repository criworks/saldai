import type { CambioDeMovimiento, RecurrenciaDeMovimiento } from '@saldai/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { llaves } from '@/lib/consultas'
import { atarRecurrencia, editarMovimiento, eliminarMovimiento } from './api'

/**
 * Editar y eliminar un movimiento ya registrado.
 *
 * Las mutaciones invalidan el prefijo de los movimientos y no la llave de un mes
 * puntual: una edición de fecha mueve el movimiento de mes, así que las llaves
 * afectadas son dos, y la de origen la pantalla no la tiene a mano cuando la
 * respuesta ya trae la fila nueva. Invalidar el prefijo cubre las dos sin que
 * nadie tenga que acordarse de la fecha anterior (ver `llaves`).
 *
 * Sin alta optimista, al contrario del registro: ahí el movimiento aparece al toque
 * porque el usuario está escribiendo uno nuevo y el provisorio es lo que da la
 * sensación de guardado. Acá el movimiento ya está en la lista y lo que el
 * usuario necesita saber es si su corrección quedó guardada, así que la fila se
 * actualiza con lo que respondió el servidor.
 */
export function useMovimiento() {
  const cliente = useQueryClient()

  // Las tres mutaciones invalidan lo mismo, y eso incluye las recurrencias y
  // las propuestas aunque dos de ellas no hablen de planes: tocar un movimiento
  // que salió de un plan mueve el plan. Cambiarle la fecha al movimiento que
  // ancla un plan mueve el ancla, y de ahí sale el día de todas las
  // ocurrencias; borrarlo borra en cascada la decisión que lo creó, así que esa
  // fecha vuelve a estar por confirmar. En los dos casos la lista de planes y
  // las propuestas del mes quedan viejas, y el usuario lo ve como que su
  // corrección no hizo nada.
  const invalidar = () => {
    cliente.invalidateQueries({ queryKey: llaves.todosLosMovimientos() })
    cliente.invalidateQueries({ queryKey: llaves.todosLosTotalesAnuales() })
    cliente.invalidateQueries({ queryKey: llaves.recurrencias() })
    cliente.invalidateQueries({ queryKey: llaves.todasLasPropuestas() })
  }

  const edicion = useMutation({
    mutationFn: ({ id, cambio }: { id: string; cambio: CambioDeMovimiento }) =>
      editarMovimiento(id, cambio),
    onSuccess: invalidar,
  })

  // Marcar como recurrente un movimiento que ya existe: el plan se ancla en la
  // fecha del movimiento, así que todo lo que va de esa fecha a hoy queda por
  // confirmar en el mismo momento. Los movimientos también, porque la fila gana
  // su `recurrencia_id`.
  const atado = useMutation({
    mutationFn: ({ id, recurrencia }: { id: string; recurrencia: RecurrenciaDeMovimiento }) =>
      atarRecurrencia(id, recurrencia),
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
    atarRecurrencia: atado.mutateAsync,
    atando: atado.isPending,
    eliminar: borrado.mutateAsync,
    eliminando: borrado.isPending,
    errorAlEliminar: borrado.error instanceof Error ? borrado.error.message : null,
  }
}
