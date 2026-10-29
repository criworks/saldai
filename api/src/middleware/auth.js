const { createSupabaseClient } = require('../supabase.js')
const { idDeUsuario } = require('../identidad.js')

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Token requerido' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const supabase = createSupabaseClient(token)
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ ok: false, error: 'Token inválido o expirado' })
    }

    const userId = idDeUsuario(user)

    if (!userId) {
      console.error('El usuario autenticado no trae id:', user)
      return res.status(401).json({ ok: false, error: 'Token inválido o expirado' })
    }

    req.user = user
    // Las consultas usan req.userId y no req.user.<campo>, así no vuelven a
    // depender de la forma del objeto de Supabase.
    req.userId = userId
    req.token = token
    next()
  } catch (err) {
    return res.status(401).json({ ok: false, error: 'Error interno de autenticación' })
  }
}

module.exports = { requireAuth }
