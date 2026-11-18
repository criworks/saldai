const { test } = require('node:test')
const assert = require('node:assert')
const Module = require('node:module')

process.env.SUPABASE_URL ||= 'https://ejemplo.supabase.co'
process.env.SUPABASE_ANON_KEY ||= 'anon-de-prueba'

// El cliente de Supabase se reemplaza por uno que solo anota contra qué objeto
// se consultó. No hay base en CI, así que lo que se puede comprobar acá es el
// objeto que el repositorio elige, que es justo lo que se rompe en silencio: si
// alguien devuelve `listar` a la tabla, la app deja de recibir
// `recurrencia_id`, nada falla y el movimiento recurrente se ve como uno
// cualquiera.
const consultados = []

const encadenable = () => {
  const falso = {}
  for (const metodo of ['select', 'eq', 'gte', 'lt', 'ilike', 'order', 'insert', 'update', 'delete', 'single', 'maybeSingle']) {
    falso[metodo] = () => falso
  }
  return falso
}

const original = Module._load
Module._load = function (pedido, ...resto) {
  if (pedido === '@supabase/supabase-js') {
    return {
      createClient: () => ({
        from: (objeto) => {
          consultados.push(objeto)
          return encadenable()
        },
        rpc: () => encadenable(),
      }),
    }
  }
  return original.call(this, pedido, ...resto)
}

const { repositorioDeMovimientos } = require('../src/movimientos/repositorio')

Module._load = original

const USER = '11111111-1111-4111-8111-111111111111'

test('listar lee la vista con el plan, no la tabla', () => {
  consultados.length = 0
  repositorioDeMovimientos('token').listar({ userId: USER })

  assert.deepStrictEqual(consultados, ['movimientos_con_recurrencia'])
})

test('la vista también se usa con los filtros de mes y categoría', () => {
  consultados.length = 0
  repositorioDeMovimientos('token').listar({
    userId: USER,
    rango: { desde: '2026-11-01', hasta: '2026-12-01' },
    categoria: 'Hogar',
  })

  assert.deepStrictEqual(consultados, ['movimientos_con_recurrencia'])
})

test('escribir sigue siendo contra la tabla', () => {
  // La vista es de solo lectura: un insert o un update contra ella fallaría en
  // la base, y es el tipo de error que no aparece hasta producción porque los
  // tests no tienen base.
  consultados.length = 0
  const repositorio = repositorioDeMovimientos('token')

  repositorio.insertar(
    { monto: 1000, item: 'pan', metodo: 'EF', fecha: '2026-11-01' },
    { userId: USER, inputOriginal: '1000, pan', contexto: {} }
  )
  repositorio.buscar('id', { userId: USER })
  repositorio.actualizar('id', { userId: USER, campos: {}, camposEditados: [] })
  repositorio.eliminar('id', { userId: USER })

  assert.deepStrictEqual(consultados, ['movimientos', 'movimientos', 'movimientos', 'movimientos'])
})
