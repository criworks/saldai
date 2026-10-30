const { rateLimit } = require('express-rate-limit')

/**
 * Límite de pedidos por IP.
 *
 * El endpoint que de verdad queda expuesto es `POST /gastos/parsear`: no pide
 * sesión, así que cualquiera puede llamarlo en loop. No toca la base, pero sí
 * quema el CPU del plan gratis de Render, que es compartido y se estrangula.
 * Las rutas con sesión se limitan más suelto, porque ahí una request de más la
 * paga Supabase y no nosotros, y porque la app hace varias por pantalla.
 *
 * `/health` no se limita: UptimeRobot lo pinguea cada 5 minutos para que Render
 * no duerma el servicio, y es lo último que queremos estrangular. `/health/db`
 * sí, y aparte: no pide sesión y además consulta Supabase, así que sin límite
 * es una forma de golpear la base desde afuera. Para un keep-alive que corre
 * cada varios minutos, unos pocos pedidos por minuto sobran.
 */

/** Respuesta del 429, con la misma forma que el resto de los errores. */
function demasiadosPedidos(req, res) {
  return res.status(429).json({
    ok: false,
    errores: ['Demasiados pedidos. Esperá un momento y volvé a intentar.'],
    datos: null,
  })
}

const BASE = {
  windowMs: 60_000,
  handler: demasiadosPedidos,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
}

/**
 * Los dos limitadores. Los máximos se inyectan para que los tests puedan
 * probar el límite con números chicos en vez de mandar cientos de requests.
 */
function limitadores({ porMinutoSinSesion, porMinutoConSesion, porMinutoSalud }) {
  return {
    sinSesion: rateLimit({ ...BASE, limit: porMinutoSinSesion }),
    conSesion: rateLimit({ ...BASE, limit: porMinutoConSesion }),
    salud: rateLimit({ ...BASE, limit: porMinutoSalud }),
  }
}

module.exports = { limitadores }
