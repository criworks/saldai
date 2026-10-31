const { test } = require('node:test')
const assert = require('node:assert')

process.env.SUPABASE_URL ||= 'https://ejemplo.supabase.co'
process.env.SUPABASE_ANON_KEY ||= 'anon-de-prueba'

const express = require('express')
const request = require('supertest')

const { crearApp } = require('../src/app')
const { manejadorDeErrores } = require('../src/middleware/errores')

/** Una app con límites chicos, para no mandar cientos de pedidos. */
function appConLimites({ sinSesion = 1000, conSesion = 1000, salud = 1000 } = {}) {
  return crearApp({
    origenesPermitidos: [],
    zona: 'America/Santiago',
    limites: { porMinutoSinSesion: sinSesion, porMinutoConSesion: conSesion, porMinutoSalud: salud },
  })
}

test('la ruta sin sesión corta con 429 al pasarse del límite', async () => {
  const app = appConLimites({ sinSesion: 2 })
  const pedir = () => request(app).post('/gastos/parsear').send({ input: '1000, pan' })

  assert.strictEqual((await pedir()).status, 200)
  assert.strictEqual((await pedir()).status, 200)

  const cortado = await pedir()
  assert.strictEqual(cortado.status, 429)
  assert.strictEqual(cortado.body.ok, false)
  assert.match(cortado.body.errores[0], /Demasiados pedidos/)
})

test('el 429 trae la cabecera que dice cuándo reintentar', async () => {
  const app = appConLimites({ sinSesion: 1 })
  await request(app).post('/gastos/parsear').send({ input: '1000, pan' })

  const cortado = await request(app).post('/gastos/parsear').send({ input: '1000, pan' })
  assert.strictEqual(cortado.status, 429)
  assert.ok(cortado.headers['retry-after'] || cortado.headers['ratelimit'])
})

test('cada ruta tiene su propio cupo: gastar el de parsear no corta las otras', async () => {
  const app = appConLimites({ sinSesion: 1, conSesion: 10 })

  await request(app).post('/gastos/parsear').send({ input: '1000, pan' })
  assert.strictEqual((await request(app).post('/gastos/parsear').send({ input: '1000, pan' })).status, 429)

  // La ruta con sesión sigue respondiendo su 401 de siempre, no un 429.
  const conSesion = await request(app).get('/gastos?mes=10')
  assert.strictEqual(conSesion.status, 401)
})

test('/health no se limita: es el keep-alive de Render', async () => {
  const app = appConLimites({ sinSesion: 1, conSesion: 1 })

  for (let i = 0; i < 5; i++) {
    assert.strictEqual((await request(app).get('/health')).status, 200)
  }
})

test('un error inesperado responde 500 genérico y no filtra el stack', async () => {
  // Una app mínima con una ruta que explota: `crearApp` no tiene ninguna que
  // falle, y provocarlo de verdad es la única forma de ver qué sale al cliente.
  const app = express()
  app.get('/boom', () => {
    throw new Error('el secreto está en /etc/passwd')
  })
  app.use(manejadorDeErrores)

  const res = await request(app).get('/boom')

  assert.strictEqual(res.status, 500)
  assert.strictEqual(res.body.ok, false)
  assert.deepStrictEqual(res.body.errores, ['Error interno del servidor'])

  // Lo importante: ni el mensaje de la excepción ni el stack llegan al cliente.
  const cuerpo = JSON.stringify(res.body) + res.text
  assert.doesNotMatch(cuerpo, /etc\/passwd/)
  assert.doesNotMatch(cuerpo, /at Object|\.js:\d+/)
})

test('el cupo es por IP de cliente y no por IP del proxy', async () => {
  // Render termina TLS en su proxy, así que sin `trust proxy` todos los
  // clientes caen en el mismo cupo y el primero que se pase corta a todos.
  // Esto es lo que verifica que la app lee `X-Forwarded-For`.
  const app = appConLimites({ sinSesion: 1 })
  const pedir = (ip) =>
    request(app).post('/gastos/parsear').set('X-Forwarded-For', ip).send({ input: '1000, pan' })

  assert.strictEqual((await pedir('1.1.1.1')).status, 200)
  assert.strictEqual((await pedir('1.1.1.1')).status, 429)

  // Otra IP arranca con su propio cupo.
  assert.strictEqual((await pedir('2.2.2.2')).status, 200)
})

test('/health/db sí se limita: no pide sesión y consulta la base', async () => {
  const app = appConLimites({ salud: 1 })

  // La primera llega a la ruta: sin credenciales de verdad la consulta falla y
  // responde 500, pero lo que importa es que no la cortó el limitador.
  const primera = await request(app).get('/health/db')
  assert.notStrictEqual(primera.status, 429)

  const segunda = await request(app).get('/health/db')
  assert.strictEqual(segunda.status, 429)
  assert.match(segunda.body.errores[0], /Demasiados pedidos/)
})
