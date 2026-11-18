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

/**
 * 404: la fila no existe, o es de otro usuario.
 *
 * Son el mismo 404 a propósito: distinguirlos le diría a cualquiera con sesión
 * si un id existe en la base de otra persona.
 */
function noEncontrado(res, mensaje) {
  return res.status(404).json({ ok: false, errores: [mensaje], datos: null })
}

/**
 * 409: la fila existe y la operación la duplicaría.
 *
 * No es un 400 —lo que mandó el cliente está bien formado— ni un 500: el
 * estado de la base es el que no deja. Lo usa atar una recurrencia a un
 * movimiento que ya tiene una.
 */
function conflicto(res, mensaje) {
  return res.status(409).json({ ok: false, errores: [mensaje], datos: null })
}

/** 500: la base falló. El detalle va al log, no al cliente. */
function errorDeBase(res, mensaje, error, extra = {}) {
  console.error('Supabase error:', error)
  return res.status(500).json({ ok: false, errores: [mensaje], datos: null, ...extra })
}

module.exports = { conflicto, errorDeEntrada, errorDeBase, noEncontrado }
