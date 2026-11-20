import { finDelMes, isoDelDia, nombreRelativoDelDia, tituloDelDia } from '../fechas'

test('el ISO del día se arma con las partes locales y no en UTC', () => {
  // `new Date('2026-03-05')` se lee en UTC, y en Chile eso corre el día para
  // atrás: el picker abría en el 4.
  expect(isoDelDia(new Date(2026, 2, 5))).toBe('2026-03-05')
})

test('"Hoy" y "Ayer" se cuentan desde medianoche', () => {
  const hoy = new Date(2026, 2, 5, 23, 30)

  expect(nombreRelativoDelDia(new Date(2026, 2, 5, 0, 10), hoy)).toBe('Hoy')
  expect(nombreRelativoDelDia(new Date(2026, 2, 4, 22, 0), hoy)).toBe('Ayer')
  expect(nombreRelativoDelDia(new Date(2026, 2, 3), hoy)).toBeNull()
})

test('el título de un día cualquiera va abreviado y sin punto', () => {
  expect(tituloDelDia('2026-03-05')).toBe('Jue 5')
})

test('una fecha que no se puede leer no se muestra como un día', () => {
  expect(tituloDelDia('')).toBe('Desconocido')
  expect(tituloDelDia('05/03/2026')).toBe('Desconocido')
})

test('el fin de mes no necesita saber cuántos días tiene', () => {
  expect(finDelMes(2, 2028)).toBe('2028-02-29')
  expect(finDelMes(11, 2026)).toBe('2026-11-30')
})
