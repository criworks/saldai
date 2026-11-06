import type { GastosDelMes } from '@saldai/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import React, { ReactNode } from 'react'

import { fetchGastosPorMes } from '../api'
import { GastosProvider, useGastos } from '../GastosContext'

const fetchMock = fetchGastosPorMes as jest.MockedFunction<typeof fetchGastosPorMes>

const respuesta = (mes: number): GastosDelMes => ({
  ok: true,
  cantidad: 1,
  total: mes * 1000,
  totalFormateado: `$${mes}.000`,
  datos: [
    {
      id: `gasto-${mes}`,
      monto: mes * 1000,
      monto_formateado: `$${mes}.000`,
      item: 'pan',
      categoria: 'Mercado',
      fecha: `2026-${String(mes).padStart(2, '0')}-10`,
      metodo: 'EF',
    },
  ],
})

let cliente: QueryClient

function montar() {
  cliente = new QueryClient({
    defaultOptions: {
      // Los mismos 60 segundos que usa la app, que son los que hacen que
      // volver a un mes ya visto no vuelva a la red. `gcTime: Infinity` es
      // solo para que no quede un temporizador vivo y Jest termine.
      queries: { retry: false, staleTime: 60_000, gcTime: Infinity },
    },
  })

  const envoltorio = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>
      <GastosProvider>{children}</GastosProvider>
    </QueryClientProvider>
  )

  return renderHook(() => useGastos(), { wrapper: envoltorio })
}

beforeEach(() => {
  fetchMock.mockImplementation(async (mes: number) => respuesta(mes))
})

afterEach(() => {
  jest.clearAllMocks()
})

test('carga el mes en curso al montar', async () => {
  const mesEnCurso = new Date().getMonth() + 1
  const { result } = montar()

  expect(result.current.loading).toBe(true)
  await waitFor(() => expect(result.current.loading).toBe(false))

  expect(fetchMock).toHaveBeenCalledWith(mesEnCurso, new Date().getFullYear())
  expect(result.current.totalMes).toBe(mesEnCurso * 1000)
})

/** Cuántas veces se le pidió a la API ese mes. */
const pedidosDe = (mes: number) => fetchMock.mock.calls.filter(([m]) => m === mes).length

// Los tests usan mayo y abril y cuentan los pedidos por mes, no el total, así
// el adelanto que se dispara al montar (el mes anterior al de hoy) no cambia
// el resultado según el mes en que corran.
test('volver a un mes ya visto no vuelve a pedirlo a la API', async () => {
  const { result } = montar()
  await waitFor(() => expect(result.current.loading).toBe(false))

  await act(async () => {
    result.current.setMes(5)
  })
  await waitFor(() => expect(result.current.totalMes).toBe(5000))
  expect(pedidosDe(5)).toBe(1)

  await act(async () => {
    result.current.setMes(4)
  })
  await waitFor(() => expect(result.current.totalMes).toBe(4000))

  // Y de vuelta a mayo: ya está en caché y todavía es fresco.
  await act(async () => {
    result.current.setMes(5)
  })
  await waitFor(() => expect(result.current.totalMes).toBe(5000))

  expect(pedidosDe(5)).toBe(1)
  // Y no muestra el esqueleto para algo que ya tenía.
  expect(result.current.loading).toBe(false)
})

test('pide por adelantado el mes anterior, así abrirlo no muestra el esqueleto', async () => {
  const { result } = montar()
  await waitFor(() => expect(result.current.loading).toBe(false))

  await act(async () => {
    result.current.setMes(5)
  })
  await waitFor(() => expect(result.current.totalMes).toBe(5000))
  // Abril se pidió sin que nadie lo abriera.
  await waitFor(() => expect(pedidosDe(4)).toBe(1))

  await act(async () => {
    result.current.setMes(4)
  })

  // Ya estaba: se muestra al toque, sin esqueleto y sin otro pedido.
  expect(result.current.loading).toBe(false)
  expect(result.current.totalMes).toBe(4000)
  expect(pedidosDe(4)).toBe(1)
})

test('enero no adelanta diciembre, porque la app todavía no cruza de año', async () => {
  const { result } = montar()
  await waitFor(() => expect(result.current.loading).toBe(false))

  await act(async () => {
    result.current.setMes(1)
  })
  await waitFor(() => expect(result.current.totalMes).toBe(1000))

  const anio = new Date().getFullYear()
  expect(fetchMock).not.toHaveBeenCalledWith(12, anio - 1)
})

test('agrupa por categoría, de mayor a menor', async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    cantidad: 3,
    total: 11000,
    totalFormateado: '$11.000',
    datos: [
      { id: 1, monto: 1000, monto_formateado: '$1.000', item: 'pan', categoria: 'Mercado', fecha: '2026-02-01', metodo: 'EF' },
      { id: 2, monto: 7000, monto_formateado: '$7.000', item: 'uber', categoria: 'Transporte', fecha: '2026-02-02', metodo: 'TC' },
      { id: 3, monto: 3000, monto_formateado: '$3.000', item: 'feria', categoria: 'Mercado', fecha: '2026-02-03', metodo: 'EF' },
    ],
  })

  const { result } = montar()
  await waitFor(() => expect(result.current.loading).toBe(false))

  expect(result.current.categorias).toEqual([
    ['Transporte', { total: 7000, cantidad: 1 }],
    ['Mercado', { total: 4000, cantidad: 2 }],
  ])
})

test('un error de la API queda en `error` y no deja la pantalla cargando', async () => {
  fetchMock.mockRejectedValue(new Error('Error al leer de base de datos'))

  const { result } = montar()
  await waitFor(() => expect(result.current.error).toBe('Error al leer de base de datos'))
  expect(result.current.loading).toBe(false)
})
