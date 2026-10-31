/**
 * Las respuestas de error de la API, en un solo lugar.
 *
 * Toda respuesta trae `ok` y, cuando falla, `errores` en plural y en arreglo,
 * porque el parser puede devolver varios juntos. Estaba escrito a mano en cada
 * ruta, con el riesgo de que una se desviara del contrato que mobile lee.
 */

/** 400: lo que mandó el cliente no sirve. */
function errorDeEntrada(res, errores, extra = {}) {
  return res.status(400).json({ ok: false, errores, datos: null, ...extra })
}

/** 500: la base falló. El detalle va al log, no al cliente. */
function errorDeBase(res, mensaje, error, extra = {}) {
  console.error('Supabase error:', error)
  return res.status(500).json({ ok: false, errores: [mensaje], datos: null, ...extra })
}

module.exports = { errorDeEntrada, errorDeBase }
