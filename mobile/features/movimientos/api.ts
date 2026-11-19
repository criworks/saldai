import type {
  CambioDeMovimiento,
  MovimientoCreado,
  MovimientosDelMes,
  MovimientoCambiado,
  RecurrenciaDeMovimiento,
  RecurrenciaGuardada,
  TotalesAnuales,
} from '@saldai/core'
import * as mocks from '@/services/mocks'
import { enModoMock } from '@/services/mocks'
import { API_URL, getAuthHeaders, leerError, mensajeDeError } from '@/lib/peticiones'

export async function fetchMovimientosPorMes(mes: number, anio?: number): Promise<MovimientosDelMes> {
  if (enModoMock) return mocks.fetchMovimientosPorMes()

  // El año es parte del filtro: sin él la API asume el año en curso.
  const params = new URLSearchParams({ mes: String(mes) })
  if (anio !== undefined) params.set('anio', String(anio))

  const res = await fetch(`${API_URL}/movimientos?${params.toString()}`, {
    method: 'GET',
    headers: await getAuthHeaders(),
  })

  if (!res.ok) {
    throw new Error(await leerError(res, 'Error en la respuesta del servidor al obtener movimientos'))
  }

  return res.json()
}

export async function fetchMovimientosAnuales(anio: number | string): Promise<TotalesAnuales> {
  if (enModoMock) return mocks.fetchMovimientosAnuales(anio)

  const res = await fetch(`${API_URL}/movimientos/anuales?anio=${anio}`, {
    method: 'GET',
    headers: await getAuthHeaders(),
  })

  if (!res.ok) {
    throw new Error(
      await leerError(res, 'Error en la respuesta del servidor al obtener movimientos anuales')
    )
  }

  return res.json()
}

/**
 * `zona` va en el cuerpo para que el "hoy" del servidor sea el del usuario y no
 * el de Chile. Si no se manda, la API cae a su `APP_TIMEZONE`.
 */
export async function crearMovimiento(
  inputStr: string,
  zona?: string,
  // La recurrencia viaja **con el alta** y no en una llamada después: el plan se
  // ancla en la fecha del movimiento y su primera ocurrencia queda confirmada,
  // así que las dos escrituras tienen que verse juntas o no verse (la API lo
  // hace en una función de Postgres).
  recurrencia?: RecurrenciaDeMovimiento
): Promise<MovimientoCreado> {
  if (enModoMock) return mocks.crearMovimiento(inputStr, recurrencia)

  const res = await fetch(`${API_URL}/movimientos`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      input: inputStr,
      ...(zona ? { zona } : {}),
      ...(recurrencia ? { recurrencia } : {}),
    }),
  })

  const json = await res.json().catch(() => null)

  // La API puede fallar por HTTP status o por `ok: false` en el cuerpo.
  if (!res.ok || !json?.ok) {
    throw new Error(mensajeDeError(json, 'Error al guardar el movimiento'))
  }

  return json
}

/**
 * Edita un movimiento ya registrado.
 *
 * Se manda **solo lo que cambia**: la API marca como editados a mano los
 * campos que recibe, y mandar el movimiento completo marcaría los seis aunque
 * el usuario haya tocado uno. Esa marca es la que después hace que un
 * reclasificar masivo no le pise la corrección.
 */
export async function editarMovimiento(
  id: string,
  cambio: CambioDeMovimiento
): Promise<MovimientoCambiado> {
  if (enModoMock) return mocks.editarMovimiento(id, cambio)

  const res = await fetch(`${API_URL}/movimientos/${id}`, {
    method: 'PATCH',
    headers: await getAuthHeaders(),
    body: JSON.stringify(cambio),
  })

  const json = await res.json().catch(() => null)

  if (!res.ok || !json?.ok) {
    throw new Error(mensajeDeError(json, 'Error al guardar los cambios'))
  }

  return json
}

/**
 * Elimina un movimiento. La respuesta trae la fila que se borró, así que quien
 * llama sabe de qué mes era: no siempre es el mes que se está mirando.
 */
export async function eliminarMovimiento(id: string): Promise<MovimientoCambiado> {
  if (enModoMock) return mocks.eliminarMovimiento(id)

  const res = await fetch(`${API_URL}/movimientos/${id}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  })

  const json = await res.json().catch(() => null)

  if (!res.ok || !json?.ok) {
    throw new Error(mensajeDeError(json, 'Error al eliminar el movimiento'))
  }

  return json
}


/**
 * Marca como recurrente un movimiento que ya existe, de cualquier fecha.
 *
 * El plan se ancla en la fecha de ese movimiento y esa primera ocurrencia queda
 * confirmada: lo que la persona ya tiene registrado no vuelve como propuesta.
 * Lo de después de esa fecha sí vuelve, y lo decide ella una por una.
 */
export async function atarRecurrencia(
  id: string,
  recurrencia: RecurrenciaDeMovimiento
): Promise<RecurrenciaGuardada> {
  if (enModoMock) return mocks.atarRecurrencia(id, recurrencia)

  const res = await fetch(`${API_URL}/movimientos/${id}/recurrencia`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(recurrencia),
  })

  const json = await res.json().catch(() => null)

  if (!res.ok || !json?.ok) {
    throw new Error(mensajeDeError(json, 'Error al crear la recurrencia'))
  }

  return json
}
