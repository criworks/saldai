import type { GastoCreado, GastosDelMes } from '@saldai/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import React, { ReactNode } from 'react'

import { llaves } from '@/lib/consultas'
import { crearGasto } from '../api'
import { useGastoMutation } from '../useGastoMutation'

const crearGastoMock = crearGasto as jest.MockedFunction<typeof crearGasto>

// El gasto de prueba trae la fecha completa a propósito: así el mes al que
// pertenece no depende del día en que corran los tests.
const CAMPOS = { monto: '45000', item: 'uber', categoria: 'transporte', fecha: '15/02/2026' }
const LLAVE_FEBRERO = llaves.gastosDelMes(2, 2026)

const mesEnCache = (): GastosDelMes => ({
  ok: true,
  cantidad: 1,
  total: 5000,
  totalFormateado: '$5.000',
  datos: [
    {
      id: 'ya-estaba',
      monto: 5000,
      monto_formateado: '$5.000',
      item: 'pan',
      categoria: 'Mercado',
      fecha: '2026-02-10',
      metodo: 'EF',
    },
  ],
})

function montar() {
  const cliente = new QueryClient({
    defaultOptions: {
      // `gcTime: Infinity` no programa el temporizador de garbage collection.
      // Con el default de cinco minutos, la consulta en caché y la mutación
      // terminada dejan dos temporizadores vivos y Jest no termina nunca.
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  })
  cliente.setQueryData(LLAVE_FEBRERO, mesEnCache())

  const envoltorio = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  )

  const { result } = renderHook(() => useGastoMutation(), { wrapper: envoltorio })
  return { cliente, result }
}

function enCache(cliente: QueryClient) {
  return cliente.getQueryData<GastosDelMes>(LLAVE_FEBRERO)!
}

async function llenarCampos(result: { current: ReturnType<typeof useGastoMutation> }) {
  await act(async () => {
    for (const [campo, valor] of Object.entries(CAMPOS)) {
      result.current.handleChange(campo as keyof typeof CAMPOS, valor)
    }
  })
}

afterEach(() => {
  jest.clearAllMocks()
})

test('el gasto entra en la lista antes de que la API responda', async () => {
  // La promesa se resuelve a mano, para mirar la caché mientras la mutación
  // está en vuelo.
  let responder: (json: GastoCreado) => void = () => {}
  crearGastoMock.mockReturnValue(new Promise((resolve) => { responder = resolve }))

  const { cliente, result } = montar()
  await llenarCampos(result)

  act(() => {
    result.current.guardarGasto()
  })

  await waitFor(() => expect(result.current.estado).toBe('loading'))

  const optimista = enCache(cliente)
  expect(optimista.datos).toHaveLength(2)
  expect(optimista.datos[0]).toMatchObject({
    monto: 45000,
    item: 'uber',
    categoria: 'Transporte',
    fecha: '2026-02-15',
    // Sin método en los campos, queda el default de METODO_DEFAULT.
    metodo: 'TC',
  })
  expect(optimista.total).toBe(50000)

  await act(async () => {
    responder({
      ok: true,
      datos: {
        id: 'de-la-base',
        monto: 45000,
        montoFormateado: '$45.000',
        item: 'uber',
        categoria: 'Transporte',
        categoriaSrc: 'campo',
        metodo: 'TC',
        fecha: '2026-02-15',
        fechaFormateada: '15/02/2026',
      },
    })
  })

  await waitFor(() => expect(result.current.estado).toBe('ok'))
  // El formulario queda limpio para el gasto siguiente.
  expect(result.current.valores).toEqual({ monto: '', item: '', categoria: '', fecha: '' })
})

test('si la API rechaza el gasto, la lista vuelve a como estaba', async () => {
  crearGastoMock.mockRejectedValue(new Error('El monto es obligatorio'))

  const { cliente, result } = montar()
  await llenarCampos(result)

  await act(async () => {
    await result.current.guardarGasto()
  })

  await waitFor(() => expect(result.current.estado).toBe('error'))

  const despues = enCache(cliente)
  expect(despues.datos).toHaveLength(1)
  expect(despues.datos[0].id).toBe('ya-estaba')
  expect(despues.total).toBe(5000)
  expect(result.current.mensaje).toBe('El monto es obligatorio')
  // Los campos no se pierden: el usuario corrige y vuelve a guardar.
  expect(result.current.valores.monto).toBe('45000')
})

test('no llama a la API sin monto ni item', async () => {
  const { result } = montar()

  await act(async () => {
    await result.current.guardarGasto()
  })

  expect(crearGastoMock).not.toHaveBeenCalled()
  expect(result.current.estado).toBe('idle')
})

test('la categoría se infiere de la descripción mientras se escribe', async () => {
  const { result } = montar()
  expect(result.current.categoriaInferida).toBe('Sin categoría')

  await act(async () => {
    result.current.handleChange('item', 'jumbo')
  })
  expect(result.current.categoriaInferida).toBe('Mercado')

  await act(async () => {
    result.current.handleChange('item', 'uber')
  })
  expect(result.current.categoriaInferida).toBe('Transporte')
})

test('la categoría confirmada es la que viaja a la API, aunque la inferida sea otra', async () => {
  crearGastoMock.mockReturnValue(new Promise(() => {}))
  const { result } = montar()

  await act(async () => {
    result.current.handleChange('monto', '5000')
    result.current.handleChange('item', 'uber')
    result.current.handleChange('categoria', 'Ocio')
  })
  act(() => {
    result.current.guardarGasto()
  })

  await waitFor(() => expect(crearGastoMock).toHaveBeenCalled())
  expect(crearGastoMock.mock.calls[0][0]).toBe('5000, uber, Ocio, , TC')
})
