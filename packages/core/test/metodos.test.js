const test = require('node:test')
const assert = require('node:assert/strict')

const { normalizarMetodo, METODOS_VALIDOS, esMetodoValido } = require('../metodos')

test('los alias conocidos se normalizan sin advertir', () => {
  assert.deepEqual(normalizarMetodo('ef'), { metodo: 'EF' })
  assert.deepEqual(normalizarMetodo('EFECTIVO'), { metodo: 'EF' })
  assert.deepEqual(normalizarMetodo('tarjeta de crédito'), { metodo: 'TC' })
})

test('sin método se asume TC y se advierte', () => {
  const { metodo, advertencia } = normalizarMetodo('')
  assert.equal(metodo, 'TC')
  assert.match(advertencia, /no especificado/)
})

test('un método desconocido se asume TC y se advierte con lo que escribió el usuario', () => {
  const { metodo, advertencia } = normalizarMetodo('bitcoin')
  assert.equal(metodo, 'TC')
  assert.match(advertencia, /"bitcoin"/)
})

test('solo EF y TC son métodos guardables', () => {
  assert.deepEqual([...METODOS_VALIDOS], ['EF', 'TC'])
  assert.ok(esMetodoValido('EF'))
  assert.ok(!esMetodoValido('ef'))
})
