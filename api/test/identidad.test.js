const test = require('node:test')
const assert = require('node:assert/strict')

const { idDeUsuario } = require('../src/identidad.js')

// El bug que estos casos fijan: server.js leía `req.user.sub`, que no es un
// campo del objeto de `supabase.auth.getUser`, así que el user_id de todas las
// consultas era el string "undefined" y Postgres las rechazaba.

test('el id sale del campo id del usuario de Supabase', () => {
  assert.equal(
    idDeUsuario({ id: '11111111-2222-3333-4444-555555555555', email: 'a@b.cl' }),
    '11111111-2222-3333-4444-555555555555'
  )
})

test('el claim sub del JWT no se usa como id', () => {
  // Un objeto con sub pero sin id no alcanza: es la confusión que causó el bug.
  assert.equal(idDeUsuario({ sub: '11111111-2222-3333-4444-555555555555' }), null)
})

test('un usuario sin id no entrega id', () => {
  assert.equal(idDeUsuario({}), null)
  assert.equal(idDeUsuario(null), null)
  assert.equal(idDeUsuario(undefined), null)
})

test('un id vacío o que no es string no entrega id', () => {
  assert.equal(idDeUsuario({ id: '' }), null)
  assert.equal(idDeUsuario({ id: 123 }), null)
})
