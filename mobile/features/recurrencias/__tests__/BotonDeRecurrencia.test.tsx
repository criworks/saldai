import type { Recurrencia } from '@saldai/core'
import { PortalHost } from '@rn-primitives/portal'
import { render, screen, userEvent } from '@testing-library/react-native'
import React, { ReactNode } from 'react'
import { BotonDeRecurrencia } from '../componentes/BotonDeRecurrencia'

const PLAN: Recurrencia = {
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
  input_original: null,
  zona: 'America/Santiago',
  hoy_resuelto: null,
  plan_anterior_id: null,
}

// El selector y el modal de confirmación se dibujan en un Portal, igual que en
// la app: sin el host, el árbol queda vacío al abrirlos.
const envoltorio = ({ children }: { children: ReactNode }) => (
  <>
    {children}
    <PortalHost />
  </>
)

function montar(props: Partial<React.ComponentProps<typeof BotonDeRecurrencia>> = {}) {
  const onElegir = jest.fn()
  const onQuitar = jest.fn()

  const utilidades = render(
    <BotonDeRecurrencia onElegir={onElegir} onQuitar={onQuitar} {...props} />,
    { wrapper: envoltorio }
  )

  return { ...utilidades, onElegir, onQuitar }
}

test('sin recurrencia el botón está idle: solo la alarma', () => {
  montar()

  expect(screen.getByLabelText('Hacer recurrente')).toBeTruthy()
  expect(screen.queryByText('Cada mes')).toBeNull()
})

test('con plan el botón está activo y dice cada cuánto', () => {
  montar({ plan: PLAN })

  expect(screen.getByLabelText('Recurrente')).toBeTruthy()
  // La frecuencia va en el botón: "recurrente" solo obliga a abrirlo para saber
  // qué quedó configurado.
  expect(screen.getByText('Cada mes')).toBeTruthy()
})

test('elegir una frecuencia la avisa una sola vez, y la misma no avisa nada', async () => {
  const { onElegir } = montar()

  await userEvent.press(screen.getByLabelText('Hacer recurrente'))
  await userEvent.press(screen.getByLabelText('Cada semana'))

  expect(onElegir).toHaveBeenCalledWith('semanal')
  expect(onElegir).toHaveBeenCalledTimes(1)
})

test('tocar la frecuencia que ya está puesta no escribe nada', async () => {
  const { onElegir } = montar({ plan: PLAN })

  await userEvent.press(screen.getByLabelText('Recurrente'))
  await userEvent.press(screen.getByLabelText('Cada mes'))

  expect(onElegir).not.toHaveBeenCalled()
})

test('sin plan, quitar la recurrencia no pide confirmación', async () => {
  // En el alta todavía no hay nada que cortar: es soltar lo que se eligió hace
  // diez segundos.
  const { onQuitar } = montar({ frecuenciaElegida: 'mensual' })

  await userEvent.press(screen.getByLabelText('Recurrente'))
  await userEvent.press(screen.getByLabelText('Quitar la recurrencia'))

  expect(onQuitar).toHaveBeenCalled()
})

test('con plan, eliminar avisa que no borra los movimientos ya creados', async () => {
  const { onQuitar } = montar({ plan: PLAN })

  await userEvent.press(screen.getByLabelText('Recurrente'))
  await userEvent.press(screen.getByLabelText('Eliminar la recurrencia'))

  // "Eliminar" al lado de un movimiento se lee como borrar el movimiento, así
  // que la confirmación dice qué pasa de verdad.
  expect(
    screen.getByText(
      'Se deja de repetir desde hoy. Los movimientos que ya se crearon quedan como están.'
    )
  ).toBeTruthy()
  expect(onQuitar).not.toHaveBeenCalled()

  await userEvent.press(screen.getByText('Eliminar la recurrencia'))

  expect(onQuitar).toHaveBeenCalled()
})
