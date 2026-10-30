const { test } = require('node:test')
const assert = require('node:assert')

const {
  validarAnio,
  validarAnioRequerido,
  validarInput,
  validarMes,
} = require('../src/gastos/validacion')

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
