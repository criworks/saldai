import type { Preferencias } from '@saldai/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React, { ReactNode } from 'react'
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context'

import { fetchPreferencias, guardarPreferencias } from '@/features/perfil/api'
import ZonaHorariaScreen from '../zona-horaria'

jest.mock('@/lib/zona', () => ({
  ...jest.requireActual('@/lib/zona'),
  // El aparato de los tests está en UTC; así la fila "Automática" dice algo
  // reconocible y no depende de dónde corra Jest.
  zonaDelDispositivo: () => 'America/Santiago',
}))

const fetchMock = fetchPreferencias as jest.MockedFunction<typeof fetchPreferencias>
const guardarMock = guardarPreferencias as jest.MockedFunction<typeof guardarPreferencias>

const METRICAS = {
  frame: { x: 0, y: 0, width: 412, height: 917 },
  insets: { top: 24, left: 0, right: 0, bottom: 24 },
}

const respuesta = (zona: string | null): Preferencias => ({
  ok: true,
  errores: [],
  datos: {
    categorias: { habilitado: true, activo: false },
    metodos: { habilitado: true, activo: false },
    zona,
  },
})

function montar() {
  const cliente = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  })
  // `SafeAreaProvider` con métricas fijas: la pantalla y el Alert leen los
  // insets, y fuera del celular no hay ninguno que leer.
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <SafeAreaProvider initialMetrics={initialWindowMetrics ?? METRICAS}>
      <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
    </SafeAreaProvider>
  )
  return render(<ZonaHorariaScreen />, { wrapper: envoltorio })
}

beforeEach(() => {
  jest.clearAllMocks()
  fetchMock.mockResolvedValue(respuesta(null))
  guardarMock.mockImplementation(async (cambio) => respuesta(cambio.zona ?? null))
})

test('elegir una zona la guarda por su nombre IANA', async () => {
  // Lo que se guarda es "Europe/Madrid", no "Madrid": el nombre mostrado es de
  // la interfaz y el core no lo entiende.
  //
  // Se llega por el buscador porque la lista es virtual y solo monta lo que
  // entra en pantalla: Madrid está a sesenta filas de la primera.
  const { getByTestId } = montar()

  await waitFor(() => getByTestId('zona-__automatica__'))
  fireEvent.press(getByTestId('buscador-de-zonas-boton'))
  fireEvent.changeText(getByTestId('buscador-de-zonas-campo'), 'madrid')

  await waitFor(() => getByTestId('zona-Europe/Madrid'))
  fireEvent.press(getByTestId('zona-Europe/Madrid'))

  await waitFor(() => expect(guardarMock).toHaveBeenCalledWith({ zona: 'Europe/Madrid' }))
})

test('"Automática" guarda null, que es lo que hace que se use la del aparato', async () => {
  fetchMock.mockResolvedValue(respuesta('Europe/Madrid'))
  const { getByTestId } = montar()

  await waitFor(() => getByTestId('zona-__automatica__'))
  fireEvent.press(getByTestId('zona-__automatica__'))

  await waitFor(() => expect(guardarMock).toHaveBeenCalledWith({ zona: null }))
})

test('volver a tocar la zona que ya está elegida no guarda nada', async () => {
  // Un PATCH que no cambia nada igual hace parpadear la lista.
  fetchMock.mockResolvedValue(respuesta('Europe/Madrid'))
  const { getByTestId } = montar()

  await waitFor(() => getByTestId('zona-__automatica__'))
  fireEvent.press(getByTestId('buscador-de-zonas-boton'))
  fireEvent.changeText(getByTestId('buscador-de-zonas-campo'), 'madrid')

  await waitFor(() => getByTestId('zona-Europe/Madrid'))
  fireEvent.press(getByTestId('zona-Europe/Madrid'))

  expect(guardarMock).not.toHaveBeenCalled()
})

test('sin zona guardada, tocar "Automática" tampoco guarda', async () => {
  const { getByTestId } = montar()

  await waitFor(() => getByTestId('zona-__automatica__'))
  fireEvent.press(getByTestId('zona-__automatica__'))

  expect(guardarMock).not.toHaveBeenCalled()
})

test('el buscador filtra y saca la fila "Automática" de la lista', async () => {
  const { getByTestId, queryByTestId } = montar()

  await waitFor(() => getByTestId('zona-__automatica__'))

  fireEvent.press(getByTestId('buscador-de-zonas-boton'))
  fireEvent.changeText(getByTestId('buscador-de-zonas-campo'), 'madrid')

  await waitFor(() => expect(queryByTestId('zona-Europe/Madrid')).not.toBeNull())
  expect(queryByTestId('zona-America/Santiago')).toBeNull()
  expect(queryByTestId('zona-__automatica__')).toBeNull()
})

test('cerrar el buscador devuelve la lista completa', async () => {
  const { getByTestId, queryByTestId } = montar()

  await waitFor(() => getByTestId('zona-__automatica__'))

  fireEvent.press(getByTestId('buscador-de-zonas-boton'))
  fireEvent.changeText(getByTestId('buscador-de-zonas-campo'), 'madrid')
  await waitFor(() => expect(queryByTestId('zona-__automatica__')).toBeNull())

  fireEvent.press(getByTestId('buscador-de-zonas-boton'))

  await waitFor(() => expect(queryByTestId('zona-__automatica__')).not.toBeNull())
})

test('una búsqueda sin resultados lo dice, en vez de mostrar una lista vacía', async () => {
  const { getByTestId, getByText } = montar()

  await waitFor(() => getByTestId('zona-__automatica__'))

  fireEvent.press(getByTestId('buscador-de-zonas-boton'))
  fireEvent.changeText(getByTestId('buscador-de-zonas-campo'), 'narnia')

  await waitFor(() => getByText('No hay ninguna zona que coincida.'))
})

test('si la lectura falla no se marca ninguna zona como elegida', async () => {
  // El hook cae a los defaults, donde la zona es nula, así que sin este cuidado
  // la pantalla mostraría "Automática" elegida: una afirmación sobre lo que el
  // usuario configuró, hecha justo cuando no se pudo averiguar. Es lo que se
  // vio en el teléfono, con el aviso de error y la zona marcada a la vez.
  fetchMock.mockRejectedValue(new Error('404'))
  const { getByTestId } = montar()

  await waitFor(() => getByTestId('zona-__automatica__'))
  expect(getByTestId('zona-__automatica__').props.accessibilityState.selected).toBe(false)
})

test('con la lectura fallada un tap igual intenta guardar', async () => {
  // Si se comparara contra los defaults, tocar "Automática" no haría nada y el
  // usuario no tendría forma de reintentar.
  fetchMock.mockRejectedValue(new Error('404'))
  const { getByTestId } = montar()

  await waitFor(() => getByTestId('zona-__automatica__'))
  fireEvent.press(getByTestId('zona-__automatica__'))

  await waitFor(() => expect(guardarMock).toHaveBeenCalledWith({ zona: null }))
})
