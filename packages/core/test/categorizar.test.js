const test = require('node:test')
const assert = require('node:assert/strict')

const { categorizar, CATEGORIAS, SIN_CATEGORIA } = require('../categorias')

test('matchea keywords exactas de cada categoría', () => {
  assert.equal(categorizar('spotify'), 'Suscripciones')
  assert.equal(categorizar('jumbo'), 'Mercado')
  assert.equal(categorizar('arriendo'), 'Básicos')
  assert.equal(categorizar('zapatillas'), 'Inversión')
  assert.equal(categorizar('cerveza'), 'Ocio')
  assert.equal(categorizar('rappi'), 'Delivery')
  assert.equal(categorizar('taxi'), 'Transporte')
})

test('encuentra la keyword dentro de una frase', () => {
  assert.equal(categorizar('almuerzo con el equipo'), 'Ocio')
  assert.equal(categorizar('compra en jumbo del barrio'), 'Mercado')
})

test('ignora mayúsculas y acentos en ambos lados', () => {
  assert.equal(categorizar('CAFÉ'), 'Ocio')
  assert.equal(categorizar('cafe'), 'Ocio')
  assert.equal(categorizar('Inversion'), 'Inversión')
  assert.equal(categorizar('inversión'), 'Inversión')
})

test('matchea el plural sin tenerlo listado', () => {
  assert.equal(categorizar('auriculares sony'), 'Inversión')
  assert.equal(categorizar('alfajores'), 'Ocio')
})

test('no matchea una keyword que es solo parte de otra palabra', () => {
  assert.equal(categorizar('gaseosa'), SIN_CATEGORIA)
  assert.equal(categorizar('barberia'), SIN_CATEGORIA)
  assert.equal(categorizar('barbería'), SIN_CATEGORIA)
})

test('las marcas compuestas tienen su propia keyword', () => {
  assert.equal(categorizar('metrogas'), 'Básicos')
  assert.equal(categorizar('apple tv'), 'Suscripciones')
  assert.equal(categorizar('appletv'), 'Suscripciones')
})

test('el orden de prioridad resuelve las keywords que se solapan', () => {
  assert.equal(categorizar('uber eats'), 'Delivery')
  assert.equal(categorizar('uber'), 'Transporte')
  assert.equal(categorizar('acuenta'), 'Mercado')
  assert.equal(categorizar('cuenta de la luz'), 'Básicos')
})

test('lo que no matchea queda sin categoría', () => {
  assert.equal(categorizar('cosa rara'), SIN_CATEGORIA)
  assert.equal(categorizar(''), SIN_CATEGORIA)
  assert.equal(categorizar('   '), SIN_CATEGORIA)
})

test('toda keyword listada matchea su propia categoría', () => {
  for (const [categoria, keywords] of Object.entries(CATEGORIAS)) {
    for (const keyword of keywords) {
      const resultado = categorizar(keyword)
      assert.notEqual(
        resultado,
        SIN_CATEGORIA,
        `la keyword "${keyword}" de ${categoria} no matchea nada`
      )
    }
  }
})

test('el nombre de cada categoría se categoriza como sí misma', () => {
  // La pantalla de captura manda la categoría confirmada por su nombre. Si un
  // nombre cayera en otra categoría por el orden de prioridad, el gasto se
  // guardaría con una categoría distinta a la que el usuario tocó.
  for (const categoria of Object.keys(CATEGORIAS)) {
    assert.equal(categorizar(categoria), categoria)
  }
})
