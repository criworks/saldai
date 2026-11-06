import type { Gasto, MovimientoCambiado, Preferencias } from '@saldai/core'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React, { ReactNode } from 'react'
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context'

import { editarMovimiento, eliminarMovimiento } from '../api'
import { fetchPreferencias } from '@/features/perfil/api'
import { EditorDeMovimiento } from '../componentes/EditorDeMovimiento'

const editarMock = editarMovimiento as jest.MockedFunction<typeof editarMovimiento>
const eliminarMock = eliminarMovimiento as jest.MockedFunction<typeof eliminarMovimiento>
const preferenciasMock = fetchPreferencias as jest.MockedFunction<typeof fetchPreferencias>

const MOVIMIENTO: Gasto = {
  id: '0f1c6b5a-9d2e-4c3b-8a7f-1e2d3c4b5a69',
  monto: 45000,
  monto_formateado: '$45.000',
  item: 'uber',
  categoria: 'Transporte',
  fecha: '2026-02-15',
  metodo: 'TC',
  notas: null,
}

const METRICAS = {
  frame: { x: 0, y: 0, width: 412, height: 917 },
  insets: { top: 24, left: 0, right: 0, bottom: 24 },
}

const respuesta = (datos: Gasto): MovimientoCambiado => ({ ok: true, errores: [], datos })

const PREFERENCIAS: Preferencias = {
  ok: true,
  errores: [],
  datos: {
    // La v1: las dos funciones apagadas, así el editor no muestra los
    // selectores de categoría ni de método.
    categorias: { habilitado: true, activo: false },
    metodos: { habilitado: true, activo: false },
    zona: null,
  },
}

function montar(movimiento: Gasto | null = MOVIMIENTO) {
  const cliente = new QueryClient({
    // `gcTime: Infinity` no programa el temporizador de garbage collection: con
    // el default de cinco minutos, la consulta de preferencias y la mutación
    // terminada dejan temporizadores vivos y Jest avisa que el worker no salió.
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  })
  const onCerrar = jest.fn()

  // El editor se dibuja dentro de un Portal, igual que los modales de
  // confirmación, así que sin el host del portal el árbol queda vacío: es el
  // mismo `PortalHost` que monta `app/_layout.tsx`.
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <SafeAreaProvider initialMetrics={initialWindowMetrics ?? METRICAS}>
      <QueryClientProvider client={cliente}>
        {children}
        <PortalHost />
      </QueryClientProvider>
    </SafeAreaProvider>
  )

  const utilidades = render(
    <EditorDeMovimiento movimiento={movimiento} onCerrar={onCerrar} />,
    { wrapper: envoltorio }
  )

  return { ...utilidades, onCerrar }
}

beforeEach(() => {
  jest.clearAllMocks()
  preferenciasMock.mockResolvedValue(PREFERENCIAS)
  editarMock.mockResolvedValue(respuesta(MOVIMIENTO))
  eliminarMock.mockResolvedValue(respuesta(MOVIMIENTO))
})

test('sin movimiento el editor no dibuja nada', () => {
  const { queryByLabelText } = montar(null)

  expect(queryByLabelText('Monto')).toBeNull()
  expect(queryByLabelText('Guardar cambios')).toBeNull()
})

test('abre con los valores del movimiento', () => {
  const { getByLabelText } = montar()

  expect(getByLabelText('Monto').props.value).toBe('45.000')
  expect(getByLabelText('Descripción').props.value).toBe('uber')
  expect(getByLabelText('Nota').props.value).toBe('')
})

test('sin cambios no hay nada que guardar y el botón no manda nada', async () => {
  const { getByLabelText, onCerrar } = montar()

  fireEvent.press(getByLabelText('Guardar cambios'))

  // Un PATCH sin campos la API lo rechaza, y además marcaría la fila como
  // editada a mano sin que el usuario haya corregido nada.
  expect(editarMock).not.toHaveBeenCalled()
  expect(onCerrar).not.toHaveBeenCalled()
})

test('guardar manda solo el campo que se tocó', async () => {
  const { getByLabelText, onCerrar } = montar()

  fireEvent.changeText(getByLabelText('Descripción'), 'taxi')
  fireEvent.press(getByLabelText('Guardar cambios'))

  await waitFor(() => expect(editarMock).toHaveBeenCalledWith(MOVIMIENTO.id, { item: 'taxi' }))
  expect(onCerrar).toHaveBeenCalled()
})

test('el monto se escribe en dígitos y viaja como número', async () => {
  const { getByLabelText } = montar()

  // El campo descarta lo que no es dígito, igual que el de la captura.
  fireEvent.changeText(getByLabelText('Monto'), '50.000')

  expect(getByLabelText('Monto').props.value).toBe('50.000')

  fireEvent.press(getByLabelText('Guardar cambios'))
  await waitFor(() => expect(editarMock).toHaveBeenCalledWith(MOVIMIENTO.id, { monto: 50000 }))
})

test('si la API rechaza el cambio, el editor queda abierto con lo escrito', async () => {
  editarMock.mockRejectedValue(new Error('Error al guardar los cambios'))
  const { getByLabelText, getByText, onCerrar } = montar()

  fireEvent.changeText(getByLabelText('Descripción'), 'taxi')
  fireEvent.press(getByLabelText('Guardar cambios'))

  // Cerrarlo perdería la corrección sin haberla guardado.
  await waitFor(() => getByText('Error al guardar los cambios'))
  expect(onCerrar).not.toHaveBeenCalled()
  expect(getByLabelText('Descripción').props.value).toBe('taxi')
})

test('eliminar pide confirmación antes de borrar', async () => {
  const { getByLabelText, getByText } = montar()

  fireEvent.press(getByLabelText('Eliminar este movimiento'))

  // Nada se borró todavía: el tap abre la confirmación.
  expect(eliminarMock).not.toHaveBeenCalled()
  getByText('Confirma que vas a eliminar "uber". No se puede recuperar.')

  fireEvent.press(getByText('Eliminar movimiento'))

  await waitFor(() => expect(eliminarMock).toHaveBeenCalledWith(MOVIMIENTO.id))
})

test('abrir otro movimiento reemplaza los valores del anterior', () => {
  const { getByLabelText, rerender } = montar()

  fireEvent.changeText(getByLabelText('Descripción'), 'taxi')

  const otro: Gasto = { ...MOVIMIENTO, id: 'otro-id', item: 'pan', monto: 1000 }
  rerender(<EditorDeMovimiento movimiento={otro} onCerrar={jest.fn()} />)

  // Sin rearmar el borrador, la segunda fila abría con lo escrito en la primera.
  expect(getByLabelText('Descripción').props.value).toBe('pan')
  expect(getByLabelText('Monto').props.value).toBe('1.000')
})
