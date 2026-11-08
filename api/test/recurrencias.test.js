const { test } = require('node:test')
const assert = require('node:assert')

// Igual que en `app.test.js`: `src/supabase.js` exige estas variables al
// importarse y las rutas lo importan. Ningún test de este archivo llega a la
// base: todos cortan antes, en el auth o en la validación.
process.env.SUPABASE_URL ||= 'https://ejemplo.supabase.co'
process.env.SUPABASE_ANON_KEY ||= 'anon-de-prueba'

const request = require('supertest')

const { crearApp } = require('../src/app')
const {
  validarIdDeRecurrencia,
  validarPropuesta,
  zonaDelPedido,
} = require('../src/recurrencias/validacion')

const app = crearApp({
  origenesPermitidos: ['http://localhost:3000'],
  zona: 'America/Santiago',
  limites: { porMinutoSinSesion: 10_000, porMinutoConSesion: 10_000, porMinutoSalud: 10_000 },
})

const UUID = '0f1c6b5a-9d2e-4c3b-8a7f-1e2d3c4b5a69'

test('todas las rutas de recurrencias piden sesión', async () => {
  // Ninguna es pública: un plan es información del perfil, y confirmar escribe
  // un movimiento.
  for (const pedir of [
    () => request(app).get('/recurrencias'),
    () => request(app).get('/recurrencias/propuestas'),
    () => request(app).post('/recurrencias').send({ input: '1000, pan', frecuencia: 'mensual' }),
    () => request(app).patch(`/recurrencias/${UUID}`).send({ desde: '2026-05-01', monto: 1 }),
    () =>
      request(app)
        .post('/recurrencias/propuestas/confirmar')
        .send({ recurrenciaId: UUID, fecha: '2026-05-01' }),
    () =>
      request(app)
        .post('/recurrencias/propuestas/omitir')
        .send({ recurrenciaId: UUID, fecha: '2026-05-01' }),
    () =>
      request(app).delete(
        `/recurrencias/propuestas/omitida?recurrenciaId=${UUID}&fecha=2026-05-01`
      ),
  ]) {
    const res = await pedir()
    assert.strictEqual(res.status, 401)
    assert.strictEqual(res.body.error, 'Token requerido')
  }
})

test('el id de un plan se valida después de la sesión y no antes', async () => {
  // Mismo orden que en gastos y en preferencias: con la validación primero, un
  // id mal escrito le diría a cualquiera sin token qué forma tiene uno válido.
  const res = await request(app).patch('/recurrencias/no-es-un-uuid').send({ desde: '2026-05-01' })

  assert.strictEqual(res.status, 401)
  assert.strictEqual(res.body.error, 'Token requerido')
})

test('una recurrencia no se edita sin id', async () => {
  // Si `PATCH /recurrencias` cayera en la ruta de la colección, una edición
  // masiva quedaría a un slash de distancia.
  const res = await request(app).patch('/recurrencias').send({ desde: '2026-05-01' })

  assert.strictEqual(res.status, 404)
  assert.strictEqual(res.body.ok, false)
})

test('"propuestas" no se lee como el id de un plan', async () => {
  // El orden de las rutas importa: `/propuestas` está declarada antes que
  // `/:id`. Con el orden al revés, la lista de propuestas respondería 400
  // diciendo que "propuestas" no es un uuid.
  const res = await request(app).get('/recurrencias/propuestas')

  assert.strictEqual(res.status, 401)
  assert.strictEqual(res.body.error, 'Token requerido')
})

// ── La validación, sin servidor ─────────────────────────────────────────────

test('el id de una recurrencia tiene que ser un uuid', () => {
  assert.strictEqual(validarIdDeRecurrencia(UUID).ok, true)
  assert.strictEqual(validarIdDeRecurrencia('hola').ok, false)
  assert.strictEqual(validarIdDeRecurrencia(undefined).ok, false)
})

test('una propuesta se identifica con el plan y la fecha prevista', () => {
  const res = validarPropuesta({ recurrenciaId: UUID, fecha: '2026-05-01' })
  assert.strictEqual(res.ok, true)
  assert.deepStrictEqual(res.valor, { recurrenciaId: UUID, fecha: '2026-05-01' })
})

test('una fecha que no existe en el calendario se rechaza', () => {
  const res = validarPropuesta({ recurrenciaId: UUID, fecha: '2026-02-31' })
  assert.strictEqual(res.ok, false)
  assert.ok(res.errores.some((e) => e.includes('fecha')))
})

test('la propuesta junta los dos errores en vez de decir uno solo', () => {
  const res = validarPropuesta({})
  assert.strictEqual(res.ok, false)
  assert.strictEqual(res.errores.length, 2)
})

test('una zona que no existe advierte y cae al default', () => {
  // Rechazar dejaría a un dispositivo con la zona mal configurada sin ver
  // ninguna propuesta, que es peor que verlas con el día de otra zona.
  const res = zonaDelPedido('Marte/Olympus', 'America/Santiago')
  assert.strictEqual(res.zona, 'America/Santiago')
  assert.ok(res.advertencias[0].includes('Marte/Olympus'))
})

test('una zona válida se usa tal cual y no advierte', () => {
  const res = zonaDelPedido('Europe/Madrid', 'America/Santiago')
  assert.strictEqual(res.zona, 'Europe/Madrid')
  assert.deepStrictEqual(res.advertencias, [])
})

test('sin zona en el pedido se usa la de la config', () => {
  const res = zonaDelPedido(undefined, 'America/Santiago')
  assert.strictEqual(res.zona, 'America/Santiago')
  assert.deepStrictEqual(res.advertencias, [])
})
