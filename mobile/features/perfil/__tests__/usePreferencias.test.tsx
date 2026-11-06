import type { Preferencias } from '@saldai/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react-native'
import React, { ReactNode } from 'react'

import { fetchPreferencias, guardarPreferencias } from '../api'
import { usePreferencias } from '../usePreferencias'

const fetchMock = fetchPreferencias as jest.MockedFunction<typeof fetchPreferencias>
const guardarMock = guardarPreferencias as jest.MockedFunction<typeof guardarPreferencias>

const respuesta = (datos: Partial<Preferencias['datos']>): Preferencias => ({
  ok: true,
  errores: [],
  datos: {
    categorias: { habilitado: true, activo: false },
    metodos: { habilitado: true, activo: false },
    zona: null,
    ...datos,
  },
})

function montar() {
  const cliente = new QueryClient({
    // `gcTime: Infinity` no programa el temporizador de garbage collection, que
    // con el default dejaría a Jest esperando cinco minutos.
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  })

  const envoltorio = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  )

  return renderHook(() => usePreferencias(), { wrapper: envoltorio })
}

beforeEach(() => {
  jest.clearAllMocks()
})

test('mientras carga muestra todo apagado, que es el estado de la v1', () => {
  // Nunca resuelve: así se observa el primer render, antes de la respuesta.
  fetchMock.mockReturnValue(new Promise(() => {}))

  const { result } = montar()

  expect(result.current.cargando).toBe(true)
  expect(result.current.categoriasVisibles).toBe(false)
  expect(result.current.metodosVisibles).toBe(false)
  expect(result.current.zonaElegida).toBeUndefined()
})

test('si la lectura falla no prende nada', async () => {
  // Apagado es el estado seguro: prender por error haría aparecer un selector
  // que al reintentar desaparece.
  fetchMock.mockRejectedValue(new Error('sin red'))

  const { result } = montar()

  await waitFor(() => expect(result.current.error).toBeTruthy())
  expect(result.current.categoriasVisibles).toBe(false)
  expect(result.current.metodosVisibles).toBe(false)
})

test('una función se ve solo cuando el perfil puede y el usuario quiere', async () => {
  fetchMock.mockResolvedValue(
    respuesta({
      categorias: { habilitado: true, activo: true },
      metodos: { habilitado: false, activo: true },
    })
  )

  const { result } = montar()

  await waitFor(() => expect(result.current.cargando).toBe(false))
  expect(result.current.categoriasVisibles).toBe(true)
  // Lo quiere, pero el perfil no lo tiene habilitado: no se ve.
  expect(result.current.metodosVisibles).toBe(false)
})

test('habilitado sin activo tampoco se ve', async () => {
  fetchMock.mockResolvedValue(respuesta({ categorias: { habilitado: true, activo: false } }))

  const { result } = montar()

  await waitFor(() => expect(result.current.cargando).toBe(false))
  expect(result.current.categoriasVisibles).toBe(false)
})

test('la zona en null se traduce a undefined, para que se use la del dispositivo', async () => {
  fetchMock.mockResolvedValue(respuesta({ zona: null }))

  const { result } = montar()

  await waitFor(() => expect(result.current.cargando).toBe(false))
  expect(result.current.zonaElegida).toBeUndefined()
})

test('la zona elegida viaja tal cual', async () => {
  fetchMock.mockResolvedValue(respuesta({ zona: 'Europe/Madrid' }))

  const { result } = montar()

  await waitFor(() => expect(result.current.zonaElegida).toBe('Europe/Madrid'))
})

test('guardar deja la respuesta en la caché sin volver a pedir', async () => {
  fetchMock.mockResolvedValue(respuesta({}))
  guardarMock.mockResolvedValue(
    respuesta({ categorias: { habilitado: true, activo: true } })
  )

  const { result } = montar()
  await waitFor(() => expect(result.current.cargando).toBe(false))

  result.current.guardar({ categoriasActivo: true })

  await waitFor(() => expect(result.current.categoriasVisibles).toBe(true))
  // La API ya devuelve el estado completo, así que un segundo GET sería un
  // viaje de más y un parpadeo en el toggle.
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
