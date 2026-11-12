import type { MovimientosDelMes, Preferencias } from '@saldai/core'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import React, { ReactNode } from 'react'
import { Text } from 'react-native'
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context'

import { fetchPreferencias } from '@/features/perfil/api'
import { fetchMovimientosPorMes } from '../api'
import { FilterProvider, useFilter } from '../FilterContext'
import { MovimientosProvider, useMovimientos } from '../MovimientosContext'
import { GradientFooter } from '../componentes/GradientFooter'

const movimientosMock = fetchMovimientosPorMes as jest.MockedFunction<typeof fetchMovimientosPorMes>
const preferenciasMock = fetchPreferencias as jest.MockedFunction<typeof fetchPreferencias>

const METRICAS = {
  frame: { x: 0, y: 0, width: 412, height: 917 },
  insets: { top: 24, left: 0, right: 0, bottom: 24 },
}

const DEL_MES: MovimientosDelMes = {
  ok: true,
  cantidad: 2,
  total: 3000,
  totalFormateado: '$3.000',
  datos: [
    { id: '1', monto: 1000, monto_formateado: '$1.000', item: 'pan', categoria: 'Mercado', fecha: '2026-11-01', metodo: 'EF' },
    { id: '2', monto: 2000, monto_formateado: '$2.000', item: 'uber', categoria: 'Transporte', fecha: '2026-11-02', metodo: 'TC' },
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

const navegar = jest.fn()

/** Lo mínimo que el footer lee de las props de la tab bar. */
function propsDeTabBar(ruta: string) {
  return {
    state: { routeNames: [ruta], index: 0 },
    navigation: { navigate: navegar },
  } as unknown as BottomTabBarProps
}

/** El estado del filtro y un botón para cambiar de mes, a la vista del test. */
function Sonda() {
  const { selectedCategory } = useFilter()
  const { setMes } = useMovimientos()
  return (
    <>
      <Text testID="elegida">{selectedCategory ?? 'ninguna'}</Text>
      <Text testID="otro-mes" onPress={() => setMes(3)}>
        marzo
      </Text>
    </>
  )
}

function montar(ruta = 'index') {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })

  const envoltorio = ({ children }: { children: ReactNode }) => (
    <SafeAreaProvider initialMetrics={initialWindowMetrics ?? METRICAS}>
      <QueryClientProvider client={cliente}>
        <FilterProvider>
          <MovimientosProvider>
            {children}
            <Sonda />
          </MovimientosProvider>
        </FilterProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )

  return render(<GradientFooter {...propsDeTabBar(ruta)} />, { wrapper: envoltorio })
}

beforeEach(() => {
  jest.clearAllMocks()
  movimientosMock.mockResolvedValue(DEL_MES)
  preferenciasMock.mockResolvedValue(PREFERENCIAS(true))
})

test('dibuja una burbuja por categoría que el mes tiene, y ninguna más', async () => {
  // Esta fila estuvo muerta: las categorías venían de un segundo estado que
  // nadie llenaba, así que nunca se dibujaba. Ahora salen de los movimientos.
  montar()

  await waitFor(() => expect(screen.getByLabelText('Mercado')).toBeTruthy())
  expect(screen.getByLabelText('Transporte')).toBeTruthy()
  expect(screen.queryByLabelText('Ocio')).toBeNull()
})

test('tocar una burbuja filtra, y volver a tocarla suelta el filtro', async () => {
  montar()
  const mercado = await screen.findByLabelText('Mercado')

  fireEvent.press(mercado)
  await waitFor(() => expect(screen.getByTestId('elegida')).toHaveTextContent('Mercado'))

  fireEvent.press(mercado)
  await waitFor(() => expect(screen.getByTestId('elegida')).toHaveTextContent('ninguna'))
})

test('cambiar de mes suelta el filtro', async () => {
  // Una categoría que el mes nuevo no tiene dejaría la lista vacía, y la
  // burbuja para soltar el filtro tampoco estaría.
  montar()
  fireEvent.press(await screen.findByLabelText('Mercado'))
  await waitFor(() => expect(screen.getByTestId('elegida')).toHaveTextContent('Mercado'))

  fireEvent.press(screen.getByTestId('otro-mes'))

  await waitFor(() => expect(screen.getByTestId('elegida')).toHaveTextContent('ninguna'))
})

test('el chip de categorías lleva al desglose y vuelve', async () => {
  montar()
  fireEvent.press(await screen.findByTestId('chip-categorias'))
  expect(navegar).toHaveBeenCalledWith('por-categoria')

  navegar.mockClear()
  montar('por-categoria')
  fireEvent.press(await screen.findByTestId('chip-categorias'))
  expect(navegar).toHaveBeenCalledWith('index')
})

test('con las categorías apagadas no hay burbujas ni chip', async () => {
  preferenciasMock.mockResolvedValue(PREFERENCIAS(false))
  montar()

  await waitFor(() => expect(screen.getByText('En curso')).toBeTruthy())
  expect(screen.queryByTestId('chip-categorias')).toBeNull()
  expect(screen.queryByLabelText('Mercado')).toBeNull()
})

test('en una pantalla de ajuste no se muestra la fila de filtros', async () => {
  montar('zona-horaria')

  await waitFor(() => expect(screen.getByLabelText('Volver a configuraciones')).toBeTruthy())
  expect(screen.queryByText('En curso')).toBeNull()
  expect(screen.queryByTestId('chip-categorias')).toBeNull()
})
