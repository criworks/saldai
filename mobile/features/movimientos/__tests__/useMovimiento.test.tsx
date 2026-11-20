import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import React, { ReactNode } from 'react'

import { llaves } from '@/lib/consultas'
import { editarMovimiento, eliminarMovimiento } from '../api'
import { useMovimiento } from '../useMovimiento'

const editarMock = editarMovimiento as jest.MockedFunction<typeof editarMovimiento>
const eliminarMock = eliminarMovimiento as jest.MockedFunction<typeof eliminarMovimiento>

const MOVIMIENTO = {
  id: 'uno',
  monto: 1,
  monto_formateado: '$1',
  item: 'cafe',
  categoria: 'Sin categoría',
  fecha: '2026-10-02',
  metodo: 'TC',
}

function montar() {
  const cliente = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  })
  // Las dos listas que dependen de un movimiento sin hablar de él.
  cliente.setQueryData(llaves.recurrencias(), { ok: true, errores: [], datos: [] })
  cliente.setQueryData(llaves.propuestas('2026-11-30'), { ok: true, errores: [], datos: [] })

  const envoltorio = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useMovimiento(), { wrapper: envoltorio })
  return { cliente, result }
}

function quedaronViejas(cliente: QueryClient) {
  return [
    cliente.getQueryState(llaves.recurrencias())?.isInvalidated,
    cliente.getQueryState(llaves.propuestas('2026-11-30'))?.isInvalidated,
  ]
}

beforeEach(() => {
  jest.clearAllMocks()
  editarMock.mockResolvedValue({ ok: true, errores: [], datos: MOVIMIENTO } as never)
  eliminarMock.mockResolvedValue({ ok: true, errores: [] } as never)
})

test('editar un movimiento invalida las recurrencias y las propuestas', async () => {
  // Cambiarle la fecha al movimiento que ancla un plan mueve el ancla, y de ahí
  // sale el día de todas las ocurrencias: sin esto la lista de planes y las
  // propuestas del mes se quedan con el día viejo.
  const { cliente, result } = montar()

  await act(async () => {
    await result.current.editar({ id: 'uno', cambio: { fecha: '2026-10-02' } })
  })

  await waitFor(() => expect(quedaronViejas(cliente)).toEqual([true, true]))
})

test('eliminar un movimiento invalida las recurrencias y las propuestas', async () => {
  // La decisión que creó el movimiento se borra en cascada, así que esa fecha
  // vuelve a estar por confirmar.
  const { cliente, result } = montar()

  await act(async () => {
    await result.current.eliminar('uno')
  })

  await waitFor(() => expect(quedaronViejas(cliente)).toEqual([true, true]))
})
