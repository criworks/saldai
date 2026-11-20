const { test } = require('node:test')
const assert = require('node:assert')

const {
  validarAnio,
  validarAnioRequerido,
  validarId,
  validarInput,
  validarMes,
} = require('../src/movimientos/validacion')
const { hastaDelPedido } = require('../src/recurrencias/validacion')

test('el input tiene que ser un string con algo', () => {
  assert.strictEqual(validarInput('45000, uber').ok, true)
  for (const vacio of ['', null, undefined, 42, {}]) {
    const { ok, errores } = validarInput(vacio)
    assert.strictEqual(ok, false)
    assert.match(errores[0], /'input' es requerido/)
  }
})

test('el mes va de 1 a 12', () => {
  assert.strictEqual(validarMes('1').valor, 1)
  assert.strictEqual(validarMes('12').valor, 12)
  // Llega como string de la query, pero el handler lo usa como número.
  assert.strictEqual(typeof validarMes('7').valor, 'number')

  for (const invalido of ['0', '13', 'octubre', '', undefined]) {
    assert.strictEqual(validarMes(invalido).ok, false)
  }
})

test('sin anio se usa el que se pasa por defecto', () => {
  assert.strictEqual(validarAnio(undefined, 2026).valor, 2026)
  assert.strictEqual(validarAnio('2025', 2026).valor, 2025)
})

test('el anio tiene que ser creíble', () => {
  for (const invalido of ['1999', '2101', 'ayer']) {
    const { ok, errores } = validarAnio(invalido, 2026)
    assert.strictEqual(ok, false)
    assert.match(errores[0], /entre 2000 y 2100/)
  }
})

test('la ruta anual pide el anio sí o sí', () => {
  assert.strictEqual(validarAnioRequerido('2026').valor, 2026)
  for (const invalido of [undefined, '', 'dos mil']) {
    const { ok, errores } = validarAnioRequerido(invalido)
    assert.strictEqual(ok, false)
    assert.match(errores[0], /es requerido/)
  }
})

test('el id de un movimiento tiene que ser un uuid', () => {
  const uuid = '0f1c6b5a-9d2e-4c3b-8a7f-1e2d3c4b5a69'
  assert.strictEqual(validarId(uuid).valor, uuid)
  assert.strictEqual(validarId(` ${uuid} `).valor, uuid)

  // Sin esto un `/movimientos/hola` llega a Supabase y vuelve como 500 de base,
  // cuando es un 400 del cliente.
  for (const invalido of [undefined, '', 'hola', '123', uuid + 'f']) {
    const { ok, errores } = validarId(invalido)
    assert.strictEqual(ok, false, `aceptó ${invalido}`)
    assert.match(errores[0], /uuid de un movimiento/)
  }
})

test("'hasta' solo estira la ventana de propuestas hacia adelante", () => {
  const hoy = '2026-11-20'

  // Sin el parámetro, hasta hoy.
  assert.deepStrictEqual(hastaDelPedido(undefined, hoy), { hasta: hoy, advertencias: [] })

  // Hacia adelante manda el pedido: es lo que deja pedir el mes que se está
  // mirando.
  assert.strictEqual(hastaDelPedido('2026-11-30', hoy).hasta, '2026-11-30')

  // Hacia atrás no: lo atrasado se debe igual, y es lo que el usuario se está
  // olvidando. Mirando septiembre, las propuestas de octubre siguen viniendo.
  assert.strictEqual(hastaDelPedido('2026-09-30', hoy).hasta, hoy)
  assert.deepStrictEqual(hastaDelPedido('2026-09-30', hoy).advertencias, [])
})

test("un 'hasta' muy lejano o ilegible no deja al usuario sin propuestas", () => {
  const hoy = '2026-11-20'

  // Las ocurrencias se derivan una por una, así que hay tope. Advierte en vez
  // de rechazar, para no devolver una lista vacía por un parámetro de más.
  const lejano = hastaDelPedido('2099-01-01', hoy)
  assert.strictEqual(lejano.hasta, '2027-12-25')
  assert.match(lejano.advertencias[0], /no puede pasar de/)

  const ilegible = hastaDelPedido('el mes que viene', hoy)
  assert.strictEqual(ilegible.hasta, hoy)
  assert.match(ilegible.advertencias[0], /no reconocida/)
})
