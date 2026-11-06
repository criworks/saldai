import type { GastosDelMes, Preferencias } from '@saldai/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import React, { ReactNode } from 'react'
import { Pressable, Text } from 'react-native'
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context'

import { fetchGastosPorMes } from '@/features/gastos/api'
import { FilterProvider, GastosProvider, useFilter } from '@/features/gastos'
import { fetchPreferencias } from '@/features/perfil/api'
import DashboardScreen from '../index'

const gastosMock = fetchGastosPorMes as jest.MockedFunction<typeof fetchGastosPorMes>
const preferenciasMock = fetchPreferencias as jest.MockedFunction<typeof fetchPreferencias>

const METRICAS = {
  frame: { x: 0, y: 0, width: 412, height: 917 },
  insets: { top: 24, left: 0, right: 0, bottom: 24 },
}

const hoy = new Date()
const fechaDeHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

const DEL_MES: GastosDelMes = {
  ok: true,
  cantidad: 3,
  total: 6000,
  totalFormateado: '$6.000',
  datos: [
    { id: '1', monto: 1000, monto_formateado: '$1.000', item: 'pan', categoria: 'Mercado', fecha: fechaDeHoy, metodo: 'EF' },
    { id: '2', monto: 2000, monto_formateado: '$2.000', item: 'uber', categoria: 'Transporte', fecha: fechaDeHoy, metodo: 'TC' },
    { id: '3', monto: 3000, monto_formateado: '$3.000', item: 'feria', categoria: 'Mercado', fecha: fechaDeHoy, metodo: 'EF' },
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

/** Un botón que elige la categoría, que en la app es la burbuja del footer. */
function ElegirCategoria({ categoria }: { categoria: string | null }) {
  const { setSelectedCategory } = useFilter()
  return (
    <Pressable testID="elegir" onPress={() => setSelectedCategory(categoria)}>
      <Text>elegir</Text>
    </Pressable>
  )
}

function montar(categoria: string | null = null) {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })

  const envoltorio = ({ children }: { children: ReactNode }) => (
    <SafeAreaProvider initialMetrics={initialWindowMetrics ?? METRICAS}>
      <QueryClientProvider client={cliente}>
        <FilterProvider>
          <GastosProvider>
            {children}
            <ElegirCategoria categoria={categoria} />
          </GastosProvider>
        </FilterProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )

  return render(<DashboardScreen />, { wrapper: envoltorio })
}

beforeEach(() => {
  jest.clearAllMocks()
  gastosMock.mockResolvedValue(DEL_MES)
  preferenciasMock.mockResolvedValue(PREFERENCIAS(true))
})

test('sin filtro muestra todos los gastos del mes y su total', async () => {
  montar()

  await waitFor(() => expect(screen.getByText('pan')).toBeTruthy())
  expect(screen.getByText('uber')).toBeTruthy()
  expect(screen.getByText('feria')).toBeTruthy()
  expect(screen.getByText('$6.000')).toBeTruthy()
})

test('con una categoría elegida quedan solo sus gastos', async () => {
  montar('Mercado')
  await waitFor(() => expect(screen.getByText('pan')).toBeTruthy())

  fireEvent.press(screen.getByTestId('elegir'))

  await waitFor(() => expect(screen.queryByText('uber')).toBeNull())
  expect(screen.getByText('pan')).toBeTruthy()
  expect(screen.getByText('feria')).toBeTruthy()
})

test('el total de arriba es el de lo filtrado y no el del mes', async () => {
  // Un total de mes arriba de una lista recortada no corresponde a ninguna de
  // las filas que se ven.
  montar('Mercado')
  await waitFor(() => expect(screen.getByText('$6.000')).toBeTruthy())

  fireEvent.press(screen.getByTestId('elegir'))

  await waitFor(() => expect(screen.getByText('$4.000')).toBeTruthy())
  expect(screen.queryByText('$6.000')).toBeNull()
})

test('una categoría sin gastos en el mes se dice distinto de un mes vacío', async () => {
  montar('Ocio')
  await waitFor(() => expect(screen.getByText('pan')).toBeTruthy())

  fireEvent.press(screen.getByTestId('elegir'))

  await waitFor(() => expect(screen.getByText('No hay gastos de Ocio este mes')).toBeTruthy())
  expect(screen.queryByText('No hay gastos este mes')).toBeNull()
})

test('con las categorías apagadas el filtro no se aplica', async () => {
  // Apagada, la burbuja para soltar el filtro no está: si la selección vieja
  // siguiera valiendo, el listado quedaría recortado sin forma de volver.
  preferenciasMock.mockResolvedValue(PREFERENCIAS(false))
  montar('Mercado')
  await waitFor(() => expect(screen.getByText('uber')).toBeTruthy())

  fireEvent.press(screen.getByTestId('elegir'))

  await waitFor(() => expect(screen.getByText('$6.000')).toBeTruthy())
  expect(screen.getByText('uber')).toBeTruthy()
})
