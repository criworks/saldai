import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'

/**
 * Middleware de autenticación via Supabase JWT.
 * Requiere header: Authorization: Bearer <token>
 */
const client = jwksClient({
  jwksUri: `${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
  cache: true,
})

const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err)
    callback(null, key.getPublicKey())
  })
}

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Token requerido' })
  }

  const token = authHeader.split(' ')[1]

  jwt.verify(token, getKey, { algorithms: ['ES256'] }, (err, decoded) => {
    if (err) {
      return res.status(401).json({ ok: false, error: 'Token inválido o expirado' })
    }
    req.user = decoded
    next()
  })
}
module.exports = { requireAuth }
