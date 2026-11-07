import type { PropuestaPendiente } from '@saldai/core'
import { borradorDePropuesta, cambioDeLaPropuesta, sePuedeConfirmar } from '../confirmacion'

const PROPUESTA: PropuestaPendiente = {
  recurrenciaId: 'rec-1',
  fecha: '2026-03-05',
  movimiento: {
    monto: 525457,
    montoFormateado: '$525.457',
    item: 'arriendo',
    categoria: 'Básicos',
    categoriaSrc: 'campo',
    metodo: 'TC',
    fecha: '2026-03-05',
    notas: null,
  },
  recurrencia: {
    id: 'rec-1',
    monto: 525457,
    monto_formateado: '$525.457',
    item: 'arriendo',
    categoria: 'Básicos',
    categoria_src: 'campo',
    metodo: 'TC',
    notas: null,
    frecuencia: 'mensual',
    vigente_desde: '2026-01-05',
    vigente_hasta: null,
    input_original: '525457, arriendo, basicos, tc',
    zona: 'America/Santiago',
    hoy_resuelto: '2026-01-05',
  },
}

test('el borrador abre con lo que el plan propone', () => {
  expect(borradorDePropuesta(PROPUESTA)).toEqual({
    monto: '525457',
    item: 'arriendo',
    categoria: 'Básicos',
    metodo: 'TC',
    fecha: '2026-03-05',
    notas: '',
  })
})

test('confirmar sin tocar nada no manda ningún campo', () => {
  // No es un cuerpo vacío que se rechaza: es "confirmo lo que proponés", y por
  // eso ningún campo queda marcado como corregido a mano.
  expect(cambioDeLaPropuesta(PROPUESTA, borradorDePropuesta(PROPUESTA))).toEqual({})
})

test('solo viaja lo que difiere de la propuesta', () => {
  const borrador = { ...borradorDePropuesta(PROPUESTA), monto: '600000' }

  expect(cambioDeLaPropuesta(PROPUESTA, borrador)).toEqual({ monto: 600000 })
})

test('corregir la fecha viaja como cambio y no reemplaza la fecha prevista', () => {
  // La fecha prevista es la que cierra la propuesta; la corregida es la del
  // movimiento. Son dos datos distintos y el cuerpo los manda por separado.
  const borrador = { ...borradorDePropuesta(PROPUESTA), fecha: '2026-03-07' }

  expect(cambioDeLaPropuesta(PROPUESTA, borrador)).toEqual({ fecha: '2026-03-07' })
  expect(PROPUESTA.fecha).toBe('2026-03-05')
})

test('escribir una nota la manda; dejarla vacía cuando no había no es un cambio', () => {
  const conNota = { ...borradorDePropuesta(PROPUESTA), notas: 'pagado por transferencia' }
  expect(cambioDeLaPropuesta(PROPUESTA, conNota)).toEqual({
    notas: 'pagado por transferencia',
  })

  expect(cambioDeLaPropuesta(PROPUESTA, borradorDePropuesta(PROPUESTA)).notas).toBeUndefined()
})

test('dejar la categoría vacía manda "Sin categoría", como el selector', () => {
  const borrador = { ...borradorDePropuesta(PROPUESTA), categoria: '' }

  expect(cambioDeLaPropuesta(PROPUESTA, borrador)).toEqual({ categoria: 'Sin categoría' })
})

test('un monto en cero o una descripción vacía no se pueden confirmar', () => {
  const borrador = borradorDePropuesta(PROPUESTA)

  expect(sePuedeConfirmar(borrador)).toBe(true)
  expect(sePuedeConfirmar({ ...borrador, monto: '0' })).toBe(false)
  expect(sePuedeConfirmar({ ...borrador, monto: '' })).toBe(false)
  expect(sePuedeConfirmar({ ...borrador, item: '   ' })).toBe(false)
})
