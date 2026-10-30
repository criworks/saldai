import type { GastoCreado, GastosDelMes, TotalesAnuales } from '@saldai/core'
import * as mocks from './mocks'
import { enModoMock } from './mocks'
import { supabase } from './supabase'

const API_URL = process.env.EXPO_PUBLIC_API_URL

/** Headers con el token de la sesión. Sin esto la API responde 401. */
async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  return headers
}

/**
 * Saca el mensaje de error de una respuesta de la API.
 *
 * La API responde `{ ok, errores: string[] }` cuando falla el parser y
 * `{ ok, error }` solo en los 401 de auth, así que leer `error` dejaba fuera el
 * detalle (por ejemplo "El parámetro 'mes' debe ser un número entre 1 y 12") y
 * siempre se mostraba el texto genérico. Los errores del parser vienen varios
 * juntos, así que se muestran todos.
 */
async function leerError(res: Response, fallback: string): Promise<string> {
  const cuerpo = await res.json().catch(() => null)
  return mensajeDeError(cuerpo, fallback)
}

function mensajeDeError(cuerpo: unknown, fallback: string): string {
  if (cuerpo && typeof cuerpo === 'object') {
    const { errores, error } = cuerpo as { errores?: unknown; error?: unknown }
    if (Array.isArray(errores) && errores.length > 0) {
      return errores.filter((e): e is string => typeof e === 'string').join('\n') || fallback
    }
    if (typeof error === 'string' && error) return error
  }
  return fallback
}

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

export async function crearGasto(inputStr: string): Promise<GastoCreado> {
  if (enModoMock) return mocks.crearGasto(inputStr)

  const res = await fetch(`${API_URL}/gastos`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ input: inputStr }),
  })

  const json = await res.json().catch(() => null)

  // La API puede fallar por HTTP status o por `ok: false` en el cuerpo.
  if (!res.ok || !json?.ok) {
    throw new Error(mensajeDeError(json, 'Error al guardar el gasto'))
  }

  return json
}
