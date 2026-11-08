import type { PropuestaPendiente } from '@saldai/core'
import { render, screen, userEvent } from '@testing-library/react-native'
import React from 'react'
import { ListaDePropuestas } from '../componentes/ListaDePropuestas'

function propuesta(fecha: string, item: string, monto: number): PropuestaPendiente {
  return {
    recurrenciaId: 'rec-1',
    fecha,
    movimiento: {
      monto,
      montoFormateado: `$${monto}`,
      item,
      categoria: 'Básicos',
      categoriaSrc: 'campo',
      metodo: 'TC',
      fecha,
      notas: null,
    },
    recurrencia: {
      id: 'rec-1',
      monto,
      monto_formateado: `$${monto}`,
      item,
      categoria: 'Básicos',
      categoria_src: 'campo',
      metodo: 'TC',
      notas: null,
      frecuencia: 'mensual',
      vigente_desde: '2026-01-05',
      vigente_hasta: null,
      input_original: null,
      zona: 'America/Santiago',
      hoy_resuelto: null,
    },
  }
}

test('sin propuestas no dibuja nada', () => {
  const { toJSON } = render(<ListaDePropuestas propuestas={[]} onElegir={() => {}} />)

  expect(toJSON()).toBeNull()
})

test('con una sola propuesta el título va sin número', () => {
  render(
    <ListaDePropuestas
      propuestas={[propuesta('2026-03-05', 'arriendo', 525457)]}
      onElegir={() => {}}
    />
  )

  expect(screen.getByText('Por confirmar')).toBeTruthy()
  expect(screen.getByText('05/03/2026')).toBeTruthy()
  expect(screen.getByText('$525.457')).toBeTruthy()
})

test('con varias propuestas el título lleva cuántas son', () => {
  render(
    <ListaDePropuestas
      propuestas={[
        propuesta('2026-02-05', 'arriendo', 525457),
        propuesta('2026-03-05', 'arriendo', 525457),
      ]}
      onElegir={() => {}}
    />
  )

  expect(screen.getByText('Por confirmar (2)')).toBeTruthy()
})

test('tocar una propuesta la pasa a quien la va a decidir', async () => {
  const onElegir = jest.fn()
  const laPropuesta = propuesta('2026-03-05', 'arriendo', 525457)

  render(<ListaDePropuestas propuestas={[laPropuesta]} onElegir={onElegir} />)
  await userEvent.press(screen.getByLabelText('Confirmar arriendo del 05/03/2026'))

  expect(onElegir).toHaveBeenCalledWith(laPropuesta)
})
