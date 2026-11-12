/**
 * Validación de los parámetros de las rutas de movimientos.
 *
 * Son funciones puras que devuelven `{ ok, errores, valor }` en vez de escribir
 * en la respuesta: así se pueden probar sin levantar el servidor, que es lo que
 * no se podía hacer cuando esto vivía dentro de cada handler.
 */

const bien = (valor) => ({ ok: true, errores: [], valor })
const mal = (mensaje) => ({ ok: false, errores: [mensaje], valor: null })

/** El `input` que lee el parser. */
function validarInput(input) {
  if (!input || typeof input !== 'string') {
    return mal("El campo 'input' es requerido y debe ser un string")
  }
  return bien(input)
}

/**
 * El `id` de un movimiento, tal como viene en la ruta.
 *
 * Es uuid porque la columna es uuid: sin esta comprobación, un `/movimientos/hola`
 * llega a Supabase y vuelve como error 500 de base ("invalid input syntax"),
 * cuando es un 400 del cliente.
 */
function validarId(id) {
  const esUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(id ?? '').trim()
  )
  if (!esUuid) return mal("El parámetro 'id' tiene que ser el uuid de un movimiento")
  return bien(String(id).trim())
}

/** `mes` de 1 a 12. */
function validarMes(mes) {
  const numero = parseInt(mes, 10)
  if (isNaN(numero) || numero < 1 || numero > 12) {
    return mal("El parámetro 'mes' debe ser un número entre 1 y 12")
  }
  return bien(numero)
}

/** `anio` opcional: sin él se asume el que se le pase por defecto. */
function validarAnio(anio, porDefecto) {
  const numero = anio === undefined ? porDefecto : parseInt(anio, 10)
  if (isNaN(numero) || numero < 2000 || numero > 2100) {
    return mal("El parámetro 'anio' debe ser un año entre 2000 y 2100")
  }
  return bien(numero)
}

/** `anio` obligatorio, como lo pide la ruta de totales del año. */
function validarAnioRequerido(anio) {
  if (!anio || isNaN(parseInt(anio, 10))) {
    return mal("El parámetro 'anio' es requerido y debe ser numérico")
  }
  return bien(parseInt(anio, 10))
}

module.exports = { validarInput, validarId, validarMes, validarAnio, validarAnioRequerido }
