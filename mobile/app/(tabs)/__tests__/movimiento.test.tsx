import type {
  MovimientosDelMes,
  Preferencias,
  PropuestaPendiente,
  PropuestasPendientes,
} from '@saldai/core'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native'
import React, { ReactNode } from 'react'
import { DeviceEventEmitter } from 'react-native'
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context'

import {
  atarRecurrencia,
  editarMovimiento,
  eliminarMovimiento,
  fetchMovimientosPorMes,
} from '@/features/movimientos/api'
import { MovimientosProvider } from '@/features/movimientos'
import {
  confirmarPropuesta,
  fetchPropuestas,
  fetchRecurrencia,
  omitirPropuesta,
  terminarRecurrencia,
} from '@/features/recurrencias/api'
import { fetchPreferencias } from '@/features/perfil/api'
import MovimientoScreen from '../movimiento'

// Las propuestas tampoco salen a la red: es el mismo trato que `jest.setup` le
// da a la API de movimientos y a la del perfil.
jest.mock('@/features/recurrencias/api')

// El prefijo `mock` es lo que deja a la fábrica de `jest.mock` leer una
// variable de afuera.
const mockVolver = jest.fn()
let mockParametros: Record<string, string> = {}
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockVolver, push: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => mockParametros,
  // El formulario enfoca el monto al entrar; fuera del navegador el efecto
  // corre una vez y alcanza.
  useFocusEffect: (efecto: () => void | (() => void)) => {
    const React = require('react')
    React.useEffect(efecto, [])
  },
}))

const movimientosMock = fetchMovimientosPorMes as jest.MockedFunction<typeof fetchMovimientosPorMes>
const editarMock = editarMovimiento as jest.MockedFunction<typeof editarMovimiento>
const eliminarMock = eliminarMovimiento as jest.MockedFunction<typeof eliminarMovimiento>
const preferenciasMock = fetchPreferencias as jest.MockedFunction<typeof fetchPreferencias>
const propuestasMock = fetchPropuestas as jest.MockedFunction<typeof fetchPropuestas>
const confirmarMock = confirmarPropuesta as jest.MockedFunction<typeof confirmarPropuesta>
const omitirMock = omitirPropuesta as jest.MockedFunction<typeof omitirPropuesta>
const atarMock = atarRecurrencia as jest.MockedFunction<typeof atarRecurrencia>
const planMock = fetchRecurrencia as jest.MockedFunction<typeof fetchRecurrencia>
const terminarMock = terminarRecurrencia as jest.MockedFunction<typeof terminarRecurrencia>

const METRICAS = {
  frame: { x: 0, y: 0, width: 412, height: 917 },
  insets: { top: 24, left: 0, right: 0, bottom: 24 },
}

const hoy = new Date()
const DEL_MES: MovimientosDelMes = {
  ok: true,
  cantidad: 1,
  total: 45000,
  totalFormateado: '$45.000',
  datos: [
    {
      id: 'mov-1',
      monto: 45000,
      monto_formateado: '$45.000',
      item: 'uber',
      categoria: 'Transporte',
      fecha: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-05`,
      metodo: 'TC',
      notas: null,
    },
  ],
}

const PROPUESTA: PropuestaPendiente = {
  recurrenciaId: 'rec-1',
  fecha: '2026-03-05',
  movimiento: {
    monto: 525457,
    montoFormateado: '$525.457',
    item: 'arriendo',
    categoria: 'Básicos',
    categoriaSrc: 'campo',
    metodo: 'TC',
    fecha: '2026-03-05',
    notas: null,
  },
  recurrencia: {
    id: 'rec-1',
    monto: 525457,
    monto_formateado: '$525.457',
    item: 'arriendo',
    categoria: 'Básicos',
    categoria_src: 'campo',
    metodo: 'TC',
    notas: null,
    frecuencia: 'mensual',
    vigente_desde: '2026-01-05',
    vigente_hasta: null,
    input_original: null,
    zona: 'America/Santiago',
    hoy_resuelto: null,
  },
}

const PENDIENTES: PropuestasPendientes = {
  ok: true,
  errores: [],
  advertencias: [],
  cantidad: 1,
  datos: [PROPUESTA],
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
        <MovimientosProvider>
          {children}
          <PortalHost />
        </MovimientosProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )

  return render(<MovimientoScreen />, { wrapper: envoltorio })
}

/** El check del footer, que en la app vive en la barra de abajo. */
const tocarCheck = () => act(() => DeviceEventEmitter.emit('guardarMovimiento'))
/** El tacho del footer. */
const tocarTacho = () => act(() => DeviceEventEmitter.emit('descartarMovimiento'))

beforeEach(() => {
  jest.clearAllMocks()
  movimientosMock.mockResolvedValue(DEL_MES)
  propuestasMock.mockResolvedValue(PENDIENTES)
  preferenciasMock.mockResolvedValue(PREFERENCIAS)
  editarMock.mockResolvedValue({
    ok: true,
    errores: [],
    datos: { ...DEL_MES.datos[0], item: 'taxi' },
  })
  eliminarMock.mockResolvedValue({ ok: true, errores: [], datos: DEL_MES.datos[0] })
  confirmarMock.mockResolvedValue({
    ok: true,
    errores: [],
    datos: { ...DEL_MES.datos[0], id: 'mov-2', item: 'arriendo' },
  })
  omitirMock.mockResolvedValue({ ok: true })
  atarMock.mockResolvedValue({ ok: true, errores: [], datos: PROPUESTA.recurrencia })
  terminarMock.mockResolvedValue({ ok: true, errores: [], datos: PROPUESTA.recurrencia })
  planMock.mockResolvedValue({
    ok: true,
    errores: [],
    datos: PROPUESTA.recurrencia,
    vivo: PROPUESTA.recurrencia,
  })
})

describe('un movimiento ya registrado', () => {
  beforeEach(() => {
    mockParametros = { id: 'mov-1' }
  })

  test('abre con los valores de la fila del mes', async () => {
    montar()

    expect(await screen.findByDisplayValue('uber')).toBeTruthy()
    expect(screen.getByDisplayValue('45.000')).toBeTruthy()
  })

  test('el check manda solo lo que cambió, y sale', async () => {
    montar()
    const descripcion = await screen.findByDisplayValue('uber')

    await userEvent.clear(descripcion)
    await userEvent.type(descripcion, 'taxi')
    tocarCheck()

    await waitFor(() => expect(editarMock).toHaveBeenCalledWith('mov-1', { item: 'taxi' }))
    expect(mockVolver).toHaveBeenCalled()
  })

  test('sin cambios el check es solo volver: no manda un PATCH vacío', async () => {
    montar()
    await screen.findByDisplayValue('uber')

    tocarCheck()

    await waitFor(() => expect(mockVolver).toHaveBeenCalled())
    expect(editarMock).not.toHaveBeenCalled()
  })

  test('el tacho pide confirmación antes de eliminar', async () => {
    montar()
    await screen.findByDisplayValue('uber')

    tocarTacho()

    const boton = await screen.findByText('Eliminar movimiento')
    expect(eliminarMock).not.toHaveBeenCalled()

    await userEvent.press(boton)

    await waitFor(() => expect(eliminarMock).toHaveBeenCalledWith('mov-1'))
    expect(mockVolver).toHaveBeenCalled()
  })
})

describe('una propuesta por confirmar', () => {
  beforeEach(() => {
    mockParametros = { recurrenciaId: 'rec-1', fecha: '2026-03-05' }
  })

  test('se ve que está por confirmar, y de qué fecha', async () => {
    montar()

    expect(await screen.findByText('Por confirmar')).toBeTruthy()
    expect(screen.getByText('Del 05/03/2026')).toBeTruthy()
  })

  test('el check confirma con la fecha prevista y el cambio que se escribió', async () => {
    montar()
    const descripcion = await screen.findByDisplayValue('arriendo')

    await userEvent.clear(descripcion)
    await userEvent.type(descripcion, 'arriendo marzo')
    tocarCheck()

    await waitFor(() =>
      expect(confirmarMock).toHaveBeenCalledWith('rec-1', '2026-03-05', {
        item: 'arriendo marzo',
      })
    )
    expect(mockVolver).toHaveBeenCalled()
  })

  test('el tacho omite sin pedir confirmación: no se borra nada', async () => {
    montar()
    await screen.findByDisplayValue('arriendo')

    tocarTacho()

    await waitFor(() => expect(omitirMock).toHaveBeenCalledWith('rec-1', '2026-03-05'))
    expect(screen.queryByText('Eliminar movimiento')).toBeNull()
    expect(mockVolver).toHaveBeenCalled()
  })
})

describe('la recurrencia desde el movimiento', () => {
  test('un movimiento sin plan se puede marcar como recurrente, anclado en su fecha', async () => {
    mockParametros = { id: 'mov-1' }
    montar()
    await screen.findByDisplayValue('uber')

    // Sin plan el botón abre idle: marcarlo ata uno nuevo, y de eso se encarga
    // la API (el plan se ancla en la fecha del movimiento).
    await userEvent.press(await screen.findByLabelText('Hacer recurrente'))
    await userEvent.press(screen.getByLabelText('Cada mes'))
    await userEvent.press(screen.getByLabelText('Listo'))

    await waitFor(() =>
      expect(atarMock).toHaveBeenCalledWith('mov-1', {
        frecuencia: 'mensual',
        // Sin regla elegida viaja vacía, que es "derivá del ancla": acá, el día
        // del mes de la fecha del movimiento.
        repeticion: {
          diaDeLaSemana: null,
          semanaDelMes: null,
          diaDelMes: null,
          mesDelAnio: null,
        },
      })
    )
    expect(mockVolver).not.toHaveBeenCalled()
  })

  test('un movimiento con plan abre activo, y eliminar corta el plan vivo', async () => {
    movimientosMock.mockResolvedValue({
      ...DEL_MES,
      datos: [{ ...DEL_MES.datos[0], recurrencia_id: 'rec-1' }],
    })
    mockParametros = { id: 'mov-1' }
    montar()

    // El plan que se muestra es el vivo de la cadena, no el id que anotó la
    // fila: desde un movimiento viejo puede ser una versión ya cerrada.
    expect(await screen.findByText('Cada mes')).toBeTruthy()
    await waitFor(() => expect(planMock).toHaveBeenCalledWith('rec-1'))

    await userEvent.press(screen.getByLabelText('Recurrente'))
    await userEvent.press(screen.getByLabelText('Eliminar la recurrencia'))
    await userEvent.press(screen.getByText('Eliminar la recurrencia'))

    // La zona va en el pedido: el día del corte lo resuelve el servidor, y es
    // el del dispositivo y no el de Chile.
    await waitFor(() =>
      expect(terminarMock).toHaveBeenCalledWith('rec-1', expect.any(String))
    )
    // Eliminar la recurrencia no elimina el movimiento, así que la pantalla se
    // queda donde está.
    expect(eliminarMock).not.toHaveBeenCalled()
    expect(mockVolver).not.toHaveBeenCalled()
  })
})

describe('la pantalla queda montada entre dos entradas', () => {
  // `(tabs)/movimiento` es una pantalla de las tabs: al volver atrás no se
  // desmonta, así que la siguiente entra al mismo componente con el estado de
  // la vez anterior. Sin atar el borrador a la identidad de los parámetros, la
  // pantalla mostraba el movimiento anterior y las acciones salían contra él.
  test('abrir otra cosa no muestra la anterior', async () => {
    mockParametros = { id: 'mov-1' }
    const { rerender } = montar()
    await screen.findByDisplayValue('uber')

    mockParametros = { recurrenciaId: 'rec-1', fecha: '2026-03-05' }
    rerender(<MovimientoScreen />)

    expect(await screen.findByDisplayValue('arriendo')).toBeTruthy()
    expect(screen.queryByDisplayValue('uber')).toBeNull()
  })

  test('y el check va contra lo que está en pantalla, no contra lo anterior', async () => {
    // Este era el síntoma raro: con una propuesta en pantalla y un movimiento
    // guardado en el estado, el check mandaba un PATCH con un id `undefined` y
    // la API respondía "el parámetro id tiene que ser el uuid de un movimiento",
    // sin dejar guardar ni eliminar.
    mockParametros = { id: 'mov-1' }
    const { rerender } = montar()
    await screen.findByDisplayValue('uber')

    mockParametros = { recurrenciaId: 'rec-1', fecha: '2026-03-05' }
    rerender(<MovimientoScreen />)
    await screen.findByDisplayValue('arriendo')

    tocarCheck()

    await waitFor(() =>
      expect(confirmarMock).toHaveBeenCalledWith('rec-1', '2026-03-05', {})
    )
    expect(editarMock).not.toHaveBeenCalled()
  })
})
