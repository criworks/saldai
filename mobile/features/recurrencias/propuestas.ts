import type { PropuestaPendiente } from '@saldai/core'

/**
 * Con qué se identifica una propuesta: su plan y su fecha prevista.
 *
 * No tiene id porque **no existe como fila**: una propuesta pendiente es la
 * ausencia de una decisión en `ocurrencias_recurrentes`. Este par es lo que
 * viaja por la navegación, lo que distingue una fila de la otra en la lista y lo
 * que dice cuál está esperando respuesta de la API.
 */
export function llaveDePropuesta(propuesta: PropuestaPendiente): string {
  return `${propuesta.recurrenciaId}-${propuesta.fecha}`
}
