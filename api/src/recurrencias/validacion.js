/**
 * Validación de los parámetros de las rutas de recurrencias.
 *
 * Lo que valida una regla del dominio —qué frecuencias existen, qué campos
 * tiene un plan, si una fecha es real— está en `@saldai/core/recurrencias`,
 * porque significa lo mismo en la app. Acá queda solo lo que es de la ruta: la
 * forma de los identificadores y de los parámetros.
 */

const {
  aIsoCivil,
  desdeIsoCivil,
  esFechaIso,
  esZonaValida,
  sumarDias,
} = require('@saldai/core')

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

/**
 * Un año y pico de propuestas por delante. El tope existe porque las
 * ocurrencias se derivan una por una: un `hasta` de 2099 en una recurrencia
 * diaria son decenas de miles de fechas calculadas para una respuesta que nadie
 * puede leer.
 */
const DIAS_MAXIMOS_POR_DELANTE = 400

/**
 * Hasta qué fecha proponer.
 *
 * `hasta` solo **estira** la ventana hacia adelante: un valor anterior a hoy se
 * ignora y queda hoy. Es lo que deja al cliente pedir "el mes que estoy
 * mirando" sin tener que acordarse de incluir lo atrasado — y lo atrasado es
 * justo lo que el usuario se está olvidando, así que una ventana que lo pueda
 * recortar es una forma de perderlo.
 *
 * Una fecha que no se entiende advierte y cae a hoy, por lo mismo que la zona:
 * dejar al usuario sin ninguna propuesta es peor que mostrarle menos de las que
 * pidió.
 */
function hastaDelPedido(valor, hoy) {
  if (!valor) return { hasta: hoy, advertencias: [] }

  const pedido = String(valor).trim()
  if (!esFechaIso(pedido)) {
    return {
      hasta: hoy,
      advertencias: [`Fecha "${pedido}" no reconocida en 'hasta', se usó ${hoy}`],
    }
  }

  if (pedido <= hoy) return { hasta: hoy, advertencias: [] }

  const tope = aIsoCivil(sumarDias(desdeIsoCivil(hoy), DIAS_MAXIMOS_POR_DELANTE))
  if (pedido > tope) {
    return {
      hasta: tope,
      advertencias: [`'hasta' no puede pasar de ${tope}, se usó esa fecha`],
    }
  }

  return { hasta: pedido, advertencias: [] }
}

module.exports = {
  hastaDelPedido,
  validarIdDeRecurrencia,
  validarPropuesta,
  zonaDelPedido,
}
