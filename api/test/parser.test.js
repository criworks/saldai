const test = require('node:test')
const assert = require('node:assert/strict')

const { parsearGasto } = require('../src/parser')

/** Las fechas relativas se prueban en dateParser.test.js; aquí solo el formato. */
const FORMATO_FECHA = /^\d{2}\/\d{2}\/\d{4}$/

const datosDe = (input) => {
  const resultado = parsearGasto(input)
  assert.ok(resultado.ok, `"${input}" debería parsear: ${resultado.errores.join(' · ')}`)
  return resultado.datos
}

test('parsea el caso completo', () => {
  const datos = datosDe('45000, almuerzo con equipo, ocio, ayer, tc')
  assert.equal(datos.monto, 45000)
  assert.equal(datos.montoFormateado, '$45.000')
  assert.equal(datos.item, 'almuerzo con equipo')
  assert.equal(datos.categoria, 'Ocio')
  assert.equal(datos.categoriaSrc, 'campo')
  assert.equal(datos.metodo, 'TC')
  assert.match(datos.fecha, FORMATO_FECHA)
})

test('acepta todos los delimitadores', () => {
  assert.equal(datosDe('1200 | uber | transporte | hoy | ef').categoria, 'Transporte')
  assert.equal(datosDe('89990 - spotify - suscripciones').categoria, 'Suscripciones')
  assert.equal(datosDe('15000/jumbo//ef').categoria, 'Mercado')
})

test('el monto acepta $ y puntos de miles', () => {
  assert.equal(datosDe('45000, netflix').monto, 45000)
  assert.equal(datosDe('$45.000, netflix').monto, 45000)
  assert.equal(datosDe('$ 45.000, netflix').monto, 45000)
  assert.equal(datosDe('1.234.567, netflix').monto, 1234567)
})

// La coma siempre parte los campos, así que no sirve como separador de miles:
// "45,000" se lee como monto 45. Queda documentado para que el día que cambie
// el delimitador se note aquí.
test('la coma siempre es delimitador de campos, nunca separador de miles', () => {
  assert.equal(datosDe('45,000, netflix').monto, 45)
})

test('en el sufijo k el punto es decimal, no separador de miles', () => {
  assert.equal(datosDe('12k, cabify').monto, 12000)
  assert.equal(datosDe('12K, cabify').monto, 12000)
  assert.equal(datosDe('12.5k, cabify').monto, 12500)
  assert.equal(datosDe('1.5k, cabify').monto, 1500)
  assert.equal(datosDe('0.5k, cabify').monto, 500)
})

test('un monto que no es un número válido es un error', () => {
  for (const input of ['abc, netflix', '0, netflix', '12.34, netflix', '1.2.3k, netflix', '12kk, netflix']) {
    const resultado = parsearGasto(input)
    assert.equal(resultado.ok, false, `"${input}" no debería parsear`)
    assert.ok(
      resultado.errores.some((e) => /Monto inválido/.test(e)),
      `"${input}" debería dar error de monto: ${resultado.errores.join(' · ')}`
    )
  }
})

test('la categoría del campo gana sobre el item', () => {
  const datos = datosDe('5000, sushi, transporte, hoy, ef')
  assert.equal(datos.categoria, 'Transporte')
  assert.equal(datos.categoriaSrc, 'campo')
})

test('una categoría vacía se infiere del item', () => {
  const resultado = parsearGasto('2800, rappi, , ayer, tc')
  assert.ok(resultado.ok)
  assert.equal(resultado.datos.categoria, 'Delivery')
  assert.equal(resultado.datos.categoriaSrc, 'item')
  assert.equal(resultado.advertencias.length, 0)
})

test('una categoría desconocida advierte y cae al item', () => {
  const resultado = parsearGasto('5000, sushi rappi, gadgets, hoy, tc')
  assert.ok(resultado.ok)
  assert.equal(resultado.datos.categoria, 'Delivery')
  assert.equal(resultado.datos.categoriaSrc, 'item')
  assert.ok(resultado.advertencias.some((a) => /no reconocida/.test(a)))
})

test('si no se puede inferir nada queda Sin categoría con advertencia', () => {
  const resultado = parsearGasto('5000, cosa rara')
  assert.ok(resultado.ok)
  assert.equal(resultado.datos.categoria, 'Sin categoría')
  assert.equal(resultado.datos.categoriaSrc, 'ninguna')
  assert.ok(resultado.advertencias.some((a) => /No se pudo inferir/.test(a)))
})

test('el método por defecto es TC y avisa', () => {
  const resultado = parsearGasto('5000, netflix, suscripciones')
  assert.equal(resultado.datos.metodo, 'TC')
  assert.ok(resultado.advertencias.some((a) => /se asumió TC/.test(a)))
})

test('normaliza los alias de método de pago', () => {
  assert.equal(datosDe('5000, netflix, , hoy, ef').metodo, 'EF')
  assert.equal(datosDe('5000, netflix, , hoy, efectivo').metodo, 'EF')
  assert.equal(datosDe('5000, netflix, , hoy, cash').metodo, 'EF')
  assert.equal(datosDe('5000, netflix, , hoy, tarjeta').metodo, 'TC')
  assert.equal(datosDe('5000, netflix, , hoy, crédito').metodo, 'TC')
})

test('un método desconocido avisa y cae a TC', () => {
  const resultado = parsearGasto('5000, netflix, , hoy, bitcoin')
  assert.equal(resultado.datos.metodo, 'TC')
  assert.ok(resultado.advertencias.some((a) => /no reconocido/.test(a)))
})

test('una fecha inválida es un error del gasto completo', () => {
  const resultado = parsearGasto('5000, netflix, suscripciones, 31/02, tc')
  assert.equal(resultado.ok, false)
  assert.equal(resultado.datos, null)
  assert.ok(resultado.errores.some((e) => /Fecha inválida/.test(e)))
})

test('una fecha que no se entiende solo advierte', () => {
  const resultado = parsearGasto('5000, netflix, suscripciones, cuando sea, tc')
  assert.ok(resultado.ok)
  assert.ok(resultado.advertencias.some((a) => /No se reconoció la fecha/.test(a)))
})

test('faltan campos obligatorios', () => {
  assert.deepEqual(parsearGasto('').errores, ['Input vacío'])
  assert.deepEqual(parsearGasto('   ').errores, ['Input vacío'])

  const sinDelimitador = parsearGasto('solocampo')
  assert.equal(sinDelimitador.ok, false)
  assert.ok(sinDelimitador.errores.some((e) => /al menos 2 campos/.test(e)))

  const sinItem = parsearGasto('5000, ')
  assert.equal(sinItem.ok, false)
  assert.ok(sinItem.errores.some((e) => /Item vacío/.test(e)))
})

test('acumula todos los errores en vez de cortar en el primero', () => {
  const resultado = parsearGasto('abc, , suscripciones, 31/02, tc')
  assert.equal(resultado.ok, false)
  assert.equal(resultado.errores.length, 3)
})
