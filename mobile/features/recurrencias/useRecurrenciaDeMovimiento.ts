import { useQuery } from '@tanstack/react-query'
import { llaves } from '@/lib/consultas'
import { fetchRecurrencia } from './api'

/**
 * El plan de un movimiento, a partir del `recurrencia_id` que trae su fila.
 *
 * Pide un plan suelto y no la lista de `GET /recurrencias`: esa lista trae solo
 * los que siguen proponiendo, y un movimiento de hace tres meses puede apuntar
 * a una versión cerrada por un "editar de aquí en adelante" posterior. Lo que la
 * pantalla usa para mostrar el estado y para actuar es `plan`, el **vivo** de la
 * cadena; la versión que anotó el movimiento queda en `anotado` para cuando haga
 * falta decir con qué frecuencia nació.
 *
 * Sin id no consulta nada: un movimiento sin recurrencia no tiene plan que pedir.
 */
export function useRecurrenciaDeMovimiento(id: string | null | undefined) {
  const consulta = useQuery({
    queryKey: llaves.recurrencia(id ?? ''),
    queryFn: () => fetchRecurrencia(id as string),
    enabled: !!id,
  })

  return {
    plan: consulta.data?.vivo ?? null,
    anotado: consulta.data?.datos ?? null,
    cargando: consulta.isLoading,
    error: consulta.error instanceof Error ? consulta.error.message : null,
  }
}
