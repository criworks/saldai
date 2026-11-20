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
const {
  aIsoCivil,
  civil,
  desdeIsoCivil,
  diasEnMes,
  nEsimoDiaDeLaSemana,
  sumarDias,
} = require('./fechas-humanas')
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
 * El día dentro de un mes concreto, según la regla del plan.
 *
 * Dos formas excluyentes, y es `validarRepeticion` quien impide que vengan las
 * dos: un día del calendario ("el 2"), o un día de la semana en una semana del
 * mes ("el último viernes").
 */
function diaDelMesDelPlan(plan, ancla, anio, mes) {
  if (plan.dia_de_la_semana !== null && plan.dia_de_la_semana !== undefined) {
    return nEsimoDiaDeLaSemana(anio, mes, plan.dia_de_la_semana, plan.semana_del_mes ?? 1)
  }

  const dia = plan.dia_del_mes ?? ancla.getUTCDate()
  // Un 31 en un mes de 30 cae el 30: saltear el mes haría desaparecer el
  // arriendo de febrero, que es justo el caso de uso de un plan mensual. Lo
  // mismo con el 29 de febrero en un año que no es bisiesto.
  return civil(anio, mes, Math.min(dia, diasEnMes(anio, mes)))
}

/**
 * La fecha que la regla pone en el período `k`, contando el período del ancla
 * como 0: la semana del ancla, su mes o su año.
 *
 * Es un período y no una ocurrencia: el período del ancla puede caer antes del
 * ancla —"los viernes" con el ancla un sábado— y entonces no es una ocurrencia
 * de nada. De eso se encarga `ocurrenciaNumero`.
 */
function fechaDelPeriodo(plan, ancla, k) {
  const mes = ancla.getUTCMonth() + 1
  const anio = ancla.getUTCFullYear()

  if (plan.frecuencia === 'semanal') {
    const dia = plan.dia_de_la_semana ?? ancla.getUTCDay()
    return sumarDias(ancla, ((dia - ancla.getUTCDay() + 7) % 7) + 7 * k)
  }

  if (plan.frecuencia === 'mensual') {
    const total = mes - 1 + k
    const anioDestino = anio + Math.floor(total / 12)
    return diaDelMesDelPlan(plan, ancla, anioDestino, (total % 12) + 1)
  }

  if (plan.frecuencia === 'anual') {
    return diaDelMesDelPlan(plan, ancla, anio + k, plan.mes_del_anio ?? mes)
  }

  return null
}

/**
 * La ocurrencia número `n` de un plan, contando la primera como 0.
 *
 * Siempre se calcula **desde el ancla** y no desde la ocurrencia anterior. Con
 * el cálculo incremental, un plan mensual anclado un 31 se recorta a 28 en
 * febrero y de ahí en adelante propone el 28 para siempre: el día se pierde en
 * el primer mes corto y no vuelve. Desde el ancla, febrero cae el 28 y marzo
 * vuelve al 31, que es lo que el usuario quiso decir.
 *
 * **La ocurrencia 0 es el ancla tal cual, cumpla la regla o no.** Un plan atado
 * a un movimiento cierra esa fecha como primera ocurrencia confirmada
 * (`fecha_prevista = vigente_desde`), así que si la regla pudiera mover la
 * ocurrencia 0 esa decisión quedaría apuntando a una fecha que el plan no
 * propone, y la propuesta real reaparecería como pendiente. La regla manda
 * desde la ocurrencia 1.
 *
 * **Las columnas de la regla en `null` significan "derivá del ancla"**, que es
 * lo que este cálculo hacía cuando no existían: un plan guardado antes de que
 * la regla existiera propone exactamente las mismas fechas.
 */
function ocurrenciaNumero(plan, n) {
  const ancla = desdeIsoCivil(plan?.vigente_desde)
  if (!ancla || !FRECUENCIAS.includes(plan.frecuencia)) return null
  if (n === 0) return ancla

  // Si el período del ancla ya quedó atrás —"los viernes" con el ancla un
  // sábado, o el 2 de cada mes con el ancla el 2— la cuenta arranca en el
  // período siguiente. Sin esto, la ocurrencia 1 podría caer antes del ancla.
  const primero = fechaDelPeriodo(plan, ancla, 0)
  const corrimiento = primero && primero.getTime() > ancla.getTime() ? 0 : 1

  return fechaDelPeriodo(plan, ancla, n - 1 + corrimiento)
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

/**
 * La primera fecha que el plan propone a partir de `desde`, inclusive. `null` si
 * el plan ya no propone ninguna.
 *
 * Es lo que hace falta para "editar de aquí en adelante" sin mover el día: el
 * `desde` de un cambio pasa a ser el ancla del plan que sigue, así que con "hoy"
 * el arriendo del 5 se muda al día en que a alguien le tocó editar el monto.
 * Con la próxima ocurrencia, el día se conserva y lo pendiente de antes queda
 * con los valores viejos, que es de lo que se trata la cadena.
 */
function proximaOcurrencia(plan, { desde }) {
  const limite = desdeIsoCivil(desde)
  if (!limite) return null

  const fin = plan?.vigente_hasta ? desdeIsoCivil(plan.vigente_hasta) : null

  for (let n = 0; n < MAXIMO_DE_OCURRENCIAS; n++) {
    const fecha = ocurrenciaNumero(plan, n)
    if (!fecha) return null
    if (fin && fecha.getTime() > fin.getTime()) return null
    if (fecha.getTime() >= limite.getTime()) return aIsoCivil(fecha)
  }

  return null
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

/** Los campos de la regla de repetición, con los nombres del dominio. */
const CAMPOS_DE_LA_REPETICION = Object.freeze([
  'diaDeLaSemana', 'semanaDelMes', 'diaDelMes', 'mesDelAnio',
])

/** La regla vacía: "derivá todo del ancla", que es el default. */
const SIN_REPETICION = Object.freeze({
  diaDeLaSemana: null,
  semanaDelMes: null,
  diaDelMes: null,
  mesDelAnio: null,
})

const enteroEntre = (valor, min, max) =>
  Number.isInteger(valor) && valor >= min && valor <= max

/**
 * Valida la regla de repetición de un plan contra su frecuencia.
 *
 * **El ancla dejó de ser la única fuente de la regla y pasó a ser su default.**
 * Hasta acá el día de la semana, el día del mes y el mes salían de
 * `vigente_desde` y no había forma de decir otra cosa; ahora el usuario puede,
 * y lo que gana es la regla. No es una contradicción con el ancla —la
 * migración de noviembre descartaba estas columnas justamente por eso— porque
 * está decidido quién gana: el ancla solo dice **desde cuándo**.
 *
 * Cada campo en `null` o ausente significa "derivá del ancla", así que una
 * regla vacía es el comportamiento de siempre.
 *
 * Las combinaciones sin sentido se rechazan acá y no se "arreglan": un
 * `semanaDelMes` sin día de la semana, o las dos formas del día del mes juntas,
 * son un cuerpo mal armado, y elegir una por él es esconder el bug del cliente.
 *
 * @param {unknown} entrada - `{ diaDeLaSemana?, semanaDelMes?, diaDelMes?, mesDelAnio? }`.
 * @param {string} frecuencia - la frecuencia con la que tiene que ser coherente.
 */
function validarRepeticion(entrada, frecuencia) {
  if (entrada === undefined || entrada === null) {
    return { ok: true, errores: [], repeticion: { ...SIN_REPETICION } }
  }

  if (typeof entrada !== 'object' || Array.isArray(entrada)) {
    return {
      ok: false,
      errores: ["El campo 'repeticion' tiene que ser un objeto"],
      repeticion: null,
    }
  }

  const errores = []
  const desconocidos = Object.keys(entrada).filter((c) => !CAMPOS_DE_LA_REPETICION.includes(c))
  if (desconocidos.length > 0) {
    errores.push(
      `Campos de 'repeticion' que no existen: ${desconocidos.join(', ')}. Son: ${CAMPOS_DE_LA_REPETICION.join(', ')}`
    )
  }

  const leer = (campo) => (entrada[campo] === undefined ? null : entrada[campo])
  const regla = {
    diaDeLaSemana: leer('diaDeLaSemana'),
    semanaDelMes: leer('semanaDelMes'),
    diaDelMes: leer('diaDelMes'),
    mesDelAnio: leer('mesDelAnio'),
  }

  if (regla.diaDeLaSemana !== null && !enteroEntre(regla.diaDeLaSemana, 0, 6)) {
    errores.push("El campo 'diaDeLaSemana' va de 0 (domingo) a 6 (sábado)")
  }
  // 1 a 4 y -1 ("la última"), sin 5: un quinto viernes no existe en todos los
  // meses, así que un plan así se saltearía meses enteros.
  if (regla.semanaDelMes !== null && !(enteroEntre(regla.semanaDelMes, 1, 4) || regla.semanaDelMes === -1)) {
    errores.push("El campo 'semanaDelMes' va de 1 a 4, o -1 para la última")
  }
  if (regla.diaDelMes !== null && !enteroEntre(regla.diaDelMes, 1, 31)) {
    errores.push("El campo 'diaDelMes' va de 1 a 31")
  }
  if (regla.mesDelAnio !== null && !enteroEntre(regla.mesDelAnio, 1, 12)) {
    errores.push("El campo 'mesDelAnio' va de 1 (enero) a 12 (diciembre)")
  }

  if (frecuencia === 'semanal') {
    const sobran = ['semanaDelMes', 'diaDelMes', 'mesDelAnio'].filter((c) => regla[c] !== null)
    if (sobran.length > 0) {
      errores.push(`Un plan semanal solo lleva 'diaDeLaSemana'; sobran: ${sobran.join(', ')}`)
    }
  } else if (frecuencia === 'mensual' || frecuencia === 'anual') {
    if (regla.diaDelMes !== null && regla.diaDeLaSemana !== null) {
      errores.push(
        "Hay que elegir una sola forma del día: 'diaDelMes', o 'diaDeLaSemana' con 'semanaDelMes'"
      )
    }
    if (regla.diaDeLaSemana !== null && regla.semanaDelMes === null) {
      errores.push("Con 'diaDeLaSemana' hace falta 'semanaDelMes'")
    }
    if (regla.semanaDelMes !== null && regla.diaDeLaSemana === null) {
      errores.push("El campo 'semanaDelMes' no significa nada sin 'diaDeLaSemana'")
    }
    if (frecuencia === 'mensual' && regla.mesDelAnio !== null) {
      errores.push("El campo 'mesDelAnio' solo vale en un plan anual")
    }
  }

  if (errores.length > 0) return { ok: false, errores, repeticion: null }

  return { ok: true, errores: [], repeticion: regla }
}

/** La regla de un plan tal como está guardada, con los nombres del dominio. */
function repeticionDelPlan(plan) {
  return {
    diaDeLaSemana: plan?.dia_de_la_semana ?? null,
    semanaDelMes: plan?.semana_del_mes ?? null,
    diaDelMes: plan?.dia_del_mes ?? null,
    mesDelAnio: plan?.mes_del_anio ?? null,
  }
}

/**
 * La parte de recurrencia de un movimiento: cada cuánto se repite y hasta
 * cuándo.
 *
 * Es lo mismo que un plan escrito a mano menos la línea: acá el qué y el
 * cuándo salen del movimiento, así que lo único que el usuario elige es la
 * frecuencia y, si quiere, una fecha de término. Vive al lado de
 * `validarPlanDeRecurrencia` y las dos comparten estas reglas en vez de
 * repetirlas: una regla escrita dos veces es una que se queda atrás.
 *
 * `desde` es el ancla contra la que se compara `hasta` —la fecha del
 * movimiento—, y es opcional porque al crear el movimiento y el plan de una
 * sola vez todavía no hay fila que mirar: ahí la coherencia la termina de
 * exigir la base.
 */
function validarRecurrenciaDeMovimiento(entrada, { desde } = {}) {
  const errores = []

  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) {
    return { ok: false, errores: ['El campo \'recurrencia\' tiene que ser un objeto'], recurrencia: null }
  }

  if (!validarFrecuencia(entrada.frecuencia)) {
    errores.push(`El campo 'frecuencia' tiene que ser una de: ${FRECUENCIAS.join(', ')}`)
  }

  const { errores: deHasta, vigenteHasta } = leerHasta(entrada.hasta, desde)
  errores.push(...deHasta)

  const repeticion = validarFrecuencia(entrada.frecuencia)
    ? validarRepeticion(entrada.repeticion, entrada.frecuencia)
    : { ok: true, errores: [], repeticion: { ...SIN_REPETICION } }
  if (!repeticion.ok) errores.push(...repeticion.errores)

  if (errores.length > 0) return { ok: false, errores, recurrencia: null }

  return {
    ok: true,
    errores: [],
    recurrencia: {
      frecuencia: entrada.frecuencia,
      repeticion: repeticion.repeticion ?? { ...SIN_REPETICION },
      vigenteHasta,
    },
  }
}

/**
 * `hasta` tal como lo escriben las dos validaciones de plan: opcional, fecha
 * real, y nunca anterior a cuando el plan empieza.
 */
function leerHasta(valor, vigenteDesde) {
  const errores = []
  let vigenteHasta = null

  if (valor !== undefined && valor !== null && valor !== '') {
    if (!esFechaIso(valor)) {
      errores.push("El campo 'hasta' tiene que ser una fecha real en AAAA-MM-DD")
    } else {
      vigenteHasta = String(valor).trim()
    }
  }

  if (vigenteDesde && vigenteHasta && vigenteHasta < vigenteDesde) {
    errores.push("El campo 'hasta' no puede ser anterior a cuando empieza el plan")
  }

  return { errores, vigenteHasta }
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

  // Solo si la frecuencia es válida: la regla se valida contra ella, y con una
  // frecuencia inventada los errores de la regla no querrían decir nada.
  const repeticion = validarFrecuencia(entrada.frecuencia)
    ? validarRepeticion(entrada.repeticion, entrada.frecuencia)
    : { ok: true, errores: [], repeticion: { ...SIN_REPETICION } }
  if (!repeticion.ok) errores.push(...repeticion.errores)

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

  const { errores: deHasta, vigenteHasta } = leerHasta(entrada.hasta, vigenteDesde)
  errores.push(...deHasta)

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
      repeticion: repeticion.repeticion ?? { ...SIN_REPETICION },
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
  'monto', 'item', 'categoria', 'metodo', 'notas', 'frecuencia', 'repeticion', 'hasta',
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
    repeticion: repeticionDelPlan(plan),
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
      // Cambiar de frecuencia sin mandar regla la vuelve a "derivá del ancla":
      // la regla de la frecuencia vieja no es válida en la nueva —un día de la
      // semana con semana del mes no significa nada en un plan semanal— y
      // dejarla puesta guardaría una combinación que el check rechaza.
      if (cambio.repeticion === undefined) siguiente.repeticion = { ...SIN_REPETICION }
      algoCambia = true
    }
  }

  if ('repeticion' in cambio) {
    const repeticion = validarRepeticion(cambio.repeticion, siguiente.frecuencia)
    if (!repeticion.ok) errores.push(...repeticion.errores)
    else if (
      CAMPOS_DE_LA_REPETICION.some((c) => repeticion.repeticion[c] !== siguiente.repeticion[c])
    ) {
      siguiente.repeticion = repeticion.repeticion
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

/**
 * El plan vivo de una cadena de planes, empezando por `id`.
 *
 * "Editar de aquí en adelante" cierra un plan y crea el siguiente apuntando al
 * cerrado (`plan_anterior_id`), así que un movimiento guarda **la versión del
 * plan que lo propuso**, que puede no ser la que sigue proponiendo. Sin esto,
 * terminar la recurrencia desde un movimiento de marzo cerraría una versión que
 * ya estaba cerrada y el plan seguiría proponiendo como si nada.
 *
 * Devuelve `null` si `id` no está entre los planes. Lleva control de vistos
 * porque una cadena con un ciclo —una fila mal escrita a mano— colgaría el
 * pedido en vez de dar un error.
 */
function planVivoDeLaCadena(planes, id) {
  const lista = Array.isArray(planes) ? planes : []
  const siguienteDe = new Map()
  for (const plan of lista) {
    if (plan?.plan_anterior_id) siguienteDe.set(plan.plan_anterior_id, plan)
  }

  let actual = lista.find((plan) => plan?.id === id) ?? null
  const vistos = new Set()
  while (actual && !vistos.has(actual.id)) {
    vistos.add(actual.id)
    const siguiente = siguienteDe.get(actual.id)
    if (!siguiente) break
    actual = siguiente
  }

  return actual
}

module.exports = {
  FRECUENCIAS,
  CAMPOS_DEL_PLAN,
  CAMPOS_DE_LA_REPETICION,
  SIN_REPETICION,
  MAXIMO_DE_OCURRENCIAS,
  ocurrenciaNumero,
  ocurrenciasDelPlan,
  proximaOcurrencia,
  esOcurrenciaDelPlan,
  propuestasPendientes,
  movimientoDeLaPropuesta,
  validarFrecuencia,
  validarRepeticion,
  repeticionDelPlan,
  validarPlanDeRecurrencia,
  validarRecurrenciaDeMovimiento,
  validarCambioDePlan,
  planVigente,
  planVivoDeLaCadena,
}
