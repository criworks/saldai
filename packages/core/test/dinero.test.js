const test = require('node:test')
const assert = require('node:assert/strict')

const { formatearMonto, formatearNumero } = require('../dinero')

test('el monto se formatea con punto de miles y sin decimales', () => {
  assert.equal(formatearMonto(12500), '$12.500')
  assert.equal(formatearMonto(1234567), '$1.234.567')
  assert.equal(formatearMonto(999), '$999')
})

test('el número se puede pedir sin el signo', () => {
  assert.equal(formatearNumero(12500), '12.500')
})

test('un monto que no es número no rompe la pantalla', () => {
  assert.equal(formatearMonto(null), '$0')
  assert.equal(formatearMonto(undefined), '$0')
  assert.equal(formatearMonto('qué'), '$0')
})

test('el monto se redondea porque el peso no tiene decimales', () => {
  assert.equal(formatearMonto(12500.4), '$12.500')
  assert.equal(formatearMonto(12500.6), '$12.501')
})
