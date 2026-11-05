const { test } = require('node:test')
const assert = require('node:assert')

const { DEFAULTS, conDefaults } = require('../src/perfil/preferencias')
const { validarPreferencias } = require('../src/perfil/validacion')

// `validarPreferencias` y `conDefaults` son funciones puras: no tocan la base
// ni piden sesión, así que se prueban sin levantar nada. Las rutas que las usan
// se prueban en `app.test.js`.

test('sin fila guardada devuelve los defaults, con las categorías apagadas', () => {
  const datos = conDefaults(null)

  assert.deepStrictEqual(datos, {
    categorias: { habilitado: true, activo: false },
    metodos: { habilitado: true, activo: false },
    zona: null,
  })
})

test('los defaults dejan todo habilitado y nada activo', () => {
  // Fija la decisión: hoy no hay nada que cobrar, así que `habilitado` nace en
  // true; `activo` nace en false porque la v1 sale sin categorías ni selector
  // de método. Si alguien cambia uno de los dos, este test lo cuenta.
  assert.strictEqual(DEFAULTS.categorias_habilitado, true)
  assert.strictEqual(DEFAULTS.categorias_activo, false)
  assert.strictEqual(DEFAULTS.metodos_habilitado, true)
  assert.strictEqual(DEFAULTS.metodos_activo, false)
  assert.strictEqual(DEFAULTS.zona, null)
})

test('la fila guardada pisa a los defaults, campo por campo', () => {
  const datos = conDefaults({ categorias_activo: true, zona: 'Europe/Madrid' })

  assert.strictEqual(datos.categorias.activo, true)
  // Lo que la fila no trae sigue viniendo del default.
  assert.strictEqual(datos.categorias.habilitado, true)
  assert.strictEqual(datos.metodos.activo, false)
  assert.strictEqual(datos.zona, 'Europe/Madrid')
})

test('acepta los flags y los traduce a las columnas', () => {
  const r = validarPreferencias({ categoriasActivo: true, metodosActivo: false })

  assert.strictEqual(r.ok, true)
  assert.deepStrictEqual(r.valor, { categorias_activo: true, metodos_activo: false })
})

test('acepta una zona IANA válida', () => {
  const r = validarPreferencias({ zona: 'America/Argentina/Buenos_Aires' })

  assert.strictEqual(r.ok, true)
  assert.deepStrictEqual(r.valor, { zona: 'America/Argentina/Buenos_Aires' })
})

test('una zona inexistente se rechaza en vez de caer al default', () => {
  // Al revés que al registrar un movimiento, donde una zona desconocida
  // advierte y sigue. Acá la zona es lo que el usuario pidió cambiar, así que
  // guardar otra en silencio es peor que no guardar nada.
  const r = validarPreferencias({ zona: 'Marte/Olympus' })

  assert.strictEqual(r.ok, false)
  assert.match(r.errores[0], /no es una zona horaria IANA válida/)
})

test('`zona: null` es válido y significa volver a la del dispositivo', () => {
  const r = validarPreferencias({ zona: null })

  assert.strictEqual(r.ok, true)
  assert.deepStrictEqual(r.valor, { zona: null })
})

test('un flag que no es booleano se rechaza', () => {
  const r = validarPreferencias({ categoriasActivo: 'true' })

  assert.strictEqual(r.ok, false)
  assert.match(r.errores[0], /debe ser true o false/)
})

test('no se puede cambiar `habilitado` desde la ruta', () => {
  // Es el entitlement: lo escribe quien procese el pago, no el usuario. Si
  // pasara la validación, cualquiera se prendería una función paga con un
  // PATCH.
  const r = validarPreferencias({ categoriasHabilitado: true })

  assert.strictEqual(r.ok, false)
  assert.match(r.errores[0], /Campos no reconocidos: categoriasHabilitado/)
})

test('un cuerpo vacío se rechaza en vez de responder que no cambió nada', () => {
  const r = validarPreferencias({})

  assert.strictEqual(r.ok, false)
  assert.match(r.errores[0], /No se envió ningún campo/)
})

test('junta todos los errores en vez de cortar en el primero', () => {
  const r = validarPreferencias({ categoriasActivo: 'sí', zona: 'Marte/Olympus' })

  assert.strictEqual(r.ok, false)
  assert.strictEqual(r.errores.length, 2)
})
