const test = require('node:test')
const assert = require('node:assert/strict')

const {
  rangoDelMes,
  rangoDelAnio,
  nombreDeMes,
  isoAChileno,
  chilenoAIso,
  mesDeIso,
  anioDeIso,
} = require('../fechas')

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

test('el nombre del mes va de 1 a 12', () => {
  assert.equal(nombreDeMes(1), 'Enero')
  assert.equal(nombreDeMes(12), 'Diciembre')
  assert.equal(nombreDeMes(0), '')
  assert.equal(nombreDeMes(13), '')
})

test('la fecha ISO se muestra como DD/MM/AAAA', () => {
  assert.equal(isoAChileno('2026-03-15'), '15/03/2026')
  // La API puede devolver un timestamp completo si alguien cambia la columna.
  assert.equal(isoAChileno('2026-03-15T00:00:00.000Z'), '15/03/2026')
})

test('una fecha vacía o rara no rompe el formateo', () => {
  assert.equal(isoAChileno(null), '')
  assert.equal(isoAChileno(''), '')
  assert.equal(isoAChileno('marzo'), 'marzo')
})

test('la fecha chilena vuelve a ISO rellenando con ceros', () => {
  assert.equal(chilenoAIso('15/03/2026'), '2026-03-15')
  assert.equal(chilenoAIso('5/3/2026'), '2026-03-05')
})

test('lo que no es DD/MM/AAAA no se convierte a ISO', () => {
  assert.equal(chilenoAIso('2026-03-15'), null)
  assert.equal(chilenoAIso(''), null)
  assert.equal(chilenoAIso(undefined), null)
})

test('se puede leer el mes y el año de una fecha ISO', () => {
  assert.equal(mesDeIso('2026-03-15'), 3)
  assert.equal(anioDeIso('2026-03-15'), 2026)
  assert.equal(mesDeIso('sin fecha'), null)
})
