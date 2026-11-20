const { test } = require('node:test')
const assert = require('node:assert')

const {
  ocurrenciasDelPlan,
  esOcurrenciaDelPlan,
  validarRepeticion,
  repeticionDelPlan,
  validarPlanDeRecurrencia,
  validarCambioDePlan,
  SIN_REPETICION,
} = require('../recurrencias')

/**
 * La regla de repetición: el ancla pasó de ser la única fuente del día a ser su
 * default. Cada columna en `null` significa "derivá del ancla".
 *
 * El 6 de enero de 2026 es un martes, y se usa de ancla en casi todo el
 * archivo: así se ve la diferencia entre la regla y el ancla sin tener que
 * contar días.
 */
function plan(campos = {}) {
  return {
    id: 'plan-1',
    monto: 525457,
    monto_formateado: '$525.457',
    item: 'arriendo',
    categoria: 'Básicos',
    categoria_src: 'campo',
    metodo: 'TC',
    notas: null,
    frecuencia: 'mensual',
    vigente_desde: '2026-01-06',
    vigente_hasta: null,
    dia_de_la_semana: null,
    semana_del_mes: null,
    dia_del_mes: null,
    mes_del_anio: null,
    ...campos,
  }
}

// ── Compatibilidad: sin regla, nada cambia ──────────────────────────────────
//
// Es el único test que protege a los planes que ya están guardados: si falla,
// la migración les cambió las fechas a todos.

test('un plan sin regla propone lo mismo que antes de que la regla existiera', () => {
  const sinColumnas = { ...plan() }
  delete sinColumnas.dia_de_la_semana
  delete sinColumnas.semana_del_mes
  delete sinColumnas.dia_del_mes
  delete sinColumnas.mes_del_anio

  const esperado = ['2026-01-06', '2026-02-06', '2026-03-06']
  assert.deepStrictEqual(ocurrenciasDelPlan(plan(), { hasta: '2026-03-31' }), esperado)
  assert.deepStrictEqual(ocurrenciasDelPlan(sinColumnas, { hasta: '2026-03-31' }), esperado)
})

test('la regla que repite el ancla propone lo mismo que no tener regla', () => {
  const conRegla = plan({ dia_del_mes: 6 })
  assert.deepStrictEqual(
    ocurrenciasDelPlan(conRegla, { hasta: '2026-03-31' }),
    ocurrenciasDelPlan(plan(), { hasta: '2026-03-31' })
  )
})

// ── Semanal ─────────────────────────────────────────────────────────────────

test('un plan semanal repite el día de la semana elegido y no el del ancla', () => {
  // Ancla martes, regla viernes: la ocurrencia 0 sigue siendo el martes.
  const fechas = ocurrenciasDelPlan(plan({ frecuencia: 'semanal', dia_de_la_semana: 5 }), {
    hasta: '2026-01-24',
  })
  assert.deepStrictEqual(fechas, ['2026-01-06', '2026-01-09', '2026-01-16', '2026-01-23'])
})

test('un plan semanal con el día de la semana del ancla cae cada siete días', () => {
  const fechas = ocurrenciasDelPlan(plan({ frecuencia: 'semanal', dia_de_la_semana: 2 }), {
    hasta: '2026-01-24',
  })
  assert.deepStrictEqual(fechas, ['2026-01-06', '2026-01-13', '2026-01-20'])
})

// ── Mensual ─────────────────────────────────────────────────────────────────

test('un plan mensual puede repetir el último viernes de cada mes', () => {
  const fechas = ocurrenciasDelPlan(plan({ dia_de_la_semana: 5, semana_del_mes: -1 }), {
    hasta: '2026-03-31',
  })
  // Enero tiene cinco viernes (el 30 es el último) y febrero cuatro (el 27).
  assert.deepStrictEqual(fechas, ['2026-01-06', '2026-01-30', '2026-02-27', '2026-03-27'])
})

test('el segundo lunes existe en cualquier mes', () => {
  const fechas = ocurrenciasDelPlan(plan({ dia_de_la_semana: 1, semana_del_mes: 2 }), {
    hasta: '2026-03-31',
  })
  assert.deepStrictEqual(fechas, ['2026-01-06', '2026-01-12', '2026-02-09', '2026-03-09'])
})

test('un día del mes anterior al del ancla arranca el mes siguiente', () => {
  // Ancla el 20 y regla el 1: el 1 de enero ya pasó, así que la primera
  // ocurrencia de la regla es el 1 de febrero y no una fecha previa al plan.
  const fechas = ocurrenciasDelPlan(plan({ vigente_desde: '2026-01-20', dia_del_mes: 1 }), {
    hasta: '2026-03-31',
  })
  assert.deepStrictEqual(fechas, ['2026-01-20', '2026-02-01', '2026-03-01'])
})

test('un día del mes posterior al del ancla cae en el mismo mes del ancla', () => {
  const fechas = ocurrenciasDelPlan(plan({ dia_del_mes: 28 }), { hasta: '2026-02-28' })
  assert.deepStrictEqual(fechas, ['2026-01-06', '2026-01-28', '2026-02-28'])
})

test('un día del mes que el mes no tiene cae el último día', () => {
  const fechas = ocurrenciasDelPlan(plan({ dia_del_mes: 31 }), { hasta: '2026-02-28' })
  assert.deepStrictEqual(fechas, ['2026-01-06', '2026-01-31', '2026-02-28'])
})

// ── Anual ───────────────────────────────────────────────────────────────────

test('un plan anual puede repetir en otro mes del año sin saltearse un año', () => {
  const fechas = ocurrenciasDelPlan(plan({ frecuencia: 'anual', mes_del_anio: 12 }), {
    hasta: '2027-12-31',
  })
  assert.deepStrictEqual(fechas, ['2026-01-06', '2026-12-06', '2027-12-06'])
})

test('un plan anual con el mes ya pasado arranca el año siguiente', () => {
  const fechas = ocurrenciasDelPlan(
    plan({ frecuencia: 'anual', vigente_desde: '2026-06-10', mes_del_anio: 3 }),
    { hasta: '2028-12-31' }
  )
  assert.deepStrictEqual(fechas, ['2026-06-10', '2027-03-10', '2028-03-10'])
})

test('un plan anual puede repetir el primer lunes de un mes', () => {
  const fechas = ocurrenciasDelPlan(
    plan({ frecuencia: 'anual', mes_del_anio: 3, dia_de_la_semana: 1, semana_del_mes: 1 }),
    { hasta: '2027-12-31' }
  )
  assert.deepStrictEqual(fechas, ['2026-01-06', '2026-03-02', '2027-03-01'])
})

test('un plan anual el 29 de febrero sigue cayendo el 28 en año no bisiesto', () => {
  const fechas = ocurrenciasDelPlan(
    plan({ frecuencia: 'anual', vigente_desde: '2024-02-29', mes_del_anio: 2 }),
    { hasta: '2025-12-31' }
  )
  assert.deepStrictEqual(fechas, ['2024-02-29', '2025-02-28'])
})

// ── El ancla es la ocurrencia 0 aunque no cumpla la regla ───────────────────

test('la fecha del ancla es una ocurrencia aunque la regla diga otro día', () => {
  // Es lo que permite que un plan atado a un movimiento cierre esa fecha como
  // primera ocurrencia confirmada: `fecha_prevista` = `vigente_desde`.
  const conRegla = plan({ dia_de_la_semana: 5, semana_del_mes: -1 })
  assert.strictEqual(esOcurrenciaDelPlan(conRegla, '2026-01-06'), true)
  assert.strictEqual(esOcurrenciaDelPlan(conRegla, '2026-02-06'), false)
  assert.strictEqual(esOcurrenciaDelPlan(conRegla, '2026-02-27'), true)
})

// ── La validación de la regla ───────────────────────────────────────────────

test('sin regla la validación devuelve la regla vacía', () => {
  assert.deepStrictEqual(validarRepeticion(undefined, 'mensual').repeticion, SIN_REPETICION)
  assert.deepStrictEqual(validarRepeticion(null, 'semanal').repeticion, SIN_REPETICION)
})

test('un día de la semana fuera de 0 a 6 se rechaza', () => {
  const resultado = validarRepeticion({ diaDeLaSemana: 7, semanaDelMes: 1 }, 'mensual')
  assert.strictEqual(resultado.ok, false)
  assert.match(resultado.errores.join(' '), /diaDeLaSemana/)
})

test('la quinta semana del mes se rechaza y la última se acepta', () => {
  assert.strictEqual(
    validarRepeticion({ diaDeLaSemana: 5, semanaDelMes: 5 }, 'mensual').ok,
    false
  )
  assert.strictEqual(validarRepeticion({ diaDeLaSemana: 5, semanaDelMes: -1 }, 'mensual').ok, true)
})

test('las dos formas del día juntas se rechazan en vez de elegir una', () => {
  const resultado = validarRepeticion(
    { diaDelMes: 5, diaDeLaSemana: 5, semanaDelMes: 1 },
    'mensual'
  )
  assert.strictEqual(resultado.ok, false)
  assert.match(resultado.errores.join(' '), /una sola forma/)
})

test('la semana del mes sin día de la semana se rechaza', () => {
  assert.strictEqual(validarRepeticion({ semanaDelMes: 2 }, 'mensual').ok, false)
})

test('el día de la semana sin la semana del mes se rechaza en un plan mensual', () => {
  assert.strictEqual(validarRepeticion({ diaDeLaSemana: 1 }, 'mensual').ok, false)
})

test('un plan semanal solo acepta el día de la semana', () => {
  assert.strictEqual(validarRepeticion({ diaDeLaSemana: 1 }, 'semanal').ok, true)
  assert.strictEqual(validarRepeticion({ diaDeLaSemana: 1, semanaDelMes: 2 }, 'semanal').ok, false)
  assert.strictEqual(validarRepeticion({ diaDelMes: 10 }, 'semanal').ok, false)
})

test('el mes del año solo vale en un plan anual', () => {
  assert.strictEqual(validarRepeticion({ mesDelAnio: 3 }, 'mensual').ok, false)
  assert.strictEqual(validarRepeticion({ mesDelAnio: 3 }, 'anual').ok, true)
  assert.strictEqual(validarRepeticion({ mesDelAnio: 13 }, 'anual').ok, false)
})

test('un campo de la regla que no existe se rechaza por nombre', () => {
  const resultado = validarRepeticion({ cada: 2 }, 'mensual')
  assert.strictEqual(resultado.ok, false)
  assert.match(resultado.errores.join(' '), /cada/)
})

test('repeticionDelPlan lee la regla de la fila', () => {
  assert.deepStrictEqual(repeticionDelPlan(plan({ dia_de_la_semana: 5, semana_del_mes: -1 })), {
    diaDeLaSemana: 5,
    semanaDelMes: -1,
    diaDelMes: null,
    mesDelAnio: null,
  })
  assert.deepStrictEqual(repeticionDelPlan(plan()), SIN_REPETICION)
})

// ── La regla al crear y al editar un plan ───────────────────────────────────

test('el plan nuevo guarda la regla que vino en el cuerpo', () => {
  const resultado = validarPlanDeRecurrencia({
    input: '525457, arriendo, basicos, 6/1/2026, tc',
    frecuencia: 'mensual',
    repeticion: { diaDeLaSemana: 5, semanaDelMes: -1 },
  })

  assert.strictEqual(resultado.ok, true)
  assert.deepStrictEqual(resultado.plan.repeticion, {
    diaDeLaSemana: 5,
    semanaDelMes: -1,
    diaDelMes: null,
    mesDelAnio: null,
  })
})

test('un plan nuevo sin regla queda derivando del ancla', () => {
  const resultado = validarPlanDeRecurrencia({
    input: '525457, arriendo, basicos, 6/1/2026, tc',
    frecuencia: 'mensual',
  })

  assert.strictEqual(resultado.ok, true)
  assert.deepStrictEqual(resultado.plan.repeticion, SIN_REPETICION)
})

test('una regla incoherente con la frecuencia no crea el plan', () => {
  const resultado = validarPlanDeRecurrencia({
    input: '525457, arriendo, basicos, 6/1/2026, tc',
    frecuencia: 'semanal',
    repeticion: { diaDelMes: 10 },
  })

  assert.strictEqual(resultado.ok, false)
  assert.strictEqual(resultado.errorDeLectura, false)
})

test('cambiar solo la regla es un cambio del plan', () => {
  const resultado = validarCambioDePlan(plan(), {
    desde: '2026-03-01',
    repeticion: { diaDeLaSemana: 5, semanaDelMes: -1 },
  })

  assert.strictEqual(resultado.ok, true)
  assert.deepStrictEqual(resultado.plan.repeticion, {
    diaDeLaSemana: 5,
    semanaDelMes: -1,
    diaDelMes: null,
    mesDelAnio: null,
  })
})

test('mandar la regla que el plan ya tenía no es un cambio', () => {
  const resultado = validarCambioDePlan(plan({ dia_del_mes: 6 }), {
    desde: '2026-03-01',
    repeticion: { diaDelMes: 6 },
  })

  assert.strictEqual(resultado.ok, false)
  assert.match(resultado.errores.join(' '), /al menos un campo/)
})

test('cambiar de frecuencia sin mandar regla la vuelve a derivar del ancla', () => {
  // La regla de la frecuencia vieja no es válida en la nueva, y dejarla puesta
  // guardaría una combinación que el check de la tabla rechaza.
  const resultado = validarCambioDePlan(plan({ dia_de_la_semana: 5, semana_del_mes: -1 }), {
    desde: '2026-03-01',
    frecuencia: 'semanal',
  })

  assert.strictEqual(resultado.ok, true)
  assert.deepStrictEqual(resultado.plan.repeticion, SIN_REPETICION)
})

test('cambiar de frecuencia con regla nueva la valida contra la frecuencia nueva', () => {
  const resultado = validarCambioDePlan(plan(), {
    desde: '2026-03-01',
    frecuencia: 'semanal',
    repeticion: { diaDeLaSemana: 3 },
  })

  assert.strictEqual(resultado.ok, true)
  assert.strictEqual(resultado.plan.repeticion.diaDeLaSemana, 3)

  const rechazado = validarCambioDePlan(plan(), {
    desde: '2026-03-01',
    frecuencia: 'semanal',
    repeticion: { diaDelMes: 10 },
  })
  assert.strictEqual(rechazado.ok, false)
})

test('la regla en null vuelve a derivar del ancla', () => {
  const resultado = validarCambioDePlan(plan({ dia_de_la_semana: 5, semana_del_mes: -1 }), {
    desde: '2026-03-01',
    repeticion: null,
  })

  assert.strictEqual(resultado.ok, true)
  assert.deepStrictEqual(resultado.plan.repeticion, SIN_REPETICION)
})
