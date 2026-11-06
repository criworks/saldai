/**
 * La edición a mano de un movimiento: qué se puede cambiar y qué queda marcado.
 *
 * Vive en el core y no en la API porque significa lo mismo en las dos puntas:
 * la API valida el `PATCH` con esto y mobile deshabilita el botón de guardar
 * con esto, así que el largo máximo de una nota o el monto mínimo no pueden
 * decir una cosa en el servidor y otra en la pantalla.
 *
 * Lo que distingue una edición de un alta es que acá **no corre el parser**: el
 * usuario ya no está escribiendo una línea, está corrigiendo campos sueltos.
 * `input_original` queda como estaba, porque sigue siendo lo que la persona
 * escribió; lo que cambia es el movimiento que se derivó de él, y por eso hay
 * que anotar qué campos ya no se pueden volver a derivar (`editados`).
 */

const { TODAS_LAS_CATEGORIAS, SIN_CATEGORIA } = require('./categorias')
const { esMetodoValido } = require('./metodos')
const { formatearMonto } = require('./dinero')

/** Los campos que el usuario puede corregir. El orden es el de la pantalla. */
const CAMPOS_EDITABLES = Object.freeze(['monto', 'item', 'categoria', 'metodo', 'fecha', 'notas'])

/**
 * Topes de largo. El cuerpo de la API está limitado a 10kb, así que un texto
 * sin tope no tumba nada; están para que la fila siga siendo legible en una
 * lista y para que el error lo dé la validación y no el límite del cuerpo, que
 * responde 413 sin decir qué campo fue.
 */
const LARGO_MAXIMO_ITEM = 120
const LARGO_MAXIMO_NOTAS = 500

/** Una fecha es válida si existe de verdad: el 31/02 no pasa. */
function esFechaIso(valor) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor ?? '').trim())
  if (!partes) return false

  const [, anio, mes, dia] = partes.map(Number)
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  return (
    fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia
  )
}

/**
 * Valida un cambio y lo deja listo para guardar.
 *
 * Devuelve `campos` con los nombres del dominio (los traduce a columnas el
 * repositorio de la API) y `editados` con los nombres de los campos que el
 * cambio toca, que es lo que se guarda en `campos_editados` para que un
 * reclasificar masivo no pise una corrección del usuario.
 *
 * Un cambio vacío no es un cambio: se rechaza en vez de escribir una fila igual
 * y marcarla como editada, que la dejaría excluida de futuros reclasificares
 * sin que el usuario haya corregido nada.
 *
 * @param {Record<string, unknown>} cambio - solo los campos que cambian.
 */
function validarCambioDeMovimiento(cambio) {
  const errores = []
  const campos = {}
  const editados = []

  if (!cambio || typeof cambio !== 'object' || Array.isArray(cambio)) {
    return { ok: false, errores: ['El cuerpo tiene que ser un objeto con los campos a cambiar'], campos: {}, editados: [] }
  }

  const desconocidos = Object.keys(cambio).filter((c) => !CAMPOS_EDITABLES.includes(c))
  if (desconocidos.length > 0) {
    errores.push(`Campos que no se pueden editar: ${desconocidos.join(', ')}`)
  }

  if ('monto' in cambio) {
    const monto = cambio.monto
    if (!Number.isInteger(monto) || monto <= 0) {
      errores.push("El campo 'monto' debe ser un número entero mayor que 0")
    } else {
      campos.monto = monto
      // El formateado se recalcula y no se recibe del cliente: es un derivado
      // del monto, y aceptarlo del cuerpo permitiría guardar "$1" sobre 50000.
      campos.montoFormateado = formatearMonto(monto)
      editados.push('monto')
    }
  }

  if ('item' in cambio) {
    const item = typeof cambio.item === 'string' ? cambio.item.trim() : ''
    if (!item) {
      errores.push("El campo 'item' no puede quedar vacío")
    } else if (item.length > LARGO_MAXIMO_ITEM) {
      errores.push(`El campo 'item' no puede pasar de ${LARGO_MAXIMO_ITEM} caracteres`)
    } else {
      campos.item = item
      editados.push('item')
    }
  }

  if ('categoria' in cambio) {
    if (!TODAS_LAS_CATEGORIAS.includes(cambio.categoria)) {
      errores.push(`El campo 'categoria' tiene que ser una de: ${TODAS_LAS_CATEGORIAS.join(', ')}`)
    } else {
      campos.categoria = cambio.categoria
      // De dónde salió la categoría: elegida a mano es 'campo', igual que
      // cuando viene escrita en la línea. Dejarla en 'item' diría que la
      // dedujo el parser, que es justo lo que el usuario vino a corregir.
      campos.categoriaSrc = cambio.categoria === SIN_CATEGORIA ? 'ninguna' : 'campo'
      editados.push('categoria')
    }
  }

  if ('metodo' in cambio) {
    if (!esMetodoValido(cambio.metodo)) {
      errores.push("El campo 'metodo' no es un método de pago válido")
    } else {
      campos.metodo = cambio.metodo
      editados.push('metodo')
    }
  }

  if ('fecha' in cambio) {
    if (!esFechaIso(cambio.fecha)) {
      errores.push("El campo 'fecha' tiene que ser una fecha real en AAAA-MM-DD")
    } else {
      campos.fecha = String(cambio.fecha).trim()
      editados.push('fecha')
    }
  }

  if ('notas' in cambio) {
    const notas = cambio.notas
    if (notas === null || notas === '') {
      // Vaciar la nota es borrarla: se guarda null y no '' para que "no tiene
      // nota" sea un solo valor y no dos que se ven igual.
      campos.notas = null
      editados.push('notas')
    } else if (typeof notas !== 'string') {
      errores.push("El campo 'notas' tiene que ser texto")
    } else if (notas.length > LARGO_MAXIMO_NOTAS) {
      errores.push(`El campo 'notas' no puede pasar de ${LARGO_MAXIMO_NOTAS} caracteres`)
    } else {
      campos.notas = notas.trim()
      editados.push('notas')
    }
  }

  if (errores.length === 0 && editados.length === 0) {
    errores.push(`Hay que mandar al menos un campo a cambiar: ${CAMPOS_EDITABLES.join(', ')}`)
  }

  if (errores.length > 0) return { ok: false, errores, campos: {}, editados: [] }

  return { ok: true, errores: [], campos, editados }
}

/**
 * La unión de lo que ya estaba marcado con lo que acaba de cambiar.
 *
 * Es unión y no reemplazo: si el usuario corrigió la categoría en marzo y el
 * monto hoy, las dos correcciones siguen siendo suyas.
 */
function unirCamposEditados(previos, nuevos) {
  const todos = [...(Array.isArray(previos) ? previos : []), ...nuevos]
  return CAMPOS_EDITABLES.filter((campo) => todos.includes(campo))
}

/** `true` si ese campo del movimiento lo corrigió el usuario a mano. */
function fueEditadoAMano(movimiento, campo) {
  return Array.isArray(movimiento?.campos_editados) && movimiento.campos_editados.includes(campo)
}

module.exports = {
  CAMPOS_EDITABLES,
  LARGO_MAXIMO_ITEM,
  LARGO_MAXIMO_NOTAS,
  esFechaIso,
  validarCambioDeMovimiento,
  unirCamposEditados,
  fueEditadoAMano,
}
