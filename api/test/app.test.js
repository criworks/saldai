const { test } = require('node:test')
const assert = require('node:assert')

// `src/supabase.js` exige estas variables al importarse, y las rutas lo
// importan. No se usan: ningún test de este archivo llega a la base.
process.env.SUPABASE_URL ||= 'https://ejemplo.supabase.co'
process.env.SUPABASE_ANON_KEY ||= 'anon-de-prueba'

const request = require('supertest')

const { crearApp } = require('../src/app')

// Separar la app del `listen()` es justamente lo que permite esto: montarla en
// un test y pegarle a las rutas de verdad, con el cors y el json puestos.
const app = crearApp({ origenesPermitidos: ['http://localhost:3000'], zona: 'America/Santiago' })

test('POST /gastos/parsear parsea sin pedir sesión', async () => {
  const res = await request(app)
    .post('/gastos/parsear')
    .send({ input: '45000, uber, transporte, 15/02/2026, ef' })

  assert.strictEqual(res.status, 200)
  assert.strictEqual(res.body.ok, true)
  assert.strictEqual(res.body.datos.monto, 45000)
  assert.strictEqual(res.body.datos.categoria, 'Transporte')
  assert.strictEqual(res.body.datos.fecha, '2026-02-15')
})

test('POST /gastos/parsear sin input responde 400 con el detalle', async () => {
  const res = await request(app).post('/gastos/parsear').send({})

  assert.strictEqual(res.status, 400)
  assert.strictEqual(res.body.ok, false)
  assert.match(res.body.errores[0], /'input' es requerido/)
  // Mobile lee `errores` en plural; el contrato incluye `advertencias`.
  assert.deepStrictEqual(res.body.advertencias, [])
})

test('un input que el parser rechaza responde 422, no 400', async () => {
  const res = await request(app).post('/gastos/parsear').send({ input: '45000, uber, , 31/02/2026' })

  assert.strictEqual(res.status, 422)
  assert.strictEqual(res.body.ok, false)
  assert.ok(res.body.errores.length > 0)
})

test('las rutas protegidas responden 401 sin token, antes de tocar la base', async () => {
  for (const pedir of [
    () => request(app).get('/gastos?mes=10'),
    () => request(app).get('/gastos/anuales?anio=2026'),
    () => request(app).post('/gastos').send({ input: '1000, pan' }),
  ]) {
    const res = await pedir()
    assert.strictEqual(res.status, 401)
    assert.strictEqual(res.body.error, 'Token requerido')
  }
})

test('GET /health responde sin tocar la base', async () => {
  const res = await request(app).get('/health')

  assert.strictEqual(res.status, 200)
  assert.strictEqual(res.body.status, 'ok')
})
