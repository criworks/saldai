const express = require('express')

const { requireAuth } = require('../middleware/auth.js')
const { repositorioDePerfil } = require('../perfil/repositorio')
const { errorDeBase } = require('../respuestas')

/**
 * Las rutas del perfil del usuario.
 *
 * Existe para que el borrado de cuenta deje de ser una llamada directa de la
 * pantalla a Supabase. Mientras mobile hacía `supabase.rpc('delete_user')` por
 * su cuenta, la app tenía dos caminos de escritura: uno por la API y otro por
 * abajo. El de abajo no pasa por el limitador de pedidos, no queda en el log de
 * la API y no se puede cambiar sin publicar una versión nueva en las stores.
 *
 * `limites` son los limitadores de pedidos. Va con el de sesión, igual que el
 * resto de las rutas que piden token.
 */
function rutasDePerfil({ limites }) {
  const router = express.Router()

  // ── DELETE /perfil ───────────────────────────────────────────────────────
  router.delete('/', limites.conSesion, requireAuth, async (req, res) => {
    const { error } = await repositorioDePerfil(req.token).eliminar()

    // Si falla, la cuenta sigue viva. La app cierra sesión solo cuando esto
    // responde ok, porque cerrar sesión y decir que se eliminó deja al usuario
    // creyendo que sus datos ya no están.
    if (error) return errorDeBase(res, 'Error al eliminar el perfil', error)

    return res.status(200).json({ ok: true, errores: [], datos: null })
  })

  return router
}

module.exports = { rutasDePerfil }
