import { ventanaDePropuestas } from '../ventana'

test('la ventana llega al último día del mes que se está mirando', () => {
  // Es lo que deja ver, al abrir un mes, lo que el plan dice que todavía falta
  // en ese mes y no solo lo que ya ocurrió.
  const hoy = new Date(2026, 10, 20) // 20 de noviembre
  expect(ventanaDePropuestas(11, 2026, hoy)).toBe('2026-11-30')
  expect(ventanaDePropuestas(12, 2026, hoy)).toBe('2026-12-31')
  // Febrero del 2028 es bisiesto: el último día sale del calendario y no de una
  // tabla de largos de mes escrita a mano.
  expect(ventanaDePropuestas(2, 2028, hoy)).toBe('2028-02-29')
})

test('mirando un mes viejo la ventana no baja de hoy', () => {
  // Sin este piso, abrir septiembre haría desaparecer las propuestas de
  // octubre y de noviembre, que son justo las que se están olvidando, y con
  // ellas el aviso que las cuenta.
  const hoy = new Date(2026, 10, 20)
  expect(ventanaDePropuestas(9, 2026, hoy)).toBe('2026-11-20')
})

test('el último día del mes es la ventana, no el día siguiente', () => {
  // Un error de uno acá pediría propuestas del mes que viene y las dejaría sin
  // día donde mostrarse.
  const hoy = new Date(2026, 1, 10) // 10 de febrero
  expect(ventanaDePropuestas(2, 2026, hoy)).toBe('2026-02-28')
})
