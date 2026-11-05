const assert = require('node:assert/strict')
const { test } = require('node:test')

const {
  ZONAS,
  buscarZonas,
  catalogoDeZonas,
  desplazamientoDeZona,
  etiquetaDeDesplazamiento,
  nombreDeZona,
} = require('../zonas')

// Un instante de invierno en el hemisferio sur, para que el horario de verano
// de Chile no esté activo y los desplazamientos sean los de referencia.
const INVIERNO = new Date('2026-07-15T12:00:00Z')
const VERANO = new Date('2026-01-15T12:00:00Z')

test('el desplazamiento sigue al horario de verano', () => {
  // Si estuviera escrito en una tabla, uno de los dos estaría mal medio año.
  assert.equal(desplazamientoDeZona('America/Santiago', INVIERNO), -240)
  assert.equal(desplazamientoDeZona('America/Santiago', VERANO), -180)
})

test('una zona que Intl no conoce devuelve null, no 0', () => {
  // Cero es un desplazamiento real: confundirlo con "no sé" pondría la zona
  // inventada en el grupo de UTC.
  assert.equal(desplazamientoDeZona('America/Narnia'), null)
  assert.equal(desplazamientoDeZona(''), null)
  assert.equal(desplazamientoDeZona(undefined), null)
})

test('los desplazamientos que no son horas enteras se calculan igual', () => {
  assert.equal(desplazamientoDeZona('Asia/Kolkata', INVIERNO), 330)
  assert.equal(desplazamientoDeZona('Asia/Kathmandu', INVIERNO), 345)
  assert.equal(desplazamientoDeZona('Pacific/Tongatapu', INVIERNO), 780)
})

test('la etiqueta lleva el signo y los dos puntos', () => {
  assert.equal(etiquetaDeDesplazamiento(-180), '(UTC-03:00)')
  assert.equal(etiquetaDeDesplazamiento(0), '(UTC+00:00)')
  assert.equal(etiquetaDeDesplazamiento(345), '(UTC+05:45)')
  assert.equal(etiquetaDeDesplazamiento(-270), '(UTC-04:30)')
})

test('una etiqueta sin desplazamiento queda vacía', () => {
  assert.equal(etiquetaDeDesplazamiento(null), '')
  assert.equal(etiquetaDeDesplazamiento(NaN), '')
})

test('el nombre mostrado pierde los guiones bajos y conserva la región', () => {
  assert.equal(nombreDeZona('America/Los_Angeles'), 'Los Angeles')
  assert.equal(nombreDeZona('America/Argentina/Buenos_Aires'), 'Buenos Aires, Argentina')
  assert.equal(nombreDeZona('UTC'), 'UTC')
})

test('el catálogo va de oeste a este', () => {
  const catalogo = catalogoDeZonas(INVIERNO)
  const minutos = catalogo.map((z) => z.minutos)
  assert.deepEqual(minutos, [...minutos].sort((a, b) => a - b))
})

test('el catálogo no deja ninguna zona del listado afuera en Node', () => {
  // En Hermes puede faltar alguna y por eso se filtran, pero si en Node falta
  // una es que está mal escrita en el listado.
  assert.equal(catalogoDeZonas(INVIERNO).length, ZONAS.length)
})

test('dentro del mismo desplazamiento el orden es alfabético', () => {
  const tres = catalogoDeZonas(INVIERNO).filter((z) => z.minutos === -180)
  const nombres = tres.map((z) => z.nombre)
  assert.deepEqual(nombres, [...nombres].sort((a, b) => a.localeCompare(b)))
})

test('la búsqueda encuentra por nombre, por nombre IANA y por desplazamiento', () => {
  const catalogo = catalogoDeZonas(INVIERNO)
  assert.deepEqual(
    buscarZonas('madrid', catalogo).map((z) => z.zona),
    ['Europe/Madrid']
  )
  assert.ok(buscarZonas('Europe/', catalogo).length > 10)
  assert.ok(buscarZonas('+05:45', catalogo).some((z) => z.zona === 'Asia/Kathmandu'))
})

test('la búsqueda ignora tildes y mayúsculas', () => {
  const catalogo = [{ zona: 'America/Cordoba', nombre: 'Córdoba', minutos: -180, desplazamiento: '(UTC-03:00)' }]
  assert.equal(buscarZonas('CORDOBA', catalogo).length, 1)
  assert.equal(buscarZonas('córdoba', catalogo).length, 1)
})

test('sin texto la búsqueda devuelve el catálogo completo', () => {
  const catalogo = catalogoDeZonas(INVIERNO)
  assert.equal(buscarZonas('', catalogo).length, catalogo.length)
  assert.equal(buscarZonas('   ', catalogo).length, catalogo.length)
})
