const { test } = require('node:test')
const assert = require('node:assert')

const {
  columnasDeLaRepeticion,
  parametrosDeLaRepeticion,
} = require('../src/recurrencias/columnas')

/**
 * La traducción de la regla de repetición a columnas y a parámetros.
 *
 * Son dos funciones tontas y tienen test por una sola razón: la misma regla se
 * escribe desde cuatro lugares, y lo que estos tests fijan es que los cuatro
 * nombres sean los de la tabla. Un nombre mal escrito en un `insert` de
 * Supabase no es un error de JavaScript: es una columna que se queda en null y
 * un plan que propone otra cosa.
 */

const REGLA = { diaDeLaSemana: 5, semanaDelMes: -1, diaDelMes: null, mesDelAnio: null }

test('la regla se traduce a los nombres de las columnas', () => {
  assert.deepStrictEqual(columnasDeLaRepeticion(REGLA), {
    dia_de_la_semana: 5,
    semana_del_mes: -1,
    dia_del_mes: null,
    mes_del_anio: null,
  })
})

test('la regla se traduce a los parámetros de las funciones de Postgres', () => {
  assert.deepStrictEqual(parametrosDeLaRepeticion(REGLA), {
    p_dia_de_la_semana: 5,
    p_semana_del_mes: -1,
    p_dia_del_mes: null,
    p_mes_del_anio: null,
  })
})

test('sin regla las cuatro columnas van en null y no quedan sin mandar', () => {
  // Mandar `undefined` en un update de Supabase deja la columna como estaba, y
  // entonces un "volvé a derivar del ancla" no limpiaría la regla vieja.
  for (const sinRegla of [undefined, null, {}]) {
    assert.deepStrictEqual(columnasDeLaRepeticion(sinRegla), {
      dia_de_la_semana: null,
      semana_del_mes: null,
      dia_del_mes: null,
      mes_del_anio: null,
    })
    assert.deepStrictEqual(parametrosDeLaRepeticion(sinRegla), {
      p_dia_de_la_semana: null,
      p_semana_del_mes: null,
      p_dia_del_mes: null,
      p_mes_del_anio: null,
    })
  }
})

test('el mes del año viaja en la regla de un plan anual', () => {
  assert.strictEqual(
    columnasDeLaRepeticion({ diaDeLaSemana: null, semanaDelMes: null, diaDelMes: null, mesDelAnio: 12 })
      .mes_del_anio,
    12
  )
})
