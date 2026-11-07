import type {
  CambioDeMovimiento,
  CambioDeRecurrencia,
  NuevaRecurrencia,
  PropuestaConfirmada,
  PropuestasPendientes,
  RecurrenciaGuardada,
  RecurrenciasDelPerfil,
} from '@saldai/core'
import * as mocks from '@/services/mocks'
import { enModoMock } from '@/services/mocks'
import { API_URL, getAuthHeaders, leerError, mensajeDeError } from '@/lib/peticiones'

/**
 * Las llamadas de recurrencia con confirmación.
 *
 * La `zona` va en todas las que dependen del "hoy", y acá importa más que en un
 * alta: el "hoy" decide **cuántas** propuestas se le deben al usuario. Con la
 * zona del servidor, alguien en Madrid vería aparecer la propuesta del día con
 * horas de retraso.
 */

async function leerJson<T>(res: Response, fallback: string): Promise<T> {
  const json = await res.json().catch(() => null)
  if (!res.ok || !(json as { ok?: boolean })?.ok) throw new Error(mensajeDeError(json, fallback))
  return json as T
}

/** Los planes que siguen proponiendo. */
export async function fetchRecurrencias(zona?: string): Promise<RecurrenciasDelPerfil> {
  if (enModoMock) return mocks.fetchRecurrencias()

  const params = new URLSearchParams(zona ? { zona } : {})
  const res = await fetch(`${API_URL}/recurrencias?${params.toString()}`, {
    method: 'GET',
    headers: await getAuthHeaders(),
  })

  if (!res.ok) {
    throw new Error(await leerError(res, 'Error en la respuesta del servidor al leer las recurrencias'))
  }

  return res.json()
}

/** Las propuestas que el usuario todavía no decidió, de la más vieja primero. */
export async function fetchPropuestas(zona?: string): Promise<PropuestasPendientes> {
  if (enModoMock) return mocks.fetchPropuestas()

  const params = new URLSearchParams(zona ? { zona } : {})
  const res = await fetch(`${API_URL}/recurrencias/propuestas?${params.toString()}`, {
    method: 'GET',
    headers: await getAuthHeaders(),
  })

  if (!res.ok) {
    throw new Error(await leerError(res, 'Error en la respuesta del servidor al leer las propuestas'))
  }

  return res.json()
}

/** Crea un plan a partir de la misma línea que un movimiento. */
export async function crearRecurrencia(plan: NuevaRecurrencia): Promise<RecurrenciaGuardada> {
  if (enModoMock) return mocks.crearRecurrencia(plan)

  const res = await fetch(`${API_URL}/recurrencias`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(plan),
  })

  return leerJson(res, 'Error al guardar la recurrencia')
}

/**
 * Confirma una propuesta y devuelve **el movimiento** que se creó.
 *
 * `cambio` es "editar solo esta vez": viaja solo lo que difiere de lo que el
 * plan proponía, igual que en el `PATCH` de un movimiento, porque de eso sale
 * la marca que protege la corrección de un reclasificar masivo.
 */
export async function confirmarPropuesta(
  recurrenciaId: string,
  fecha: string,
  cambio?: CambioDeMovimiento
): Promise<PropuestaConfirmada> {
  if (enModoMock) return mocks.confirmarPropuesta(recurrenciaId, fecha, cambio)

  const res = await fetch(`${API_URL}/recurrencias/propuestas/confirmar`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(
      cambio && Object.keys(cambio).length > 0
        ? { recurrenciaId, fecha, cambio }
        : { recurrenciaId, fecha }
    ),
  })

  return leerJson(res, 'Error al confirmar la propuesta')
}

/** Omitir no es borrar: la fecha queda decidida y no aparece en ninguna suma. */
export async function omitirPropuesta(recurrenciaId: string, fecha: string): Promise<{ ok: true }> {
  if (enModoMock) return mocks.omitirPropuesta(recurrenciaId, fecha)

  const res = await fetch(`${API_URL}/recurrencias/propuestas/omitir`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ recurrenciaId, fecha }),
  })

  return leerJson(res, 'Error al omitir la propuesta')
}

/** "Editar de aquí en adelante": cambia el plan desde una fecha. */
export async function editarRecurrencia(
  id: string,
  cambio: CambioDeRecurrencia
): Promise<RecurrenciaGuardada> {
  if (enModoMock) return mocks.editarRecurrencia(id, cambio)

  const res = await fetch(`${API_URL}/recurrencias/${id}`, {
    method: 'PATCH',
    headers: await getAuthHeaders(),
    body: JSON.stringify(cambio),
  })

  return leerJson(res, 'Error al guardar la recurrencia')
}
