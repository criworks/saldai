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
  dia_de_la_semana: null,
  semana_del_mes: null,
  dia_del_mes: null,
  mes_del_anio: null,
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

test('la frecuencia y la regla se guardan juntas, al tocar Listo', async () => {
  // Una escritura por toque guardaría un plan a medio configurar que ya empezó
  // a proponer: cambiar de "mes" a "año" y después el mes serían dos.
  const { onElegir } = montar({ ancla: '2026-01-06' })

  await userEvent.press(screen.getByLabelText('Hacer recurrente'))
  await userEvent.press(screen.getByLabelText('Cada semana'))

  expect(onElegir).not.toHaveBeenCalled()

  await userEvent.press(screen.getByLabelText('Listo'))

  expect(onElegir).toHaveBeenCalledTimes(1)
  expect(onElegir).toHaveBeenCalledWith('semanal', {
    diaDeLaSemana: null,
    semanaDelMes: null,
    diaDelMes: null,
    mesDelAnio: null,
  })
})

test('elegir un día de la semana viaja como regla', async () => {
  const { onElegir } = montar({ ancla: '2026-01-06' })

  await userEvent.press(screen.getByLabelText('Hacer recurrente'))
  await userEvent.press(screen.getByLabelText('Cada semana'))
  await userEvent.press(screen.getByLabelText('viernes'))
  await userEvent.press(screen.getByLabelText('Listo'))

  expect(onElegir).toHaveBeenCalledWith('semanal', {
    diaDeLaSemana: 5,
    semanaDelMes: null,
    diaDelMes: null,
    mesDelAnio: null,
  })
})

test('el último viernes de cada mes viaja como día de la semana y semana', async () => {
  const { onElegir } = montar({ ancla: '2026-01-06' })

  await userEvent.press(screen.getByLabelText('Hacer recurrente'))
  await userEvent.press(screen.getByLabelText('Última semana'))
  await userEvent.press(screen.getByLabelText('viernes'))
  await userEvent.press(screen.getByLabelText('Listo'))

  // Las dos formas del día son excluyentes: elegir la de la semana limpia el
  // día del calendario, que es lo que el core y el check de la tabla exigen.
  expect(onElegir).toHaveBeenCalledWith('mensual', {
    diaDeLaSemana: 5,
    semanaDelMes: -1,
    diaDelMes: null,
    mesDelAnio: null,
  })
})

test('guardar sin cambiar nada no escribe', async () => {
  // Con plan sería un "editar de aquí en adelante" que corta la cadena en dos
  // por nada.
  const { onElegir } = montar({ plan: PLAN })

  await userEvent.press(screen.getByLabelText('Recurrente'))
  await userEvent.press(screen.getByLabelText('Cada mes'))
  await userEvent.press(screen.getByLabelText('Listo'))

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
