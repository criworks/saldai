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
