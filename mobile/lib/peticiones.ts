/**
 * Lo que comparten todas las llamadas a la API: la URL base, el token de la
 * sesión y la lectura del mensaje de error.
 *
 * Vivía dentro de `features/gastos/api.ts`, que era el único que llamaba a la
 * API. Al aparecer el segundo (el borrado de perfil) la alternativa era copiar
 * el header de autorización o que una feature importara de otra, y las dos
 * terminan igual: el día que un 401 cambie, se arregla en un lado y no en el
 * otro.
 */

import { supabase } from '@/services/supabase'

export const API_URL = process.env.EXPO_PUBLIC_API_URL

/** Headers con el token de la sesión. Sin esto la API responde 401. */
export async function getAuthHeaders() {
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
export async function leerError(res: Response, fallback: string): Promise<string> {
  const cuerpo = await res.json().catch(() => null)
  return mensajeDeError(cuerpo, fallback)
}

export function mensajeDeError(cuerpo: unknown, fallback: string): string {
  if (cuerpo && typeof cuerpo === 'object') {
    const { errores, error } = cuerpo as { errores?: unknown; error?: unknown }
    if (Array.isArray(errores) && errores.length > 0) {
      return errores.filter((e): e is string => typeof e === 'string').join('\n') || fallback
    }
    if (typeof error === 'string' && error) return error
  }
  return fallback
}
