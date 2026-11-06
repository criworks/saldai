const express = require('express')

const { requireAuth } = require('../middleware/auth.js')
const { conDefaults } = require('../perfil/preferencias')
const { repositorioDePerfil } = require('../perfil/repositorio')
const { validarPreferencias } = require('../perfil/validacion')
const { errorDeBase, errorDeEntrada } = require('../respuestas')

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

  // ── GET /perfil/preferencias ─────────────────────────────────────────────
  router.get('/preferencias', limites.conSesion, requireAuth, async (req, res) => {
    const { data, error } = await repositorioDePerfil(req.token).leerPreferencias(req.userId)

    if (error) return errorDeBase(res, 'Error al leer las preferencias', error)

    // Sin fila no es un 404: el perfil existe, lo que no existe es un guardado
    // previo. Devolver los defaults deja a la app con un solo camino en vez de
    // uno para "tiene preferencias" y otro para "todavía no".
    return res.status(200).json({ ok: true, errores: [], datos: conDefaults(data) })
  })

  // ── PATCH /perfil/preferencias ───────────────────────────────────────────
  router.patch('/preferencias', limites.conSesion, requireAuth, async (req, res) => {
    const entrada = validarPreferencias(req.body)
    if (!entrada.ok) return errorDeEntrada(res, entrada.errores)

    const { data, error } = await repositorioDePerfil(req.token).guardarPreferencias(
      req.userId,
      entrada.valor
    )

    if (error) return errorDeBase(res, 'Error al guardar las preferencias', error)

    // Devuelve el estado completo y no solo lo que cambió, así la app se queda
    // con la verdad del servidor en vez de reconstruirla a partir de lo que
    // mandó.
    return res.status(200).json({ ok: true, errores: [], datos: conDefaults(data) })
  })

  return router
}

module.exports = { rutasDePerfil }
