import type { CambioDePreferencias, Preferencias } from '@saldai/core'
import { API_URL, getAuthHeaders, leerError } from '@/lib/peticiones'

/**
 * Borra el perfil del usuario: sus movimientos y su cuenta.
 *
 * Va por la API y no por `supabase.rpc('delete_user')` desde la pantalla, que
 * es como estaba. Por abajo sigue siendo la misma función de Postgres, pero
 * pasando por la API queda sujeta al limitador de pedidos, aparece en el log, y
 * el día que el borrado haga algo más (hoy no limpia Storage, por ejemplo) se
 * cambia en el servidor y no en una versión nueva en las stores.
 *
 * Tira si falla. Quien la llama no puede cerrar sesión y decir que la cuenta se
 * eliminó: si esto no respondió ok, la cuenta sigue viva.
 */
export async function eliminarPerfil(): Promise<void> {
  const res = await fetch(`${API_URL}/perfil`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  })

  if (!res.ok) {
    throw new Error(await leerError(res, 'Error en la respuesta del servidor al eliminar la cuenta'))
  }
}

/**
 * Las preferencias del perfil.
 *
 * Nunca responde 404: hasta el primer guardado no hay fila y la API devuelve
 * los defaults, así que quien llama tiene un solo camino en vez de uno para
 * "tiene preferencias" y otro para "todavía no".
 */
export async function fetchPreferencias(): Promise<Preferencias> {
  const res = await fetch(`${API_URL}/perfil/preferencias`, {
    method: 'GET',
    headers: await getAuthHeaders(),
  })

  if (!res.ok) {
    throw new Error(
      await leerError(res, 'Error en la respuesta del servidor al leer las preferencias')
    )
  }

  return res.json()
}

/**
 * Cambia solo los campos que se le pasen y devuelve el estado completo.
 *
 * Devuelve todo y no solo lo que cambió para que la app se quede con la verdad
 * del servidor en vez de reconstruirla a partir de lo que mandó.
 */
export async function guardarPreferencias(cambio: CambioDePreferencias): Promise<Preferencias> {
  const res = await fetch(`${API_URL}/perfil/preferencias`, {
    method: 'PATCH',
    headers: await getAuthHeaders(),
    body: JSON.stringify(cambio),
  })

  if (!res.ok) {
    throw new Error(
      await leerError(res, 'Error en la respuesta del servidor al guardar las preferencias')
    )
  }

  return res.json()
}
