/**
 * Métodos de pago.
 *
 * Solo existen dos, EF (efectivo) y TC (tarjeta de crédito), y TC es el default
 * porque es con lo que se paga casi todo. La API los normalizaba por su cuenta
 * y las interfaces tenían los strings escritos a mano en los botones.
 */

const EFECTIVO = 'EF'
const TARJETA = 'TC'

const METODO_DEFAULT = TARJETA

/** Los métodos que un gasto puede tener guardados, en el orden en que se muestran. */
const METODOS_VALIDOS = Object.freeze([EFECTIVO, TARJETA])

/** Cómo puede escribirlos el usuario al capturar en texto. */
const ALIAS_METODOS = {
  ef: EFECTIVO,
  efectivo: EFECTIVO,
  cash: EFECTIVO,
  tc: TARJETA,
  tarjeta: TARJETA,
  credito: TARJETA,
  crédito: TARJETA,
  'tarjeta de credito': TARJETA,
  'tarjeta de crédito': TARJETA,
}

/** Nombre largo, para mostrar donde quepa. */
const NOMBRES_METODOS = {
  [EFECTIVO]: 'Efectivo',
  [TARJETA]: 'Tarjeta de crédito',
}

/**
 * Normaliza lo que escribió el usuario. Nunca falla: si no se reconoce, asume
 * el default y devuelve una advertencia, porque el método es el campo menos
 * importante del gasto y no vale la pena rechazarlo entero por eso.
 *
 * @returns {{ metodo: string, advertencia?: string }}
 */
function normalizarMetodo(raw) {
  if (!raw || !raw.trim()) {
    return { metodo: METODO_DEFAULT, advertencia: `Método no especificado, se asumió ${METODO_DEFAULT}` }
  }

  const metodo = ALIAS_METODOS[raw.trim().toLowerCase()]

  if (!metodo) {
    return { metodo: METODO_DEFAULT, advertencia: `Método "${raw}" no reconocido, se asumió ${METODO_DEFAULT}` }
  }

  return { metodo }
}

function esMetodoValido(metodo) {
  return METODOS_VALIDOS.includes(metodo)
}

module.exports = {
  EFECTIVO,
  TARJETA,
  METODO_DEFAULT,
  METODOS_VALIDOS,
  ALIAS_METODOS,
  NOMBRES_METODOS,
  normalizarMetodo,
  esMetodoValido,
}
