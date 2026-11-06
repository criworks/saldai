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
// Los límites van altos a propósito: los tests de este archivo prueban las
// rutas, no el limitador, y con los números de producción un test de más por
// ruta empezaría a devolver 429. El limitador tiene sus propios tests, con
// límites chicos, en `limites.test.js`.
const app = crearApp({
  origenesPermitidos: ['http://localhost:3000'],
  zona: 'America/Santiago',
  limites: { porMinutoSinSesion: 10_000, porMinutoConSesion: 10_000, porMinutoSalud: 10_000 },
})

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

test('POST /gastos/parsear acepta la zona del cliente y no filtra el contexto', async () => {
  const res = await request(app)
    .post('/gastos/parsear')
    .send({ input: '45000, uber, transporte, 15/02/2026, ef', zona: 'Europe/Madrid' })

  assert.strictEqual(res.status, 200)
  assert.strictEqual(res.body.ok, true)
  // El contexto se guarda en la fila, no se devuelve: la respuesta de la API es
  // un contrato que mobile tipa en `index.d.ts`.
  assert.strictEqual(res.body.contexto, undefined)
})

test('POST /gastos/parsear con una zona inexistente advierte y no rechaza', async () => {
  const res = await request(app)
    .post('/gastos/parsear')
    .send({ input: '45000, uber, transporte, 15/02/2026, ef', zona: 'Marte/Olympus' })

  assert.strictEqual(res.status, 200)
  assert.strictEqual(res.body.ok, true)
  assert.strictEqual(res.body.datos.fecha, '2026-02-15')
  assert.ok(res.body.advertencias.some(a => a.includes('Marte/Olympus')))
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
    () => request(app).delete('/perfil'),
    () => request(app).get('/perfil/preferencias'),
    () => request(app).patch('/perfil/preferencias').send({ categoriasActivo: true }),
    () =>
      request(app)
        .patch('/gastos/0f1c6b5a-9d2e-4c3b-8a7f-1e2d3c4b5a69')
        .send({ monto: 50000 }),
    () => request(app).delete('/gastos/0f1c6b5a-9d2e-4c3b-8a7f-1e2d3c4b5a69'),
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

test('una ruta que no existe responde 404 con la forma de siempre', async () => {
  const res = await request(app).get('/noexiste')

  assert.strictEqual(res.status, 404)
  assert.strictEqual(res.body.ok, false)
  assert.match(res.body.errores[0], /No existe la ruta GET \/noexiste/)
  assert.strictEqual(res.body.datos, null)
})

test('un cuerpo que no es JSON válido responde 400 y no 500', async () => {
  const res = await request(app)
    .post('/gastos/parsear')
    .set('Content-Type', 'application/json')
    .send('{esto no es json')

  assert.strictEqual(res.status, 400)
  assert.strictEqual(res.body.ok, false)
  assert.match(res.body.errores[0], /no es JSON válido/)
})

test('un cuerpo más grande que el límite responde 413', async () => {
  const res = await request(app)
    .post('/gastos/parsear')
    .send({ input: 'a'.repeat(20 * 1024) })

  assert.strictEqual(res.status, 413)
  assert.strictEqual(res.body.ok, false)
  assert.match(res.body.errores[0], /demasiado grande/)
})

test('helmet pone las cabeceras y saca la que delata el servidor', async () => {
  const res = await request(app).get('/health')

  assert.strictEqual(res.headers['x-content-type-options'], 'nosniff')
  assert.strictEqual(res.headers['x-frame-options'], 'SAMEORIGIN')
  assert.ok(res.headers['strict-transport-security'])
  // Express manda `X-Powered-By: Express` por defecto, que le dice a cualquiera
  // con qué está escrita la API. Helmet la quita.
  assert.strictEqual(res.headers['x-powered-by'], undefined)
})

test('/perfil solo acepta DELETE', async () => {
  // El borrado de cuenta no se puede disparar con un GET, que es lo que haría
  // cualquier cosa que siga links: un prefetch del navegador, un bot, el
  // preview de un chat.
  for (const pedir of [
    () => request(app).get('/perfil'),
    () => request(app).post('/perfil'),
  ]) {
    const res = await pedir()
    assert.strictEqual(res.status, 404)
    assert.strictEqual(res.body.ok, false)
  }
})

test('PATCH /perfil/preferencias pide sesión antes de validar el cuerpo', async () => {
  // El orden importa: `requireAuth` va antes que la validación, así un cuerpo
  // inválido sin token responde 401 y no 400. Si fuera al revés, la ruta
  // contaría qué campos existen a quien no está autenticado.
  const res = await request(app).patch('/perfil/preferencias').send({ campoInventado: 1 })

  assert.strictEqual(res.status, 401)
  assert.strictEqual(res.body.error, 'Token requerido')
})

test('editar y borrar un movimiento piden sesión antes de mirar el id', async () => {
  // Mismo orden que en las preferencias: `requireAuth` antes de validar. Si
  // fuera al revés, un id mal escrito respondería 400 y le diría a cualquiera
  // sin token qué forma tiene un id válido.
  for (const pedir of [
    () => request(app).patch('/gastos/no-es-un-uuid').send({ monto: 1 }),
    () => request(app).delete('/gastos/no-es-un-uuid'),
  ]) {
    const res = await pedir()
    assert.strictEqual(res.status, 401)
    assert.strictEqual(res.body.error, 'Token requerido')
  }
})

test('los gastos no se borran ni se editan sin id', async () => {
  // `DELETE /gastos` sin id no existe: si cayera en la ruta de la colección,
  // un borrado masivo quedaría a un slash de distancia.
  for (const pedir of [
    () => request(app).delete('/gastos'),
    () => request(app).patch('/gastos').send({ monto: 1 }),
  ]) {
    const res = await pedir()
    assert.strictEqual(res.status, 404)
    assert.strictEqual(res.body.ok, false)
  }
})
