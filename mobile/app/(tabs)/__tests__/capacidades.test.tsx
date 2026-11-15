import type { Preferencias } from '@saldai/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import React, { ReactNode } from 'react'
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context'

import { fetchPreferencias, guardarPreferencias } from '@/features/perfil/api'
import CapacidadesScreen from '../capacidades'

const fetchMock = fetchPreferencias as jest.MockedFunction<typeof fetchPreferencias>
const guardarMock = guardarPreferencias as jest.MockedFunction<typeof guardarPreferencias>

const METRICAS = {
  frame: { x: 0, y: 0, width: 412, height: 917 },
  insets: { top: 24, left: 0, right: 0, bottom: 24 },
}

const respuesta = (
  categorias: { habilitado: boolean; activo: boolean },
  metodos: { habilitado: boolean; activo: boolean },
  recurrencias = { habilitado: true, activo: true },
): Preferencias => ({
  ok: true,
  errores: [],
  datos: { categorias, metodos, recurrencias, zona: null },
})

function montar() {
  const cliente = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  })
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <SafeAreaProvider initialMetrics={initialWindowMetrics ?? METRICAS}>
      <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
    </SafeAreaProvider>
  )
  return render(<CapacidadesScreen />, { wrapper: envoltorio })
}

beforeEach(() => {
  jest.clearAllMocks()
  fetchMock.mockResolvedValue(
    respuesta({ habilitado: true, activo: false }, { habilitado: true, activo: false }),
  )
  guardarMock.mockImplementation(async () =>
    respuesta({ habilitado: true, activo: true }, { habilitado: true, activo: false }),
  )
})

test('muestra las capacidades que el perfil tiene habilitadas', async () => {
  montar()

  await waitFor(() => expect(screen.getByText('Categorías')).toBeTruthy())
  expect(screen.getByText('Métodos de pago')).toBeTruthy()
  // La descripción es parte de la fila, no un texto suelto de la pantalla.
  expect(screen.getByText('Organiza tus gastos en diferentes categorías.')).toBeTruthy()
})

test('una capacidad que el perfil no tiene habilitada no aparece', async () => {
  // `habilitado` lo decide el plan, así que la fila no es algo que el usuario
  // pueda prender: si se mostrara, el switch no tendría nada que guardar.
  fetchMock.mockResolvedValue(
    respuesta({ habilitado: false, activo: false }, { habilitado: true, activo: false }),
  )
  montar()

  // Se espera a que la fila desaparezca y no a que aparezca otra: con los
  // defaults, que son los de la v1, las dos filas se dibujan antes de que la
  // respuesta llegue.
  await waitFor(() => expect(screen.queryByText('Categorías')).toBeNull())
  expect(screen.getByText('Métodos de pago')).toBeTruthy()
})

test('prender una capacidad la guarda como activa', async () => {
  montar()

  await waitFor(() => expect(screen.getByTestId('switch-Categorías')).toBeTruthy())
  fireEvent(screen.getByTestId('switch-Categorías'), 'valueChange', true)

  await waitFor(() => expect(guardarMock).toHaveBeenCalledWith({ categoriasActivo: true }))
})

test('prender las recurrencias las guarda como activas', async () => {
  fetchMock.mockResolvedValue(
    respuesta({ habilitado: true, activo: false }, { habilitado: true, activo: false }, {
      habilitado: true,
      activo: false,
    }),
  )
  montar()

  await waitFor(() => expect(screen.getByTestId('switch-Recurrencias')).toBeTruthy())
  expect(screen.getByText('Programa la repetición de tus movimientos recurrentes.')).toBeTruthy()

  fireEvent(screen.getByTestId('switch-Recurrencias'), 'valueChange', true)

  await waitFor(() => expect(guardarMock).toHaveBeenCalledWith({ recurrenciasActivo: true }))
})
