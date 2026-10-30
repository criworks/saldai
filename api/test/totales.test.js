const { test } = require('node:test')
const assert = require('node:assert')

const { arregloDeTotales } = require('../src/gastos/totales')

test('arma los doce meses en orden, con 0 en los que no vinieron', () => {
  const totales = arregloDeTotales([
    { mes: 2, total: 150000 },
    { mes: 10, total: 42000 },
  ])

  assert.strictEqual(totales.length, 12)
  assert.strictEqual(totales[1], 150000)
  assert.strictEqual(totales[9], 42000)
  assert.deepStrictEqual(
    totales.filter((t) => t !== 0),
    [150000, 42000]
  )
})

test('acepta el total como string, que es como PostgREST puede mandar un bigint', () => {
  assert.strictEqual(arregloDeTotales([{ mes: '3', total: '99500' }])[2], 99500)
})

test('un año sin gastos son doce ceros', () => {
  assert.deepStrictEqual(arregloDeTotales([]), Array(12).fill(0))
  assert.deepStrictEqual(arregloDeTotales(null), Array(12).fill(0))
})

test('ignora una fila con mes fuera de rango en vez de escribir fuera del arreglo', () => {
  const totales = arregloDeTotales([
    { mes: 0, total: 1 },
    { mes: 13, total: 1 },
    { mes: null, total: 1 },
    { mes: 7, total: 500 },
  ])

  assert.deepStrictEqual(totales, [0, 0, 0, 0, 0, 0, 500, 0, 0, 0, 0, 0])
})
