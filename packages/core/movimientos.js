/**
 * El registro de un movimiento: el único punto de entrada de escritura.
 *
 * Antes la API y mobile llamaban `parsearGasto` cada una por su cuenta y
 * resolvían el "hoy" con su propia zona: la API con `APP_TIMEZONE` y mobile sin
 * pasar ninguna, o sea con el default. Las dos asumían Chile, así que un
 * usuario en otra zona registraba un gasto con el día de Chile.
 *
 * Lo que agrega esta función sobre el parser es **el contexto con el que se
 * decidió**: la zona y el día que se usó como referencia para resolver "hoy",
 * "ayer" o "lunes". Sin eso, re-derivar un movimiento desde su texto original
 * da otra fecha, porque el parser resuelve lo relativo contra el momento en que
 * corre: sobre los 73 movimientos de producción, 45 (62%) salían con la fecha
 * equivocada. Guardar el contexto lo vuelve reproducible por construcción.
 */

const { parsearGasto } = require('./parser')
const { hoyCivil, ZONA_DEFECTO } = require('./fechas-humanas')

/**
 * Si `Intl` no sabe de la zona, construir el formateador tira RangeError. Es la
 * única forma de validar un nombre IANA sin traerse la lista entera.
 */
function esZonaValida(zona) {
  if (typeof zona !== 'string' || !zona.trim()) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zona })
    return true
  } catch {
    return false
  }
}

/** Una fecha civil a AAAA-MM-DD, el formato de la columna `date`. */
function aIso(fecha) {
  const dd = String(fecha.getUTCDate()).padStart(2, '0')
  const mm = String(fecha.getUTCMonth() + 1).padStart(2, '0')
  return `${fecha.getUTCFullYear()}-${mm}-${dd}`
}

/**
 * Parsea el texto y devuelve, además del resultado, el contexto que usó.
 *
 * Una zona que no existe **no rechaza el movimiento**: advierte y cae al
 * default. Es la misma decisión que toma el parser con un método o una fecha que
 * no reconoce, y evita que un dispositivo con la zona mal configurada deje al
 * usuario sin poder registrar nada.
 *
 * @param {string} input
 * @param {{ zona?: string, hoy?: Date }} [opciones] - `hoy` solo para los tests.
 */
function registrarMovimiento(input, opciones = {}) {
  const advertencias = []
  let zona = ZONA_DEFECTO

  if (opciones.zona !== undefined && opciones.zona !== null && opciones.zona !== '') {
    if (esZonaValida(opciones.zona)) {
      zona = opciones.zona
    } else {
      advertencias.push(`Zona horaria "${opciones.zona}" no reconocida, se usó ${ZONA_DEFECTO}`)
    }
  }

  const hoy = opciones.hoy ?? hoyCivil(zona)
  const resultado = parsearGasto(input, { zona, hoy })

  return {
    ...resultado,
    advertencias: [...advertencias, ...resultado.advertencias],
    // Lo que hay que guardar para que el movimiento se pueda volver a derivar.
    contexto: { zona, hoyResuelto: aIso(hoy) },
  }
}

module.exports = { registrarMovimiento, esZonaValida }
