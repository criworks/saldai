import { createSupabaseClient } from '../supabase.js'

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

    req.user = user
    req.token = token
    next()
  } catch (err) {
    return res.status(401).json({ ok: false, error: 'Error interno de autenticación' })
  }
}

export { requireAuth }
