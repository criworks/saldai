/**
 * Identidad del usuario autenticado.
 *
 * Vive aparte del middleware porque `middleware/auth.js` arma el cliente de
 * Supabase al importarse y eso exige las variables de entorno, así que no se
 * puede testear sin levantar media app. Acá no hay dependencias.
 */

/**
 * Saca el id del usuario del objeto que devuelve `supabase.auth.getUser`.
 *
 * Devuelve null en vez de undefined a propósito. Antes `server.js` leía
 * `req.user.sub`, que es el claim del JWT y no un campo de este objeto, así que
 * todas las consultas salían con el string "undefined" como `user_id` y
 * Postgres las rechazaba con `invalid input syntax for type uuid`. Un id
 * ausente ahora corta el request en vez de llegar a la query.
 */
function idDeUsuario(user) {
  const id = user?.id
  return typeof id === 'string' && id.length > 0 ? id : null
}

module.exports = { idDeUsuario }
