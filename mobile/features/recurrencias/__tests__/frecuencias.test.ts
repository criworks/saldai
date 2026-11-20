import { SIN_REPETICION } from '@saldai/core'
import {
  descripcionDeFrecuencia,
  descripcionDeRepeticion,
  reglaEfectiva,
} from '../frecuencias'

/**
 * Cómo se escribe la regla de repetición en pantalla.
 *
 * Lo que se prueba acá no es cosmético: la descripción es lo que hace visible
 * un ancla mal guardada —un plan que debía caer el 2 y dice "el 30"— sin
 * esperar un mes a que proponga. Y la regla efectiva es la que decide qué chip
 * aparece seleccionado cuando el usuario no eligió nada, que es casi siempre.
 */

// 2026-01-06 es un martes.
const ANCLA = '2026-01-06'

test('sin regla, la descripción sale del ancla', () => {
  expect(descripcionDeRepeticion('mensual', null, ANCLA)).toBe('Cada mes, el 6')
  expect(descripcionDeRepeticion('semanal', null, ANCLA)).toBe('Cada semana, los martes')
  expect(descripcionDeRepeticion('anual', null, ANCLA)).toBe('Cada año, el 6 de enero')
})

test('la regla elegida gana sobre el ancla', () => {
  expect(
    descripcionDeRepeticion('mensual', { diaDeLaSemana: 5, semanaDelMes: -1 }, ANCLA)
  ).toBe('Cada mes, el último viernes')
  expect(descripcionDeRepeticion('semanal', { diaDeLaSemana: 5 }, ANCLA)).toBe(
    'Cada semana, los viernes'
  )
  expect(
    descripcionDeRepeticion('anual', { mesDelAnio: 3, diaDeLaSemana: 1, semanaDelMes: 1 }, ANCLA)
  ).toBe('Cada año, el primer lunes de marzo')
})

test('sin ancla ni regla queda solo la frecuencia', () => {
  // Pasa en la captura antes de que haya fecha: decir "el 1" sería inventar.
  expect(descripcionDeRepeticion('mensual', null, null)).toBe(descripcionDeFrecuencia('mensual'))
})

test('la regla efectiva muestra seleccionado lo que sale del ancla', () => {
  expect(reglaEfectiva('mensual', SIN_REPETICION, ANCLA)).toEqual({
    diaDeLaSemana: null,
    semanaDelMes: null,
    diaDelMes: 6,
    mesDelAnio: null,
  })
  expect(reglaEfectiva('semanal', SIN_REPETICION, ANCLA)).toEqual({
    diaDeLaSemana: 2,
    semanaDelMes: null,
    diaDelMes: null,
    mesDelAnio: null,
  })
})

test('las dos formas del día no conviven en la regla efectiva', () => {
  // El core y un check de la tabla las rechazan juntas, así que elegir la del
  // día de la semana deja la del calendario en null y no al revés.
  expect(reglaEfectiva('mensual', { diaDeLaSemana: 5, semanaDelMes: -1 }, ANCLA)).toEqual({
    diaDeLaSemana: 5,
    semanaDelMes: -1,
    diaDelMes: null,
    mesDelAnio: null,
  })
})

test('un plan mensual no arrastra el mes del año', () => {
  // `mesDelAnio` solo vale en uno anual: dejarlo puesto al pasar de año a mes
  // sería un 400 al guardar.
  expect(reglaEfectiva('mensual', { mesDelAnio: 3 }, ANCLA).mesDelAnio).toBeNull()
})
