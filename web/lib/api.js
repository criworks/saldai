import { supabase } from './supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Llama a la API con el token de la sesión.
 *
 * Sin el header `Authorization` la API responde 401 en `requireAuth`, que es
 * exactamente lo que le pasaba a la web: los fetch iban sin token, así que
 * guardar y listar gastos nunca funcionó.
 */
export async function apiFetch(path, opciones = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const headers = { 'Content-Type': 'application/json', ...opciones.headers }

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`
  }

  const res = await fetch(`${API_URL}${path}`, { ...opciones, headers })
  const cuerpo = await res.json().catch(() => null)

  return { ok: res.ok && cuerpo?.ok === true, status: res.status, cuerpo }
}

/**
 * Saca el mensaje de error del cuerpo de una respuesta de la API.
 *
 * La API responde `{ ok: false, errores: string[] }` cuando el parser falla y
 * `{ ok: false, error: string }` cuando falla la auth, así que hay que mirar
 * los dos. Los errores del parser vienen varios juntos y se muestran todos.
 */
export function mensajeDeError(cuerpo, fallback) {
  if (cuerpo && typeof cuerpo === 'object') {
    const { errores, error } = cuerpo
    if (Array.isArray(errores) && errores.length > 0) {
      const textos = errores.filter(e => typeof e === 'string')
      if (textos.length > 0) return textos.join(' · ')
    }
    if (typeof error === 'string' && error) return error
  }
  return fallback
}
