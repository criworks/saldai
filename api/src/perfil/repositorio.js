const { createSupabaseClient } = require('../supabase')

/**
 * Las operaciones sobre el perfil del usuario, atadas a la sesión.
 *
 * Está separado de `gastos/repositorio.js` porque son dos cosas distintas: una
 * habla de la tabla de movimientos y la otra de la cuenta que los contiene.
 */
function repositorioDePerfil(token) {
  const supabase = createSupabaseClient(token)

  return {
    /**
     * Borra el perfil del usuario de la sesión: sus gastos y su fila de
     * `auth.users`.
     *
     * Va por `delete_user()` y no por un `delete` directo porque borrar de
     * `auth.users` no es algo que el rol `authenticated` pueda hacer. La
     * función es `security definer` y no recibe el id por parámetro: lo saca
     * de `auth.uid()`, así que esta llamada no puede borrar a otro usuario
     * aunque el token sea de quien sea.
     */
    eliminar() {
      return supabase.rpc('delete_user')
    },
  }
}

module.exports = { repositorioDePerfil }
