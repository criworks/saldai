import type { GastosDelMes, Preferencias } from '@saldai/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import React, { ReactNode } from 'react'
import { Text } from 'react-native'
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context'

import { fetchGastosPorMes } from '@/features/gastos/api'
import { FilterProvider, GastosProvider, useFilter } from '@/features/gastos'
import { fetchPreferencias } from '@/features/perfil/api'
import PorCategoriaScreen from '../por-categoria'

const mockNavegar = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: mockNavegar, push: mockNavegar }),
}))

const gastosMock = fetchGastosPorMes as jest.MockedFunction<typeof fetchGastosPorMes>
const preferenciasMock = fetchPreferencias as jest.MockedFunction<typeof fetchPreferencias>

const METRICAS = {
  frame: { x: 0, y: 0, width: 412, height: 917 },
  insets: { top: 24, left: 0, right: 0, bottom: 24 },
}

const DEL_MES: GastosDelMes = {
  ok: true,
  cantidad: 3,
  total: 6000,
  totalFormateado: '$6.000',
  datos: [
    { id: '1', monto: 1000, monto_formateado: '$1.000', item: 'pan', categoria: 'Mercado', fecha: '2026-11-01', metodo: 'EF' },
    { id: '2', monto: 2000, monto_formateado: '$2.000', item: 'uber', categoria: 'Transporte', fecha: '2026-11-02', metodo: 'TC' },
    { id: '3', monto: 3000, monto_formateado: '$3.000', item: 'feria', categoria: 'Mercado', fecha: '2026-11-03', metodo: 'EF' },
  ],
}

const PREFERENCIAS = (activo: boolean): Preferencias => ({
  ok: true,
  errores: [],
  datos: {
    categorias: { habilitado: true, activo },
    metodos: { habilitado: true, activo: false },
    zona: null,
  },
})

/** Deja a la vista qué categoría quedó filtrada, que es lo que la pantalla hace. */
function Elegida() {
  const { selectedCategory } = useFilter()
  return <Text testID="elegida">{selectedCategory ?? 'ninguna'}</Text>
}

function montar() {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })

  const envoltorio = ({ children }: { children: ReactNode }) => (
    <SafeAreaProvider initialMetrics={initialWindowMetrics ?? METRICAS}>
      <QueryClientProvider client={cliente}>
        <FilterProvider>
          <GastosProvider>
            {children}
            <Elegida />
          </GastosProvider>
        </FilterProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )

  return render(<PorCategoriaScreen />, { wrapper: envoltorio })
}

beforeEach(() => {
  jest.clearAllMocks()
  gastosMock.mockResolvedValue(DEL_MES)
  preferenciasMock.mockResolvedValue(PREFERENCIAS(true))
})

test('suma los gastos del mes por categoría', async () => {
  // Mercado son dos gastos de 1.000 y 3.000; Transporte uno de 2.000.
  montar()

  await waitFor(() => expect(screen.getByText('$4.000')).toBeTruthy())
  expect(screen.getByText('$2.000')).toBeTruthy()
  expect(screen.getByTestId('categoria-Mercado')).toBeTruthy()
  expect(screen.getByTestId('categoria-Transporte')).toBeTruthy()
})

test('tocar una categoría deja el listado filtrado por ella', async () => {
  montar()
  await waitFor(() => expect(screen.getByTestId('categoria-Mercado')).toBeTruthy())

  fireEvent.press(screen.getByTestId('categoria-Mercado'))

  await waitFor(() => expect(screen.getByTestId('elegida')).toHaveTextContent('Mercado'))
  expect(mockNavegar).toHaveBeenCalledWith('/')
})

test('un mes sin gastos lo dice', async () => {
  gastosMock.mockResolvedValue({ ok: true, cantidad: 0, total: 0, totalFormateado: '$0', datos: [] })
  montar()

  await waitFor(() => expect(screen.getByText('No hay gastos este mes')).toBeTruthy())
})

test('con las categorías apagadas dice dónde prenderlas', async () => {
  preferenciasMock.mockResolvedValue(PREFERENCIAS(false))
  montar()

  await waitFor(() =>
    expect(screen.getByText('Las categorías están apagadas. Se prenden en Configuraciones.')).toBeTruthy(),
  )
  expect(screen.queryByTestId('categoria-Mercado')).toBeNull()
})
