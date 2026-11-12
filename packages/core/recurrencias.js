/**
 * Recurrencia con confirmación: el plan propone, confirmar crea el movimiento.
 *
 * Vive en el core porque las dos puntas tienen que proponer **lo mismo**: la
 * API resuelve las propuestas pendientes y la app las muestra y las confirma.
 * Si el cálculo del día estuviera en la API, la app no podría decir "el 31 de
 * febrero cae el 28" sin preguntar, y si estuviera en la app cada cliente
 * tendría su propia idea de qué se le debe al usuario.
 *
 * **Una propuesta pendiente es la ausencia de una decisión.** No hay tabla de
 * propuestas y no hay movimientos con estado: las fechas se derivan del plan y
 * lo único guardado es la decisión ya tomada sobre una fecha concreta. Con
 * `estado = 'pendiente'` en la tabla de movimientos, toda consulta que suma
 * tendría que filtrar, y un olvido infla el total sin dar ningún error.
 *
 * El plan se recibe con la forma de la fila (`vigente_desde`, no
 * `vigenteDesde`), igual que `fueEditadoAMano` con `campos_editados`: la API
 * devuelve la fila entera y la app la consume tal cual, así que un solo nombre
 * por campo es un lugar menos donde equivocarse. Lo que se escribe sí va con
 * los nombres del dominio y lo traduce el repositorio.
 */

const { SIN_CATEGORIA, TODAS_LAS_CATEGORIAS } = require('./categorias')
const { METODO_DEFAULT, esMetodoValido } = require('./metodos')
const { formatearMonto } = require('./dinero')
const { aIsoCivil, civil, desdeIsoCivil, diasEnMes, sumarDias } = require('./fechas-humanas')
const { esFechaIso, LARGO_MAXIMO_ITEM, LARGO_MAXIMO_NOTAS } = require('./ediciones')
const { registrarMovimiento } = require('./movimientos')

/** Las frecuencias que un plan puede tener. */
const FRECUENCIAS = Object.freeze(['semanal', 'mensual', 'anual'])

/**
 * Tope de ocurrencias por plan en una sola derivación.
 *
 * Un plan semanal anclado hace diez años son más de quinientas fechas, y
 * calcularlas todas para mostrar las que faltan confirmar no le sirve a nadie:
 * lo que el usuario necesita ver es lo que tiene pendiente, no la historia. El
 * tope evita que una fecha ancla absurda —un dedazo en el año— se convierta en
 * un bucle largo del lado del servidor.
 */
const MAXIMO_DE_OCURRENCIAS = 500

const bien = (valor) => ({ ok: true, errores: [], ...valor })

/**
 * La ocurrencia número `n` de un plan, contando la primera como 0.
 *
 * Siempre se calcula **desde el ancla** y no desde la ocurrencia anterior. Con
 * el cálculo incremental, un plan mensual anclado un 31 se recorta a 28 en
 * febrero y de ahí en adelante propone el 28 para siempre: el día se pierde en
 * el primer mes corto y no vuelve. Desde el ancla, febrero cae el 28 y marzo
 * vuelve al 31, que es lo que el usuario quiso decir.
 */
function ocurrenciaNumero(plan, n) {
  const ancla = desdeIsoCivil(plan.vigente_desde)
  if (!ancla) return null

  const dia = ancla.getUTCDate()
  const mes = ancla.getUTCMonth() + 1
  const anio = ancla.getUTCFullYear()

  if (plan.frecuencia === 'semanal') return sumarDias(ancla, 7 * n)

  if (plan.frecuencia === 'mensual') {
    const total = mes - 1 + n
    const anioDestino = anio + Math.floor(total / 12)
    const mesDestino = (total % 12) + 1
    // Un 31 en un mes de 30 cae el 30: saltear el mes haría desaparecer el
    // arriendo de febrero, que es justo el caso de uso de un plan mensual.
    return civil(anioDestino, mesDestino, Math.min(dia, diasEnMes(anioDestino, mesDestino)))
  }

  if (plan.frecuencia === 'anual') {
    const anioDestino = anio + n
    // Lo mismo con el 29 de febrero en un año que no es bisiesto.
    return civil(anioDestino, mes, Math.min(dia, diasEnMes(anioDestino, mes)))
  }

  return null
}

/**
 * Las fechas que el plan propone hasta `hasta` inclusive, en AAAA-MM-DD.
 *
 * `hasta` lo pone quien llama y no es "para siempre" a propósito: proponer
 * fechas futuras llenaría la pantalla de cosas que todavía no pasaron, y la
 * confirmación existe para registrar lo que ya ocurrió.
 */
function ocurrenciasDelPlan(plan, { hasta }) {
  const limite = desdeIsoCivil(hasta)
  const ancla = desdeIsoCivil(plan?.vigente_desde)
  if (!limite || !ancla || !FRECUENCIAS.includes(plan.frecuencia)) return []

  const fin = plan.vigente_hasta ? desdeIsoCivil(plan.vigente_hasta) : null
  const tope = fin && fin.getTime() < limite.getTime() ? fin : limite

  const fechas = []
  for (let n = 0; n < MAXIMO_DE_OCURRENCIAS; n++) {
    const fecha = ocurrenciaNumero(plan, n)
    if (!fecha || fecha.getTime() > tope.getTime()) break
    fechas.push(aIsoCivil(fecha))
  }

  return fechas
}

/** `true` si esa fecha es una de las que el plan propone. */
function esOcurrenciaDelPlan(plan, fecha) {
  if (!esFechaIso(fecha)) return false
  return ocurrenciasDelPlan(plan, { hasta: fecha }).includes(fecha)
}

/**
 * Las propuestas que el usuario todavía no decidió, de la más vieja a la más
 * nueva.
 *
 * Lo más viejo primero y no lo más nuevo: una propuesta vieja sin decidir es
 * precisamente la que se está olvidando, así que es la que tiene que quedar
 * arriba.
 *
 * @param {object[]} planes - las filas de `recurrencias` del perfil.
 * @param {{ recurrenciaId: string, fecha: string }[]} decisiones - las fechas ya decididas.
 * @param {{ hasta: string }} opciones
 */
function propuestasPendientes(planes, decisiones, { hasta }) {
  const decididas = new Set(
    (decisiones ?? []).map((d) => `${d.recurrenciaId}|${d.fecha}`)
  )

  const propuestas = []
  for (const plan of planes ?? []) {
    for (const fecha of ocurrenciasDelPlan(plan, { hasta })) {
      if (decididas.has(`${plan.id}|${fecha}`)) continue
      propuestas.push({ recurrenciaId: plan.id, fecha, plan })
    }
  }

  return propuestas.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0))
}

/**
 * El movimiento que crearía confirmar una propuesta, con los cambios que el
 * usuario haya hecho antes de confirmar ("editar solo esta vez").
 *
 * `camposEditados` sale de comparar contra el plan y no de lo que el cuerpo
 * trajo: mandar el monto igual al del plan no es una corrección, y marcarlo
 * dejaría la fila excluida de un reclasificar masivo sin que el usuario haya
 * cambiado nada. Es la misma regla que el `PATCH` de un movimiento.
 *
 * @param {object} plan - la fila del plan.
 * @param {string} fechaPrevista - la fecha que el plan proponía.
 * @param {Record<string, unknown>} campos - los campos ya validados que cambian.
 */
function movimientoDeLaPropuesta(plan, fechaPrevista, campos = {}) {
  const base = {
    monto: plan.monto,
    montoFormateado: plan.monto_formateado,
    item: plan.item,
    categoria: plan.categoria ?? SIN_CATEGORIA,
    categoriaSrc: plan.categoria_src ?? 'ninguna',
    metodo: plan.metodo ?? METODO_DEFAULT,
    fecha: fechaPrevista,
    notas: plan.notas ?? null,
  }

  const movimiento = { ...base }
  const camposEditados = []

  for (const campo of ['monto', 'item', 'categoria', 'metodo', 'fecha', 'notas']) {
    if (!(campo in campos)) continue
    // `notas` vacías y `null` son lo mismo, como en la edición: las dos
    // significan "no tiene nota", así que pasar de una a la otra no es cambio.
    const nuevo = campo === 'notas' ? (campos.notas || null) : campos[campo]
    if (nuevo === base[campo]) continue

    movimiento[campo] = nuevo
    if (campo === 'monto' && 'montoFormateado' in campos) {
      movimiento.montoFormateado = campos.montoFormateado
    }
    if (campo === 'categoria' && 'categoriaSrc' in campos) {
      movimiento.categoriaSrc = campos.categoriaSrc
    }
    camposEditados.push(campo)
  }

  return { movimiento, camposEditados }
}

function validarFrecuencia(frecuencia) {
  return FRECUENCIAS.includes(frecuencia)
}

/**
 * Valida la creación de un plan a partir de la línea que escribió el usuario.
 *
 * El plan se escribe con el mismo lenguaje que un movimiento —"525457,
 * arriendo, basicos, 1/12/2026, tc"— y lo lee `registrarMovimiento`, que es el
 * único punto de entrada de escritura: así una categoría o un método
 * significan lo mismo en un plan que en un movimiento, y la fecha de la línea
 * es el ancla de la recurrencia. La diferencia es que esto **no registra
 * nada**: deja escrito qué se va a proponer.
 *
 * @param {Record<string, unknown>} entrada
 * @param {{ zona?: string, hoy?: Date }} [opciones]
 */
function validarPlanDeRecurrencia(entrada, opciones = {}) {
  const errores = []

  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) {
    return {
      ok: false,
      errores: ['El cuerpo tiene que ser un objeto'],
      advertencias: [],
      plan: null,
      errorDeLectura: false,
    }
  }

  if (!validarFrecuencia(entrada.frecuencia)) {
    errores.push(`El campo 'frecuencia' tiene que ser una de: ${FRECUENCIAS.join(', ')}`)
  }

  const lectura = registrarMovimiento(entrada.input, opciones)
  if (!lectura.ok) errores.push(...lectura.errores)

  // La fecha de la línea es el ancla, salvo que venga una explícita: el
  // usuario puede escribir el plan hoy y querer que empiece el 1.
  let vigenteDesde = lectura.datos?.fecha ?? null
  if (entrada.desde !== undefined && entrada.desde !== null && entrada.desde !== '') {
    if (!esFechaIso(entrada.desde)) {
      errores.push("El campo 'desde' tiene que ser una fecha real en AAAA-MM-DD")
    } else {
      vigenteDesde = String(entrada.desde).trim()
    }
  }

  let vigenteHasta = null
  if (entrada.hasta !== undefined && entrada.hasta !== null && entrada.hasta !== '') {
    if (!esFechaIso(entrada.hasta)) {
      errores.push("El campo 'hasta' tiene que ser una fecha real en AAAA-MM-DD")
    } else {
      vigenteHasta = String(entrada.hasta).trim()
    }
  }

  if (vigenteDesde && vigenteHasta && vigenteHasta < vigenteDesde) {
    errores.push("El campo 'hasta' no puede ser anterior a cuando empieza el plan")
  }

  let notas = null
  if (entrada.notas !== undefined && entrada.notas !== null && entrada.notas !== '') {
    if (typeof entrada.notas !== 'string') {
      errores.push("El campo 'notas' tiene que ser texto")
    } else if (entrada.notas.length > LARGO_MAXIMO_NOTAS) {
      errores.push(`El campo 'notas' no puede pasar de ${LARGO_MAXIMO_NOTAS} caracteres`)
    } else {
      notas = entrada.notas.trim()
    }
  }

  // `errorDeLectura` separa "el cuerpo está mal" de "la línea no se pudo
  // leer": lo primero es un 400 y lo segundo un 422, igual que en `POST
  // /movimientos`. Sin el dato, la ruta tendría que adivinar mirando los mensajes.
  if (errores.length > 0) {
    return {
      ok: false,
      errores,
      advertencias: lectura.advertencias,
      plan: null,
      errorDeLectura: !lectura.ok,
    }
  }

  return bien({
    advertencias: lectura.advertencias,
    errorDeLectura: false,
    plan: {
      monto: lectura.datos.monto,
      montoFormateado: lectura.datos.montoFormateado,
      item: lectura.datos.item,
      categoria: lectura.datos.categoria,
      categoriaSrc: lectura.datos.categoriaSrc,
      metodo: lectura.datos.metodo,
      notas,
      frecuencia: entrada.frecuencia,
      vigenteDesde,
      vigenteHasta,
      inputOriginal: String(entrada.input),
      zona: lectura.contexto.zona,
      hoyResuelto: lectura.contexto.hoyResuelto,
    },
  })
}

/** Los campos de un plan que se pueden cambiar. */
const CAMPOS_DEL_PLAN = Object.freeze([
  'monto', 'item', 'categoria', 'metodo', 'notas', 'frecuencia', 'hasta',
])

/**
 * Valida un "editar de aquí en adelante": qué cambia y desde qué fecha.
 *
 * `desde` es obligatorio porque es lo que distingue esta acción de las otras
 * tres. Sin él habría que elegir un default —hoy, o el comienzo del plan— y las
 * dos opciones cambian en silencio lo que el usuario pidió: una le deja las
 * propuestas viejas con el valor nuevo y la otra reescribe el plan entero.
 *
 * Lo ya confirmado no se toca nunca, y eso no es una regla de esta función:
 * las ocurrencias confirmadas son filas de `movimientos` y acá no se mira ninguna.
 *
 * @param {object} plan - la fila del plan como está.
 * @param {Record<string, unknown>} cambio
 */
function validarCambioDePlan(plan, cambio) {
  const errores = []

  if (!cambio || typeof cambio !== 'object' || Array.isArray(cambio)) {
    return { ok: false, errores: ['El cuerpo tiene que ser un objeto con los campos a cambiar'], plan: null, desde: null }
  }

  const desconocidos = Object.keys(cambio).filter(
    (c) => c !== 'desde' && !CAMPOS_DEL_PLAN.includes(c)
  )
  if (desconocidos.length > 0) {
    errores.push(`Campos que no se pueden cambiar: ${desconocidos.join(', ')}`)
  }

  if (!esFechaIso(cambio.desde)) {
    errores.push("El campo 'desde' tiene que ser una fecha real en AAAA-MM-DD")
  }

  const siguiente = {
    monto: plan.monto,
    montoFormateado: plan.monto_formateado,
    item: plan.item,
    categoria: plan.categoria,
    categoriaSrc: plan.categoria_src,
    metodo: plan.metodo,
    notas: plan.notas ?? null,
    frecuencia: plan.frecuencia,
    vigenteHasta: plan.vigente_hasta ?? null,
  }

  let algoCambia = false

  if ('monto' in cambio) {
    if (!Number.isInteger(cambio.monto) || cambio.monto <= 0) {
      errores.push("El campo 'monto' debe ser un número entero mayor que 0")
    } else if (cambio.monto !== siguiente.monto) {
      siguiente.monto = cambio.monto
      // El formateado es un derivado del monto y se recalcula acá, igual que en
      // la edición: aceptarlo del cuerpo permitiría guardar "$1" sobre 50000.
      siguiente.montoFormateado = formatearMonto(cambio.monto)
      algoCambia = true
    }
  }

  if ('item' in cambio) {
    const item = typeof cambio.item === 'string' ? cambio.item.trim() : ''
    if (!item) errores.push("El campo 'item' no puede quedar vacío")
    else if (item.length > LARGO_MAXIMO_ITEM) {
      errores.push(`El campo 'item' no puede pasar de ${LARGO_MAXIMO_ITEM} caracteres`)
    } else if (item !== siguiente.item) {
      siguiente.item = item
      algoCambia = true
    }
  }

  if ('categoria' in cambio) {
    if (!TODAS_LAS_CATEGORIAS.includes(cambio.categoria)) {
      errores.push(`El campo 'categoria' tiene que ser una de: ${TODAS_LAS_CATEGORIAS.join(', ')}`)
    } else if (cambio.categoria !== siguiente.categoria) {
      siguiente.categoria = cambio.categoria
      siguiente.categoriaSrc = cambio.categoria === SIN_CATEGORIA ? 'ninguna' : 'campo'
      algoCambia = true
    }
  }

  if ('metodo' in cambio) {
    if (!esMetodoValido(cambio.metodo)) {
      errores.push("El campo 'metodo' no es un método de pago válido")
    } else if (cambio.metodo !== siguiente.metodo) {
      siguiente.metodo = cambio.metodo
      algoCambia = true
    }
  }

  if ('notas' in cambio) {
    const notas = cambio.notas
    if (notas === null || notas === '') {
      if (siguiente.notas !== null) {
        siguiente.notas = null
        algoCambia = true
      }
    } else if (typeof notas !== 'string') {
      errores.push("El campo 'notas' tiene que ser texto")
    } else if (notas.length > LARGO_MAXIMO_NOTAS) {
      errores.push(`El campo 'notas' no puede pasar de ${LARGO_MAXIMO_NOTAS} caracteres`)
    } else if (notas.trim() !== siguiente.notas) {
      siguiente.notas = notas.trim()
      algoCambia = true
    }
  }

  if ('frecuencia' in cambio) {
    if (!validarFrecuencia(cambio.frecuencia)) {
      errores.push(`El campo 'frecuencia' tiene que ser una de: ${FRECUENCIAS.join(', ')}`)
    } else if (cambio.frecuencia !== siguiente.frecuencia) {
      siguiente.frecuencia = cambio.frecuencia
      algoCambia = true
    }
  }

  // `hasta` en null es "sin fin", que es un cambio válido sobre un plan que
  // tenía fecha de término.
  if ('hasta' in cambio) {
    const hasta = cambio.hasta
    if (hasta === null || hasta === '') {
      if (siguiente.vigenteHasta !== null) {
        siguiente.vigenteHasta = null
        algoCambia = true
      }
    } else if (!esFechaIso(hasta)) {
      errores.push("El campo 'hasta' tiene que ser una fecha real en AAAA-MM-DD")
    } else if (String(hasta).trim() !== siguiente.vigenteHasta) {
      siguiente.vigenteHasta = String(hasta).trim()
      algoCambia = true
    }
  }

  if (
    errores.length === 0 &&
    siguiente.vigenteHasta &&
    esFechaIso(cambio.desde) &&
    siguiente.vigenteHasta < String(cambio.desde).trim()
  ) {
    errores.push("El campo 'hasta' no puede ser anterior a 'desde'")
  }

  if (errores.length === 0 && !algoCambia) {
    errores.push(`Hay que mandar al menos un campo a cambiar: ${CAMPOS_DEL_PLAN.join(', ')}`)
  }

  if (errores.length > 0) return { ok: false, errores, plan: null, desde: null }

  return bien({ plan: siguiente, desde: String(cambio.desde).trim() })
}

/** `true` si el plan sigue proponiendo fechas al día `hoy`. */
function planVigente(plan, hoy) {
  return !plan?.vigente_hasta || plan.vigente_hasta >= hoy
}

module.exports = {
  FRECUENCIAS,
  CAMPOS_DEL_PLAN,
  MAXIMO_DE_OCURRENCIAS,
  ocurrenciaNumero,
  ocurrenciasDelPlan,
  esOcurrenciaDelPlan,
  propuestasPendientes,
  movimientoDeLaPropuesta,
  validarFrecuencia,
  validarPlanDeRecurrencia,
  validarCambioDePlan,
  planVigente,
}
