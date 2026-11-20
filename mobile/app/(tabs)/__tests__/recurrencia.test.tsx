import type { Preferencias, Recurrencia } from '@saldai/core'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, userEvent, waitFor } from '@testing-library/react-native'
import React, { ReactNode } from 'react'
import { DeviceEventEmitter } from 'react-native'
import { act } from '@testing-library/react-native'
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context'

import {
  crearRecurrencia,
  editarRecurrencia,
  fetchRecurrencias,
  terminarRecurrencia,
} from '@/features/recurrencias/api'
import { fetchPreferencias } from '@/features/perfil/api'
import RecurrenciaScreen from '../recurrencia'

jest.mock('@/features/recurrencias/api')

const mockVolver = jest.fn()
let mockParametros: Record<string, string> = {}
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockVolver, push: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => mockParametros,
  useFocusEffect: (efecto: () => void | (() => void)) => {
    const React = require('react')
    React.useEffect(efecto, [])
  },
}))

const planesMock = fetchRecurrencias as jest.MockedFunction<typeof fetchRecurrencias>
const crearMock = crearRecurrencia as jest.MockedFunction<typeof crearRecurrencia>
const editarMock = editarRecurrencia as jest.MockedFunction<typeof editarRecurrencia>
const terminarMock = terminarRecurrencia as jest.MockedFunction<typeof terminarRecurrencia>
const preferenciasMock = fetchPreferencias as jest.MockedFunction<typeof fetchPreferencias>

const METRICAS = {
  frame: { x: 0, y: 0, width: 412, height: 917 },
  insets: { top: 24, left: 0, right: 0, bottom: 24 },
}

const PLAN: Recurrencia = {
  id: 'rec-1',
  monto: 525457,
  monto_formateado: '$525.457',
  item: 'arriendo',
  categoria: 'Básicos',
  categoria_src: 'campo',
  metodo: 'TC',
  notas: null,
  frecuencia: 'mensual',
  // Anclado un día 5, que es lo que el `desde` de una edición tiene que
  // conservar.
  vigente_desde: '2026-01-05',
  vigente_hasta: null,
  input_original: null,
  zona: 'America/Santiago',
  hoy_resuelto: null,
  plan_anterior_id: null,
}

const PREFERENCIAS: Preferencias = {
  ok: true,
  errores: [],
  datos: {
    categorias: { habilitado: true, activo: false },
    metodos: { habilitado: true, activo: false },
    recurrencias: { habilitado: true, activo: true },
    zona: null,
  },
}

function montar() {
  const cliente = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  })

  const envoltorio = ({ children }: { children: ReactNode }) => (
    <SafeAreaProvider initialMetrics={initialWindowMetrics ?? METRICAS}>
      <QueryClientProvider client={cliente}>
        {children}
        <PortalHost />
      </QueryClientProvider>
    </SafeAreaProvider>
  )

  return render(<RecurrenciaScreen />, { wrapper: envoltorio })
}

/** El check de la barra de abajo, que la dibuja el footer de la app. */
const tocarCheck = () => act(() => DeviceEventEmitter.emit('guardarMovimiento'))
/** El tacho. */
const tocarTacho = () => act(() => DeviceEventEmitter.emit('descartarMovimiento'))

const hoy = new Date()
const hoyIso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

beforeEach(() => {
  jest.clearAllMocks()
  planesMock.mockResolvedValue({ ok: true, errores: [], advertencias: [], datos: [PLAN] })
  preferenciasMock.mockResolvedValue(PREFERENCIAS)
  crearMock.mockResolvedValue({ ok: true, errores: [], datos: PLAN })
  editarMock.mockResolvedValue({ ok: true, errores: [], datos: PLAN })
  terminarMock.mockResolvedValue({ ok: true, errores: [], datos: PLAN })
})

describe('un plan nuevo', () => {
  beforeEach(() => {
    mockParametros = {}
  })

  test('se crea con el mismo formulario que un movimiento, anclado en la fecha elegida', async () => {
    montar()

    await userEvent.type(screen.getByLabelText('Monto'), '1000')
    await userEvent.type(screen.getByLabelText('Descripción'), 'netflix')
    // La frecuencia es lo propio del plan y va en el botón de alarma.
    await userEvent.press(screen.getByLabelText('Recurrente'))
    await userEvent.press(screen.getByLabelText('Cada semana'))
    tocarCheck()

    await waitFor(() =>
      expect(crearMock).toHaveBeenCalledWith(
        expect.objectContaining({
          input: '1000, netflix, , TC',
          frecuencia: 'semanal',
          // El ancla viaja aparte y no dentro de la línea: la de la línea la
          // leería el parser con su propio "hoy".
          desde: hoyIso,
        })
      )
    )
    expect(mockVolver).toHaveBeenCalled()
  })

  test('el tacho sale sin crear nada', async () => {
    montar()
    await userEvent.type(screen.getByLabelText('Monto'), '1000')

    tocarTacho()

    await waitFor(() => expect(mockVolver).toHaveBeenCalled())
    expect(crearMock).not.toHaveBeenCalled()
    // Nada que terminar: el plan todavía no existe.
    expect(terminarMock).not.toHaveBeenCalled()
  })

  test('sin monto ni item no se guarda', async () => {
    montar()

    tocarCheck()

    expect(await screen.findByText('Un plan necesita monto e item')).toBeTruthy()
    expect(crearMock).not.toHaveBeenCalled()
  })
})

describe('un plan que ya existe', () => {
  beforeEach(() => {
    mockParametros = { id: 'rec-1' }
  })

  test('abre con sus valores y con su frecuencia', async () => {
    montar()

    expect(await screen.findByDisplayValue('arriendo')).toBeTruthy()
    expect(screen.getByDisplayValue('525.457')).toBeTruthy()
    expect(screen.getByText('Cada mes')).toBeTruthy()
  })

  test('el cambio vale desde la próxima ocurrencia, no desde hoy', async () => {
    montar()
    const descripcion = await screen.findByDisplayValue('arriendo')

    await userEvent.clear(descripcion)
    await userEvent.type(descripcion, 'arriendo nuevo')
    tocarCheck()

    await waitFor(() => expect(editarMock).toHaveBeenCalled())

    const [id, cambio] = editarMock.mock.calls[0]
    expect(id).toBe('rec-1')
    expect(cambio.item).toBe('arriendo nuevo')
    // El `desde` pasa a ser el ancla del plan que sigue: con "hoy", el arriendo
    // del 5 se mudaría al día en que a alguien le tocó editarlo.
    expect(cambio.desde.endsWith('-05')).toBe(true)
    expect(cambio.desde >= hoyIso).toBe(true)
    expect(mockVolver).toHaveBeenCalled()
  })

  test('el tacho lo termina, avisando que no borra movimientos', async () => {
    montar()
    await screen.findByDisplayValue('arriendo')

    tocarTacho()

    expect(
      await screen.findByText(
        '"arriendo" deja de proponerse desde hoy. Los movimientos que ya se crearon quedan como están.'
      )
    ).toBeTruthy()
    expect(terminarMock).not.toHaveBeenCalled()

    await userEvent.press(screen.getByText('Eliminar la recurrencia'))

    await waitFor(() => expect(terminarMock).toHaveBeenCalledWith('rec-1', expect.any(String)))
    expect(mockVolver).toHaveBeenCalled()
  })
})
