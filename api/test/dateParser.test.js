const test = require('node:test')
const assert = require('node:assert/strict')

const { parsearFecha, ZONA_HORARIA } = require('../src/dateParser')

// Jueves 15 de octubre de 2026. Todos los casos relativos se miden desde aquí,
// así los tests no cambian de resultado según el día en que se corran.
const HOY = new Date(Date.UTC(2026, 9, 15))

const fechaDe = (input) => parsearFecha(input, HOY).fechaStr

test('la zona horaria por defecto es la de Chile', () => {
  assert.equal(ZONA_HORARIA, 'America/Santiago')
})

test('sin input o con "hoy" devuelve el día de referencia', () => {
  assert.equal(fechaDe(undefined), '15/10/2026')
  assert.equal(fechaDe(''), '15/10/2026')
  assert.equal(fechaDe('hoy'), '15/10/2026')
  assert.equal(fechaDe('HOY'), '15/10/2026')
  assert.equal(fechaDe('today'), '15/10/2026')
})

test('ayer y anteayer restan días', () => {
  assert.equal(fechaDe('ayer'), '14/10/2026')
  assert.equal(fechaDe('anteayer'), '13/10/2026')
})

test('un día de la semana apunta al más reciente ya pasado', () => {
  assert.equal(fechaDe('lunes'), '12/10/2026')
  assert.equal(fechaDe('el lunes'), '12/10/2026')
  assert.equal(fechaDe('miércoles'), '14/10/2026')
  assert.equal(fechaDe('miercoles'), '14/10/2026')
})

test('el día de la semana de hoy se entiende como la semana pasada', () => {
  assert.equal(fechaDe('jueves'), '08/10/2026')
})

test('solo el número de día usa este mes si ya ocurrió', () => {
  assert.equal(fechaDe('5'), '05/10/2026')
  assert.equal(fechaDe('15'), '15/10/2026')
})

test('solo el número de día retrocede un mes si todavía no llega', () => {
  assert.equal(fechaDe('20'), '20/09/2026')
})

test('un día que no existe en el mes anterior es un error', () => {
  const resultado = parsearFecha('31', HOY)
  assert.equal(resultado.fechaStr, undefined)
  assert.match(resultado.error, /Fecha inválida/)
})

test('DD/MM y DD-MM asumen el año en curso', () => {
  assert.equal(fechaDe('15/02'), '15/02/2026')
  assert.equal(fechaDe('1-3'), '01/03/2026')
})

test('DD/MM retrocede un año si la fecha quedaría en el futuro', () => {
  assert.equal(fechaDe('20/12'), '20/12/2025')
})

test('DD/MM/YYYY se respeta tal cual, con año de 2 o 4 dígitos', () => {
  assert.equal(fechaDe('15/02/2024'), '15/02/2024')
  assert.equal(fechaDe('15-02-2024'), '15/02/2024')
  assert.equal(fechaDe('01/01/24'), '01/01/2024')
})

test('una fecha con forma válida pero inexistente es un error, no un silencio', () => {
  for (const input of ['31/02', '30/02/2026', '15/13', '0/5']) {
    const resultado = parsearFecha(input, HOY)
    assert.equal(resultado.fechaStr, undefined, `${input} no debería parsear`)
    assert.match(resultado.error, /Fecha inválida/)
  }
})

test('el 29 de febrero existe en año bisiesto', () => {
  assert.equal(fechaDe('29/02/2024'), '29/02/2024')
  assert.match(parsearFecha('29/02/2026', HOY).error, /Fecha inválida/)
})

test('un texto que no parece fecha advierte y usa hoy', () => {
  const resultado = parsearFecha('cuando sea', HOY)
  assert.equal(resultado.fechaStr, '15/10/2026')
  assert.match(resultado.advertencia, /No se reconoció la fecha/)
  assert.equal(resultado.error, undefined)
})

test('el cambio de mes y de año se cruza bien', () => {
  const primeroDeEnero = new Date(Date.UTC(2026, 0, 1))
  assert.equal(parsearFecha('ayer', primeroDeEnero).fechaStr, '31/12/2025')
  assert.equal(parsearFecha('15', primeroDeEnero).fechaStr, '15/12/2025')
})

test('devuelve la fecha en ISO para la base de datos y en DD/MM/AAAA para mostrar', () => {
  const resultado = parsearFecha('05/03/2026', HOY)
  assert.equal(resultado.fechaISO, '2026-03-05')
  assert.equal(resultado.fechaStr, '05/03/2026')
})

test('una fecha inválida no trae ISO', () => {
  assert.equal(parsearFecha('31/02/2026', HOY).fechaISO, undefined)
})
