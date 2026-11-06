const { test } = require('node:test')
const assert = require('node:assert')

const { registrarMovimiento, esZonaValida } = require('../movimientos')
const { ZONA_DEFECTO } = require('../fechas-humanas')

test('devuelve el contexto que usó, para poder volver a derivar la fecha', () => {
  const hoy = new Date(Date.UTC(2026, 3, 3)) // 2026-04-03
  const r = registrarMovimiento('525457, arriendo abril, , Ayer, TC', {
    zona: 'America/Santiago',
    hoy,
  })

  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.datos.fecha, '2026-04-02')
  assert.deepStrictEqual(r.contexto, {
    zona: 'America/Santiago',
    hoyResuelto: '2026-04-03',
  })
})

test('con el contexto guardado, el replay da la misma fecha', () => {
  const primero = registrarMovimiento('1200, uber, , ayer, ef', {
    zona: 'Europe/Madrid',
    hoy: new Date(Date.UTC(2026, 10, 5)),
  })

  // Lo que haría un reproceso leyendo `zona` y `hoy_resuelto` de la fila.
  const replay = registrarMovimiento('1200, uber, , ayer, ef', {
    zona: primero.contexto.zona,
    hoy: new Date(`${primero.contexto.hoyResuelto}T00:00:00Z`),
  })

  assert.strictEqual(replay.datos.fecha, primero.datos.fecha)
})

test('una zona que no existe advierte y cae al default, no rechaza', () => {
  const r = registrarMovimiento('1000, café, , 15/02/2026, ef', { zona: 'Marte/Olympus' })

  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.contexto.zona, ZONA_DEFECTO)
  assert.ok(r.advertencias.some(a => a.includes('Marte/Olympus')))
})

test('sin zona usa el default y lo deja escrito en el contexto', () => {
  const r = registrarMovimiento('1000, café, , 15/02/2026, ef')

  assert.strictEqual(r.contexto.zona, ZONA_DEFECTO)
  assert.match(r.contexto.hoyResuelto, /^\d{4}-\d{2}-\d{2}$/)
})

test('las advertencias de la zona no tapan las del parser', () => {
  const r = registrarMovimiento('1000, algo raro, categoriainventada, 15/02/2026, ef', {
    zona: 'Marte/Olympus',
  })

  assert.ok(r.advertencias.length >= 2, `esperaba dos o más: ${JSON.stringify(r.advertencias)}`)
  assert.ok(r.advertencias.some(a => a.includes('Marte/Olympus')))
  assert.ok(r.advertencias.some(a => a.includes('categoriainventada')))
})

test('un input inválido sigue siendo rechazado, con contexto igual', () => {
  const r = registrarMovimiento('no es un monto', { zona: 'America/Santiago' })

  assert.strictEqual(r.ok, false)
  assert.ok(r.errores.length > 0)
  assert.strictEqual(r.contexto.zona, 'America/Santiago')
})

test('esZonaValida distingue una zona IANA de cualquier texto', () => {
  assert.strictEqual(esZonaValida('America/Santiago'), true)
  assert.strictEqual(esZonaValida('UTC'), true)
  assert.strictEqual(esZonaValida('Marte/Olympus'), false)
  assert.strictEqual(esZonaValida(''), false)
  assert.strictEqual(esZonaValida(undefined), false)
})

test('la zona del cliente cambia el día, que es el punto del cambio', () => {
  // 2026-11-05T02:00Z: en Chile es todavía el 4, en Madrid ya es el 5.
  const enChile = registrarMovimiento('1000, café', {
    zona: 'America/Santiago',
    hoy: new Date(Date.UTC(2026, 10, 4)),
  })
  const enMadrid = registrarMovimiento('1000, café', {
    zona: 'Europe/Madrid',
    hoy: new Date(Date.UTC(2026, 10, 5)),
  })

  assert.strictEqual(enChile.datos.fecha, '2026-11-04')
  assert.strictEqual(enMadrid.datos.fecha, '2026-11-05')
})
