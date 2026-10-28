const test = require('node:test')
const assert = require('node:assert/strict')

const { rangoDelMes, rangoDelAnio } = require('../src/rangos')

test('el rango de un mes empieza el día 1 y termina el 1 del siguiente', () => {
  assert.deepEqual(rangoDelMes(2026, 10), { desde: '2026-10-01', hasta: '2026-11-01' })
})

test('diciembre cierra en enero del año siguiente', () => {
  assert.deepEqual(rangoDelMes(2026, 12), { desde: '2026-12-01', hasta: '2027-01-01' })
})

test('el mes se rellena con cero', () => {
  assert.deepEqual(rangoDelMes(2026, 3), { desde: '2026-03-01', hasta: '2026-04-01' })
})

test('febrero no necesita saber si el año es bisiesto', () => {
  assert.deepEqual(rangoDelMes(2024, 2), { desde: '2024-02-01', hasta: '2024-03-01' })
  assert.deepEqual(rangoDelMes(2026, 2), { desde: '2026-02-01', hasta: '2026-03-01' })
})

test('el rango de un año cubre enero a diciembre', () => {
  assert.deepEqual(rangoDelAnio(2026), { desde: '2026-01-01', hasta: '2027-01-01' })
})
