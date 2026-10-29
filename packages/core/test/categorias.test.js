const test = require('node:test')
const assert = require('node:assert/strict')

const {
  NOMBRES_CATEGORIAS,
  TODAS_LAS_CATEGORIAS,
  CATEGORIAS,
  SIN_CATEGORIA,
  esCategoriaValida,
} = require('../categorias')

// Las reglas de categorizar() se prueban en api/test/categorizer.test.js, que
// cubre el match por palabra, los acentos y el orden de prioridad. Acá se
// prueba el catálogo, que es lo que consumen las interfaces.

test('el catálogo tiene las siete categorías y el comodín', () => {
  assert.equal(NOMBRES_CATEGORIAS.length, 7)
  assert.equal(TODAS_LAS_CATEGORIAS.length, 8)
  assert.ok(TODAS_LAS_CATEGORIAS.includes(SIN_CATEGORIA))
  assert.ok(!NOMBRES_CATEGORIAS.includes(SIN_CATEGORIA))
})

test('cada categoría del catálogo tiene keywords', () => {
  for (const categoria of NOMBRES_CATEGORIAS) {
    assert.ok(Array.isArray(CATEGORIAS[categoria]), `${categoria} no tiene keywords`)
    assert.ok(CATEGORIAS[categoria].length > 0, `${categoria} tiene la lista vacía`)
  }
})

test('el catálogo no deja categorías sin keywords ni keywords sin categoría', () => {
  assert.deepEqual([...NOMBRES_CATEGORIAS].sort(), Object.keys(CATEGORIAS).sort())
})

test('solo las categorías del catálogo son válidas', () => {
  assert.ok(esCategoriaValida('Transporte'))
  assert.ok(esCategoriaValida(SIN_CATEGORIA))
  // Las que inventaban los mocks de mobile.
  assert.ok(!esCategoriaValida('Comida'))
  assert.ok(!esCategoriaValida('Despensa'))
})
