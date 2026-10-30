const { capturar } = require('../observabilidad')

/**
 * Las dos puntas que le faltaban a la app: la ruta que no existe y el error que
 * nadie esperaba.
 *
 * Sin un manejador de errores propio, un `throw` inesperado cae al handler por
 * defecto de Express, que responde con el stack trace en el cuerpo cuando
 * `NODE_ENV` no es `production`. O sea que el detalle de la excepción (rutas de
 * archivos, nombres internos) depende de una variable de entorno en vez de ser
 * una decisión. Acá el cliente recibe siempre lo mismo y el detalle va al log.
 */

/** 404 con la misma forma que el resto de los errores de la API. */
function noEncontrado(req, res) {
  return res.status(404).json({
    ok: false,
    errores: [`No existe la ruta ${req.method} ${req.path}`],
    datos: null,
  })
}

/**
 * 500 genérico. Tiene que declarar los cuatro argumentos: Express reconoce un
 * manejador de errores por la aridad, y con tres se registra como middleware
 * normal y nunca se llama.
 */
function manejadorDeErrores(err, req, res, next) {
  // El body-parser rechaza un cuerpo más grande que el límite o un JSON roto:
  // eso es culpa del cliente y no un fallo del servidor.
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      ok: false,
      errores: ['El cuerpo del request es demasiado grande'],
      datos: null,
    })
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      ok: false,
      errores: ['El cuerpo del request no es JSON válido'],
      datos: null,
    })
  }

  console.error('Error no manejado:', err)
  capturar(err)

  // Si la respuesta ya empezó a escribirse no se puede cambiar el status.
  if (res.headersSent) return next(err)

  return res.status(500).json({
    ok: false,
    errores: ['Error interno del servidor'],
    datos: null,
  })
}

module.exports = { manejadorDeErrores, noEncontrado }
