import type { CambioDeMovimiento, GastoCreado, GastosDelMes, MovimientoCambiado, TotalesAnuales } from '@saldai/core'
import * as mocks from '@/services/mocks'
import { enModoMock } from '@/services/mocks'
import { API_URL, getAuthHeaders, leerError, mensajeDeError } from '@/lib/peticiones'

export async function fetchGastosPorMes(mes: number, anio?: number): Promise<GastosDelMes> {
  if (enModoMock) return mocks.fetchGastosPorMes()

  // El año es parte del filtro: sin él la API asume el año en curso.
  const params = new URLSearchParams({ mes: String(mes) })
  if (anio !== undefined) params.set('anio', String(anio))

  const res = await fetch(`${API_URL}/gastos?${params.toString()}`, {
    method: 'GET',
    headers: await getAuthHeaders(),
  })

  if (!res.ok) {
    throw new Error(await leerError(res, 'Error en la respuesta del servidor al obtener gastos'))
  }

  return res.json()
}

export async function fetchGastosAnuales(anio: number | string): Promise<TotalesAnuales> {
  if (enModoMock) return mocks.fetchGastosAnuales(anio)

  const res = await fetch(`${API_URL}/gastos/anuales?anio=${anio}`, {
    method: 'GET',
    headers: await getAuthHeaders(),
  })

  if (!res.ok) {
    throw new Error(
      await leerError(res, 'Error en la respuesta del servidor al obtener gastos anuales')
    )
  }

  return res.json()
}

/**
 * `zona` va en el cuerpo para que el "hoy" del servidor sea el del usuario y no
 * el de Chile. Si no se manda, la API cae a su `APP_TIMEZONE`.
 */
export async function crearGasto(inputStr: string, zona?: string): Promise<GastoCreado> {
  if (enModoMock) return mocks.crearGasto(inputStr)

  const res = await fetch(`${API_URL}/gastos`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(zona ? { input: inputStr, zona } : { input: inputStr }),
  })

  const json = await res.json().catch(() => null)

  // La API puede fallar por HTTP status o por `ok: false` en el cuerpo.
  if (!res.ok || !json?.ok) {
    throw new Error(mensajeDeError(json, 'Error al guardar el gasto'))
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

  const res = await fetch(`${API_URL}/gastos/${id}`, {
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

  const res = await fetch(`${API_URL}/gastos/${id}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  })

  const json = await res.json().catch(() => null)

  if (!res.ok || !json?.ok) {
    throw new Error(mensajeDeError(json, 'Error al eliminar el movimiento'))
  }

  return json
}
