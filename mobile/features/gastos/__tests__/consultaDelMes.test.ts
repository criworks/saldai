import { frescuraDelMes } from '../consultaDelMes'

const hoy = new Date(2026, 9, 31) // 31 de octubre de 2026

test('el mes en curso se revalida al minuto', () => {
  expect(frescuraDelMes(10, 2026, hoy)).toBe(60_000)
})

test('un mes que no es el en curso no vence solo: lo invalida el alta de un gasto', () => {
  expect(frescuraDelMes(9, 2026, hoy)).toBe(Infinity)
  expect(frescuraDelMes(11, 2026, hoy)).toBe(Infinity)
})

test('el mismo mes de otro año no cuenta como el en curso', () => {
  expect(frescuraDelMes(10, 2025, hoy)).toBe(Infinity)
})
