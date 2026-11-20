import type { PropuestaPendiente } from '@saldai/core'
import { render, screen, userEvent } from '@testing-library/react-native'
import React from 'react'
import { FilaDePropuesta } from '../componentes/FilaDePropuesta'

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

test('se ve como una fila del mes, con el monto y el reloj', () => {
  render(<FilaDePropuesta propuesta={propuesta('2026-03-05', 'arriendo', 525457)} {...props} />)

  expect(screen.getByText('$525.457')).toBeTruthy()
  expect(screen.getByText('arriendo')).toBeTruthy()
  // El reloj es lo que la marca como todavía sin confirmar.
  expect(screen.getByTestId('fila-recurrente')).toBeTruthy()
})

test('la fecha va en la etiqueta y no en pantalla', () => {
  // En pantalla la dice el encabezado del día que la agrupa. En la etiqueta
  // sí, porque un lector de pantalla lee la fila sola y dos propuestas del
  // mismo plan se escucharían idénticas.
  render(<FilaDePropuesta propuesta={propuesta('2026-03-05', 'arriendo', 525457)} {...props} />)

  expect(screen.queryByText('05/03')).toBeNull()
  expect(screen.getByLabelText('arriendo del 05/03/2026, por confirmar')).toBeTruthy()
})

test('tocar la fila abre la propuesta para corregirla', async () => {
  // Tocar la fila no confirma: es el camino para el monto que cambia mes a
  // mes, y confirmar a ciegas algo que el usuario quería corregir sería peor
  // que un toque de más.
  const onElegir = jest.fn()
  const onConfirmar = jest.fn()
  const laPropuesta = propuesta('2026-03-05', 'arriendo', 525457)

  render(
    <FilaDePropuesta
      propuesta={laPropuesta}
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
    <FilaDePropuesta
      propuesta={laPropuesta}
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

test('mientras la decisión está en vuelo no acepta otro toque', async () => {
  // Sin esto, dos toques seguidos mandan dos confirmaciones: la segunda falla
  // por el unique de la base, pero el usuario ve un error sobre algo que sí
  // funcionó.
  const onConfirmar = jest.fn()

  render(
    <FilaDePropuesta
      propuesta={propuesta('2026-03-05', 'arriendo', 525457)}
      onElegir={nada}
      onConfirmar={onConfirmar}
      onOmitir={nada}
      ocupada
    />
  )

  expect(screen.queryByLabelText('Confirmar arriendo del 05/03/2026')).toBeNull()
})
