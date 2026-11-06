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

    /**
     * Las preferencias del perfil, o `null` si todavía no guardó ninguna.
     *
     * `maybeSingle()` y no `single()`: no tener fila es lo normal hasta el
     * primer guardado, y `single()` lo trataría como error. Los defaults no se
     * inventan acá, están en el schema; quien llama los aplica con
     * `conDefaults()` para que haya un solo lugar donde se definan.
     */
    leerPreferencias(userId) {
      return supabase
        .from('preferencias')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
    },

    /**
     * Guarda los campos que vengan, creando la fila si no existe.
     *
     * Es un upsert y no un update porque la fila nace en el primer guardado y
     * no al registrarse: así no hace falta un trigger sobre `auth.users`, que
     * es una pieza más que mantener para algo que esta línea resuelve.
     */
    guardarPreferencias(userId, campos) {
      return supabase
        .from('preferencias')
        .upsert(
          { user_id: userId, ...campos, actualizado_en: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
        .select()
        .single()
    },
  }
}

module.exports = { repositorioDePerfil }
