import type { PropuestaPendiente } from '@saldai/core'
import { render, screen, userEvent } from '@testing-library/react-native'
import React from 'react'
import { ListaDePropuestas } from '../componentes/ListaDePropuestas'

const nada = () => {}
const props = { onElegir: nada, onConfirmar: nada, onOmitir: nada }

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
  const { toJSON } = render(<ListaDePropuestas propuestas={[]} {...props} />)

  expect(toJSON()).toBeNull()
})

test('con una sola propuesta el título va sin número', () => {
  render(
    <ListaDePropuestas propuestas={[propuesta('2026-03-05', 'arriendo', 525457)]} {...props} />
  )

  expect(screen.getByText('Por confirmar')).toBeTruthy()
  // La fecha va corta: en el bloque no hay encabezados de día y dos propuestas
  // del mismo plan se verían idénticas sin ella.
  expect(screen.getByText('05/03')).toBeTruthy()
  expect(screen.getByText('$525.457')).toBeTruthy()
})

test('con varias propuestas el título lleva cuántas son', () => {
  render(
    <ListaDePropuestas
      propuestas={[
        propuesta('2026-02-05', 'arriendo', 525457),
        propuesta('2026-03-05', 'arriendo', 525457),
      ]}
      {...props}
    />
  )

  expect(screen.getByText('Por confirmar (2)')).toBeTruthy()
})

test('tocar la fila abre la propuesta para corregirla', async () => {
  // Tocar la fila no confirma: es el camino para el monto que cambia mes a
  // mes, y confirmar a ciegas algo que el usuario quería corregir sería peor
  // que un toque de más.
  const onElegir = jest.fn()
  const onConfirmar = jest.fn()
  const laPropuesta = propuesta('2026-03-05', 'arriendo', 525457)

  render(
    <ListaDePropuestas
      propuestas={[laPropuesta]}
      onElegir={onElegir}
      onConfirmar={onConfirmar}
      onOmitir={nada}
    />
  )
  await userEvent.press(screen.getByLabelText('arriendo del 05/03/2026, por confirmar'))

  expect(onElegir).toHaveBeenCalledWith(laPropuesta)
  expect(onConfirmar).not.toHaveBeenCalled()
})

test('el check confirma y la equis omite, sin abrir nada', async () => {
  const onElegir = jest.fn()
  const onConfirmar = jest.fn()
  const onOmitir = jest.fn()
  const laPropuesta = propuesta('2026-03-05', 'arriendo', 525457)

  render(
    <ListaDePropuestas
      propuestas={[laPropuesta]}
      onElegir={onElegir}
      onConfirmar={onConfirmar}
      onOmitir={onOmitir}
    />
  )

  await userEvent.press(screen.getByLabelText('Confirmar arriendo del 05/03/2026'))
  expect(onConfirmar).toHaveBeenCalledWith(laPropuesta)

  await userEvent.press(screen.getByLabelText('Omitir arriendo del 05/03/2026'))
  expect(onOmitir).toHaveBeenCalledWith(laPropuesta)

  // Decidir desde la fila no abre el confirmador.
  expect(onElegir).not.toHaveBeenCalled()
})

test('la propuesta que se está decidiendo no acepta otro toque', async () => {
  // Sin esto, dos toques seguidos mandan dos confirmaciones: la segunda falla
  // por el unique de la base, pero el usuario ve un error sobre algo que sí
  // funcionó.
  const onConfirmar = jest.fn()
  const laPropuesta = propuesta('2026-03-05', 'arriendo', 525457)

  render(
    <ListaDePropuestas
      propuestas={[laPropuesta]}
      onElegir={nada}
      onConfirmar={onConfirmar}
      onOmitir={nada}
      decidiendo="rec-1-2026-03-05"
    />
  )

  expect(screen.queryByLabelText('Confirmar arriendo del 05/03/2026')).toBeNull()
})

test('el reloj marca que la fila viene de un plan', () => {
  render(<ListaDePropuestas propuestas={[propuesta('2026-03-05', 'arriendo', 525457)]} {...props} />)

  expect(screen.getByTestId('fila-recurrente')).toBeTruthy()
})
