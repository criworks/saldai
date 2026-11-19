const { test } = require('node:test')
const assert = require('node:assert')

const {
  FRECUENCIAS,
  ocurrenciasDelPlan,
  esOcurrenciaDelPlan,
  propuestasPendientes,
  movimientoDeLaPropuesta,
  validarPlanDeRecurrencia,
  validarRecurrenciaDeMovimiento,
  validarCambioDePlan,
  planVigente,
  planVivoDeLaCadena,
  MAXIMO_DE_OCURRENCIAS,
} = require('../recurrencias')

/** Un plan mínimo con la forma de la fila. */
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
    vigente_desde: '2026-01-05',
    vigente_hasta: null,
    ...campos,
  }
}

// ── Las fechas que propone un plan ──────────────────────────────────────────

test('un plan mensual propone el mismo día de cada mes', () => {
  const fechas = ocurrenciasDelPlan(plan(), { hasta: '2026-04-10' })
  assert.deepStrictEqual(fechas, ['2026-01-05', '2026-02-05', '2026-03-05', '2026-04-05'])
})

test('un plan mensual anclado un 31 cae el último día del mes corto y después vuelve al 31', () => {
  const fechas = ocurrenciasDelPlan(plan({ vigente_desde: '2026-01-31' }), { hasta: '2026-04-30' })
  // Febrero el 28 y marzo de vuelta el 31: con el cálculo incremental, el día
  // se perdía en el primer mes corto y el plan proponía el 28 para siempre.
  assert.deepStrictEqual(fechas, ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
})

test('un plan anual anclado el 29 de febrero cae el 28 en los años no bisiestos', () => {
  const fechas = ocurrenciasDelPlan(plan({ frecuencia: 'anual', vigente_desde: '2024-02-29' }), {
    hasta: '2026-12-31',
  })
  assert.deepStrictEqual(fechas, ['2024-02-29', '2025-02-28', '2026-02-28'])
})

test('un plan semanal propone cada siete días', () => {
  const fechas = ocurrenciasDelPlan(plan({ frecuencia: 'semanal', vigente_desde: '2026-03-02' }), {
    hasta: '2026-03-24',
  })
  assert.deepStrictEqual(fechas, ['2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23'])
})

test('no propone nada después de la fecha de término', () => {
  const fechas = ocurrenciasDelPlan(plan({ vigente_hasta: '2026-02-28' }), { hasta: '2026-06-30' })
  assert.deepStrictEqual(fechas, ['2026-01-05', '2026-02-05'])
})

test('no propone nada antes de que el plan empiece', () => {
  assert.deepStrictEqual(ocurrenciasDelPlan(plan(), { hasta: '2025-12-31' }), [])
})

test('una frecuencia que no existe no propone nada en vez de tirar', () => {
  assert.deepStrictEqual(ocurrenciasDelPlan(plan({ frecuencia: 'quincenal' }), { hasta: '2026-12-31' }), [])
})

test('un ancla absurda no se convierte en un bucle largo', () => {
  const fechas = ocurrenciasDelPlan(plan({ frecuencia: 'semanal', vigente_desde: '0202-01-01' }), {
    hasta: '2026-12-31',
  })
  assert.strictEqual(fechas.length, MAXIMO_DE_OCURRENCIAS)
})

test('esOcurrenciaDelPlan distingue una fecha del plan de una cualquiera', () => {
  assert.strictEqual(esOcurrenciaDelPlan(plan(), '2026-03-05'), true)
  assert.strictEqual(esOcurrenciaDelPlan(plan(), '2026-03-06'), false)
  assert.strictEqual(esOcurrenciaDelPlan(plan(), 'mañana'), false)
})

// ── Las propuestas pendientes ───────────────────────────────────────────────

test('una fecha ya decidida no vuelve a aparecer como propuesta', () => {
  const propuestas = propuestasPendientes(
    [plan()],
    [{ recurrenciaId: 'plan-1', fecha: '2026-02-05' }],
    { hasta: '2026-03-10' }
  )
  assert.deepStrictEqual(propuestas.map((p) => p.fecha), ['2026-01-05', '2026-03-05'])
})

test('las propuestas de varios planes salen de la más vieja a la más nueva', () => {
  const otro = plan({ id: 'plan-2', item: 'netflix', vigente_desde: '2026-01-20' })
  const propuestas = propuestasPendientes([plan(), otro], [], { hasta: '2026-02-10' })
  assert.deepStrictEqual(
    propuestas.map((p) => `${p.fecha} ${p.plan.item}`),
    ['2026-01-05 arriendo', '2026-01-20 netflix', '2026-02-05 arriendo']
  )
})

test('una decisión de otro plan en la misma fecha no tapa la propuesta', () => {
  const otro = plan({ id: 'plan-2', item: 'netflix' })
  const propuestas = propuestasPendientes(
    [plan(), otro],
    [{ recurrenciaId: 'plan-1', fecha: '2026-01-05' }],
    { hasta: '2026-01-31' }
  )
  assert.deepStrictEqual(propuestas.map((p) => p.recurrenciaId), ['plan-2'])
})

// ── Confirmar, con y sin cambios ────────────────────────────────────────────

test('confirmar sin cambios copia el plan y no marca ningún campo editado', () => {
  const { movimiento, camposEditados } = movimientoDeLaPropuesta(plan(), '2026-03-05')
  assert.strictEqual(movimiento.monto, 525457)
  assert.strictEqual(movimiento.item, 'arriendo')
  assert.strictEqual(movimiento.fecha, '2026-03-05')
  assert.deepStrictEqual(camposEditados, [])
})

test('confirmar cambiando el monto marca solo ese campo', () => {
  const { movimiento, camposEditados } = movimientoDeLaPropuesta(plan(), '2026-03-05', {
    monto: 600000,
    montoFormateado: '$600.000',
  })
  assert.strictEqual(movimiento.monto, 600000)
  assert.strictEqual(movimiento.montoFormateado, '$600.000')
  assert.deepStrictEqual(camposEditados, ['monto'])
})

test('mandar un campo igual al del plan no es una corrección', () => {
  // Marcarlo dejaría la fila excluida de un reclasificar masivo sin que el
  // usuario haya cambiado nada.
  const { camposEditados } = movimientoDeLaPropuesta(plan(), '2026-03-05', {
    monto: 525457,
    montoFormateado: '$525.457',
    item: 'arriendo',
  })
  assert.deepStrictEqual(camposEditados, [])
})

test('confirmar con otra fecha marca la fecha y deja la prevista aparte', () => {
  const { movimiento, camposEditados } = movimientoDeLaPropuesta(plan(), '2026-03-05', {
    fecha: '2026-03-07',
  })
  assert.strictEqual(movimiento.fecha, '2026-03-07')
  assert.deepStrictEqual(camposEditados, ['fecha'])
})

test('vaciar una nota que el plan no tenía no es un cambio', () => {
  const { camposEditados } = movimientoDeLaPropuesta(plan(), '2026-03-05', { notas: null })
  assert.deepStrictEqual(camposEditados, [])
})

// ── Crear un plan ───────────────────────────────────────────────────────────

test('el plan se lee de la misma línea que un movimiento', () => {
  const res = validarPlanDeRecurrencia(
    { input: '525457, arriendo, basicos, 05/01/2026, tc', frecuencia: 'mensual' },
    { zona: 'America/Santiago' }
  )

  assert.strictEqual(res.ok, true)
  assert.strictEqual(res.plan.monto, 525457)
  assert.strictEqual(res.plan.item, 'arriendo')
  assert.strictEqual(res.plan.categoria, 'Básicos')
  assert.strictEqual(res.plan.metodo, 'TC')
  // La fecha de la línea es el ancla de la recurrencia.
  assert.strictEqual(res.plan.vigenteDesde, '2026-01-05')
  assert.strictEqual(res.plan.zona, 'America/Santiago')
})

test("'desde' explícito gana sobre la fecha de la línea", () => {
  const res = validarPlanDeRecurrencia(
    { input: '30000, netflix, suscripciones, hoy', frecuencia: 'mensual', desde: '2026-02-01' },
    { zona: 'America/Santiago', hoy: new Date(Date.UTC(2026, 0, 15)) }
  )
  assert.strictEqual(res.ok, true)
  assert.strictEqual(res.plan.vigenteDesde, '2026-02-01')
})

test('una frecuencia que no está en el catálogo se rechaza', () => {
  const res = validarPlanDeRecurrencia({ input: '1000, pan', frecuencia: 'quincenal' })
  assert.strictEqual(res.ok, false)
  assert.ok(res.errores.some((e) => e.includes('frecuencia')))
  assert.deepStrictEqual(FRECUENCIAS, ['semanal', 'mensual', 'anual'])
})

test("'hasta' anterior al comienzo se rechaza", () => {
  const res = validarPlanDeRecurrencia({
    input: '1000, pan, , 05/01/2026',
    frecuencia: 'mensual',
    hasta: '2025-12-01',
  })
  assert.strictEqual(res.ok, false)
  assert.ok(res.errores.some((e) => e.includes('hasta')))
})

test('un input que el parser rechaza no crea el plan', () => {
  const res = validarPlanDeRecurrencia({ input: 'sin monto', frecuencia: 'mensual' })
  assert.strictEqual(res.ok, false)
  assert.strictEqual(res.plan, null)
})

// ── Editar de aquí en adelante ──────────────────────────────────────────────

test('el cambio de plan pide desde cuándo', () => {
  const res = validarCambioDePlan(plan(), { monto: 600000 })
  assert.strictEqual(res.ok, false)
  assert.ok(res.errores.some((e) => e.includes('desde')))
})

test('un cambio de monto recalcula el formateado y no lo toma del cuerpo', () => {
  const res = validarCambioDePlan(plan(), { desde: '2026-05-01', monto: 600000 })
  assert.strictEqual(res.ok, true)
  assert.strictEqual(res.plan.monto, 600000)
  assert.strictEqual(res.plan.montoFormateado, '$600.000')
  assert.strictEqual(res.desde, '2026-05-01')
})

test('un cambio que no cambia nada se rechaza', () => {
  const res = validarCambioDePlan(plan(), { desde: '2026-05-01', item: 'arriendo' })
  assert.strictEqual(res.ok, false)
})

test("'hasta' en null termina de ser un plan con fin", () => {
  const res = validarCambioDePlan(plan({ vigente_hasta: '2026-12-31' }), {
    desde: '2026-05-01',
    hasta: null,
  })
  assert.strictEqual(res.ok, true)
  assert.strictEqual(res.plan.vigenteHasta, null)
})

test('un campo que no es del plan se rechaza por nombre', () => {
  const res = validarCambioDePlan(plan(), { desde: '2026-05-01', fecha: '2026-05-01' })
  assert.strictEqual(res.ok, false)
  assert.ok(res.errores.some((e) => e.includes('fecha')))
})

test('planVigente mira la fecha de término', () => {
  assert.strictEqual(planVigente(plan(), '2030-01-01'), true)
  assert.strictEqual(planVigente(plan({ vigente_hasta: '2026-02-28' }), '2026-03-01'), false)
  assert.strictEqual(planVigente(plan({ vigente_hasta: '2026-02-28' }), '2026-02-28'), true)
})

// ── La recurrencia que se configura desde un movimiento ─────────────────────

test('la recurrencia de un movimiento pide una frecuencia conocida', () => {
  assert.strictEqual(validarRecurrenciaDeMovimiento({ frecuencia: 'mensual' }).ok, true)
  assert.strictEqual(validarRecurrenciaDeMovimiento({ frecuencia: 'quincenal' }).ok, false)
  assert.strictEqual(validarRecurrenciaDeMovimiento({}).ok, false)
  assert.strictEqual(validarRecurrenciaDeMovimiento(null).ok, false)
})

test('"hasta" es opcional y no puede quedar antes del movimiento', () => {
  const sinFin = validarRecurrenciaDeMovimiento({ frecuencia: 'mensual' })
  assert.strictEqual(sinFin.recurrencia.vigenteHasta, null)

  const conFin = validarRecurrenciaDeMovimiento(
    { frecuencia: 'mensual', hasta: '2027-03-01' },
    { desde: '2026-08-10' }
  )
  assert.strictEqual(conFin.recurrencia.vigenteHasta, '2027-03-01')

  const alReves = validarRecurrenciaDeMovimiento(
    { frecuencia: 'mensual', hasta: '2026-01-01' },
    { desde: '2026-08-10' }
  )
  assert.strictEqual(alReves.ok, false)
})

test('atar un plan a un movimiento viejo deja los meses intermedios por confirmar', () => {
  // La decisión de producto, escrita como test: el movimiento que ancla el
  // plan no se vuelve a proponer —queda confirmado— y los meses entre esa
  // fecha y hoy sí, uno por uno. El usuario los decide mirando si ya los tenía
  // cargados a mano; la app no cuadra sola.
  const plan = {
    id: 'plan-1',
    frecuencia: 'mensual',
    vigente_desde: '2026-08-10',
    vigente_hasta: null,
  }

  const decisiones = [{ recurrenciaId: 'plan-1', fecha: '2026-08-10' }]
  const pendientes = propuestasPendientes([plan], decisiones, { hasta: '2026-11-18' })

  assert.deepStrictEqual(
    pendientes.map((p) => p.fecha),
    ['2026-09-10', '2026-10-10', '2026-11-10']
  )
})

test('el plan vivo de una cadena es el último, no el que anotó el movimiento', () => {
  // Un movimiento de agosto guarda la versión del plan que lo propuso; en
  // septiembre el usuario editó "de aquí en adelante" y esa versión quedó
  // cerrada. Actuar sobre la recurrencia desde ese movimiento tiene que llegar
  // a la que sigue proponiendo, o se cierra una ya cerrada y el plan sigue vivo.
  const planes = [
    { id: 'v1', plan_anterior_id: null, vigente_hasta: '2026-08-31' },
    { id: 'v2', plan_anterior_id: 'v1', vigente_hasta: '2026-10-31' },
    { id: 'v3', plan_anterior_id: 'v2', vigente_hasta: null },
  ]

  assert.strictEqual(planVivoDeLaCadena(planes, 'v1').id, 'v3')
  assert.strictEqual(planVivoDeLaCadena(planes, 'v3').id, 'v3')
  assert.strictEqual(planVivoDeLaCadena(planes, 'no-existe'), null)
})

test('una cadena con un ciclo no cuelga el pedido', () => {
  const planes = [
    { id: 'a', plan_anterior_id: 'b' },
    { id: 'b', plan_anterior_id: 'a' },
  ]

  assert.ok(['a', 'b'].includes(planVivoDeLaCadena(planes, 'a').id))
})
