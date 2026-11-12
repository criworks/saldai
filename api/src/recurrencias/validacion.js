/**
 * Validación de los parámetros de las rutas de recurrencias.
 *
 * Lo que valida una regla del dominio —qué frecuencias existen, qué campos
 * tiene un plan, si una fecha es real— está en `@saldai/core/recurrencias`,
 * porque significa lo mismo en la app. Acá queda solo lo que es de la ruta: la
 * forma de los identificadores y de los parámetros.
 */

const { esFechaIso, esZonaValida } = require('@saldai/core')

const bien = (valor) => ({ ok: true, errores: [], valor })
const mal = (mensaje) => ({ ok: false, errores: [mensaje], valor: null })

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * El id de un plan. Por lo mismo que el de un movimiento: sin esto, un
 * `/recurrencias/hola` llega a Supabase y vuelve como un 500 de base, cuando es
 * un 400 del cliente.
 */
function validarIdDeRecurrencia(id) {
  const valor = String(id ?? '').trim()
  if (!UUID.test(valor)) {
    return mal("El parámetro 'id' tiene que ser el uuid de una recurrencia")
  }
  return bien(valor)
}

/**
 * El cuerpo que identifica una propuesta: de qué plan y de qué fecha.
 *
 * La fecha es la **prevista**, la que el plan proponía, y no la del movimiento:
 * confirmar corrigiendo la fecha igual cierra esa propuesta.
 */
function validarPropuesta(cuerpo) {
  const errores = []

  const id = String(cuerpo?.recurrenciaId ?? '').trim()
  if (!UUID.test(id)) errores.push("El campo 'recurrenciaId' tiene que ser el uuid de una recurrencia")

  const fecha = String(cuerpo?.fecha ?? '').trim()
  if (!esFechaIso(fecha)) errores.push("El campo 'fecha' tiene que ser una fecha real en AAAA-MM-DD")

  if (errores.length > 0) return { ok: false, errores, valor: null }

  return bien({ recurrenciaId: id, fecha })
}

/**
 * La zona con la que se resuelve el "hoy" de las propuestas.
 *
 * Una zona que no existe no rechaza el pedido: advierte y cae al default, igual
 * que `registrarMovimiento`. Si rechazara, un dispositivo con la zona mal
 * configurada dejaría al usuario sin ver ninguna propuesta.
 */
function zonaDelPedido(valor, porDefecto) {
  if (!valor) return { zona: porDefecto, advertencias: [] }
  if (esZonaValida(valor)) return { zona: String(valor), advertencias: [] }
  return {
    zona: porDefecto,
    advertencias: [`Zona horaria "${valor}" no reconocida, se usó ${porDefecto}`],
  }
}

module.exports = { validarIdDeRecurrencia, validarPropuesta, zonaDelPedido }
