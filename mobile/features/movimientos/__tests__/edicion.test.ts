import type { Movimiento } from '@saldai/core'
import { borradorDe, cambioPendiente, hayAlgoQueGuardar } from '../edicion'

const MOVIMIENTO: Movimiento = {
  id: 'abc',
  monto: 45000,
  monto_formateado: '$45.000',
  item: 'uber',
  categoria: 'Transporte',
  fecha: '2026-02-15',
  metodo: 'TC',
  notas: null,
}

test('el borrador abre con el movimiento tal como está', () => {
  expect(borradorDe(MOVIMIENTO)).toEqual({
    monto: '45000',
    item: 'uber',
    categoria: 'Transporte',
    metodo: 'TC',
    fecha: '2026-02-15',
    notas: '',
  })
})

test('un movimiento sin categoría abre con el campo vacío, como el selector', () => {
  const borrador = borradorDe({ ...MOVIMIENTO, categoria: 'Sin categoría' })

  expect(borrador.categoria).toBe('')
})

test('sin tocar nada no hay nada que mandar', () => {
  expect(cambioPendiente(MOVIMIENTO, borradorDe(MOVIMIENTO))).toEqual({})
  expect(hayAlgoQueGuardar(MOVIMIENTO, borradorDe(MOVIMIENTO))).toBe(false)
})

test('se manda solo el campo que cambió, no el movimiento completo', () => {
  // Es lo que sostiene la marca de edición manual: la API marca los campos que
  // recibe, así que mandar los seis excluiría la fila de un reclasificar que no
  // tiene nada que ver con lo que el usuario corrigió.
  const borrador = { ...borradorDe(MOVIMIENTO), monto: '50000' }

  expect(cambioPendiente(MOVIMIENTO, borrador)).toEqual({ monto: 50000 })
  expect(hayAlgoQueGuardar(MOVIMIENTO, borrador)).toBe(true)
})

test('dejarlo sin categoría a mano sí es un cambio, y viaja con el nombre del catálogo', () => {
  const borrador = { ...borradorDe(MOVIMIENTO), categoria: '' }

  expect(cambioPendiente(MOVIMIENTO, borrador)).toEqual({ categoria: 'Sin categoría' })
})

test('vaciar una nota que tenía texto es un cambio: la borra', () => {
  const conNota = { ...MOVIMIENTO, notas: 'pago compartido' }
  const borrador = { ...borradorDe(conNota), notas: '' }

  expect(cambioPendiente(conNota, borrador)).toEqual({ notas: '' })
})

test('escribir la misma nota con espacios de más no es un cambio', () => {
  const conNota = { ...MOVIMIENTO, notas: 'pago compartido' }
  const borrador = { ...borradorDe(conNota), notas: '  pago compartido  ' }

  expect(cambioPendiente(conNota, borrador)).toEqual({})
})

test('un monto vacío o cero no se puede guardar', () => {
  for (const monto of ['', '0', 'abc']) {
    expect(hayAlgoQueGuardar(MOVIMIENTO, { ...borradorDe(MOVIMIENTO), monto })).toBe(false)
  }
})

test('una descripción en blanco no se puede guardar: la fila quedaría sin texto', () => {
  expect(hayAlgoQueGuardar(MOVIMIENTO, { ...borradorDe(MOVIMIENTO), item: '   ' })).toBe(false)
})

test('varios campos a la vez viajan juntos', () => {
  const borrador = {
    ...borradorDe(MOVIMIENTO),
    item: 'taxi',
    fecha: '2026-02-14',
    metodo: 'EF' as const,
    notas: 'al aeropuerto',
  }

  expect(cambioPendiente(MOVIMIENTO, borrador)).toEqual({
    item: 'taxi',
    fecha: '2026-02-14',
    metodo: 'EF',
    notas: 'al aeropuerto',
  })
})
