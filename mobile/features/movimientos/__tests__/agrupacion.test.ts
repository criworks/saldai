import { agruparPorDia } from '../agrupacion'

test('agrupa por día, del más nuevo al más viejo', () => {
  const secciones = agruparPorDia([
    { fecha: '2026-03-01', item: 'a' },
    { fecha: '2026-03-05', item: 'b' },
    { fecha: '2026-03-01', item: 'c' },
  ])

  expect(secciones.map((s) => s.data)).toEqual([['b'], ['a', 'c']])
})

test('dentro de un día manda `orden`, y lo que no lo trae va primero', () => {
  // Es lo que pone las propuestas arriba de los movimientos del mismo día: son
  // lo único que pide una decisión.
  const secciones = agruparPorDia([
    { fecha: '2026-03-05', orden: 1, item: 'movimiento' },
    { fecha: '2026-03-05', orden: 0, item: 'propuesta' },
  ])

  expect(secciones).toHaveLength(1)
  expect(secciones[0].data).toEqual(['propuesta', 'movimiento'])
})

test('dos meses con el mismo título no se mezclan en un grupo', () => {
  // "Jue 26" lo escriben varios meses: si la llave del grupo fuera el título,
  // un movimiento de otro mes caería dentro de este.
  const secciones = agruparPorDia([
    { fecha: '2026-03-26', item: 'marzo' },
    { fecha: '2026-02-26', item: 'febrero' },
  ])

  expect(secciones.map((s) => s.data)).toEqual([['marzo'], ['febrero']])
})

test('una fecha ilegible no se ordena como si fuera de hoy', () => {
  const secciones = agruparPorDia([
    { fecha: '', item: 'rota' },
    { fecha: '2026-03-05', item: 'buena' },
  ])

  expect(secciones[0].data).toEqual(['buena'])
  expect(secciones[1]).toEqual({ titulo: 'Desconocido', data: ['rota'] })
})
