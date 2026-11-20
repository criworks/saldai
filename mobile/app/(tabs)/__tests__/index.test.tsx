import type { MovimientosDelMes, Preferencias, PropuestaPendiente } from '@saldai/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import React, { ReactNode } from 'react'
import { Pressable, Text } from 'react-native'
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context'

import { fetchMovimientosPorMes } from '@/features/movimientos/api'
import { FilterProvider, MovimientosProvider, useFilter } from '@/features/movimientos'
import { fetchPreferencias } from '@/features/perfil/api'
import { fetchPropuestas } from '@/features/recurrencias/api'
import DashboardScreen from '../index'

const movimientosMock = fetchMovimientosPorMes as jest.MockedFunction<typeof fetchMovimientosPorMes>
const preferenciasMock = fetchPreferencias as jest.MockedFunction<typeof fetchPreferencias>
const propuestasMock = fetchPropuestas as jest.MockedFunction<typeof fetchPropuestas>

// Las propuestas no viven en el api de movimientos, que es el que mockea
// `jest.setup.js`: sin este mock la pantalla llamaría a la red de verdad.
jest.mock('@/features/recurrencias/api')

const METRICAS = {
  frame: { x: 0, y: 0, width: 412, height: 917 },
  insets: { top: 24, left: 0, right: 0, bottom: 24 },
}

const hoy = new Date()
const fechaDeHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

const DEL_MES: MovimientosDelMes = {
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
    recurrencias: { habilitado: true, activo: true },
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
          <MovimientosProvider>
            {children}
            <ElegirCategoria categoria={categoria} />
          </MovimientosProvider>
        </FilterProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )

  return render(<DashboardScreen />, { wrapper: envoltorio })
}

beforeEach(() => {
  jest.clearAllMocks()
  movimientosMock.mockResolvedValue(DEL_MES)
  preferenciasMock.mockResolvedValue(PREFERENCIAS(true))
  propuestasMock.mockResolvedValue({ ok: true, errores: [], advertencias: [], cantidad: 0, datos: [] })
})

test('sin filtro muestra todos los movimientos del mes y su total', async () => {
  montar()

  await waitFor(() => expect(screen.getByText('pan')).toBeTruthy())
  expect(screen.getByText('uber')).toBeTruthy()
  expect(screen.getByText('feria')).toBeTruthy()
  expect(screen.getByText('$6.000')).toBeTruthy()
})

test('con una categoría elegida quedan solo sus movimientos', async () => {
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

test('una categoría sin movimientos en el mes se dice distinto de un mes vacío', async () => {
  montar('Ocio')
  await waitFor(() => expect(screen.getByText('pan')).toBeTruthy())

  fireEvent.press(screen.getByTestId('elegir'))

  await waitFor(() => expect(screen.getByText('No hay movimientos de Ocio este mes')).toBeTruthy())
  expect(screen.queryByText('No hay movimientos este mes')).toBeNull()
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

/** Una propuesta pendiente, como la devuelve la API. */
function propuesta(fecha: string, item: string, monto: number): PropuestaPendiente {
  return {
    recurrenciaId: 'rec-1',
    fecha,
    movimiento: {
      monto,
      montoFormateado: `$${monto}`,
      item,
      categoria: 'Básicos',
      categoriaSrc: 'campo',
      metodo: 'TC',
      fecha,
      notas: null,
    },
    recurrencia: {
      id: 'rec-1',
      monto,
      monto_formateado: `$${monto}`,
      item,
      categoria: 'Básicos',
      categoria_src: 'campo',
      metodo: 'TC',
      notas: null,
      frecuencia: 'mensual',
      vigente_desde: fecha,
      vigente_hasta: null,
      input_original: null,
      zona: 'America/Santiago',
      hoy_resuelto: null,
    },
  }
}

test('una propuesta del mes va en la lista, bajo el encabezado de su día', async () => {
  // Y no en un bloque aparte arriba: una propuesta del 5 es plata que salió el
  // 5, y cuadrar el mes es mirar el día completo.
  propuestasMock.mockResolvedValue({
    ok: true,
    errores: [],
    advertencias: [],
    cantidad: 1,
    datos: [propuesta(fechaDeHoy, 'arriendo', 525457)],
  })
  montar()

  await waitFor(() => expect(screen.getByText('arriendo')).toBeTruthy())
  expect(screen.getByText('Hoy')).toBeTruthy()
  expect(screen.getByLabelText(/arriendo del .*, por confirmar/)).toBeTruthy()
  // El reloj es de la propuesta y de nadie más.
  expect(screen.getAllByTestId('fila-recurrente')).toHaveLength(1)
  // Y no está contada en el total: no es un movimiento hasta que se confirma.
  expect(screen.getByText('$6.000')).toBeTruthy()
})

test('el movimiento que ancla un plan no lleva reloj', async () => {
  // El reloj marca lo que está por confirmar. El ancla ya está registrada, así
  // que es un movimiento como los demás aunque tenga `recurrencia_id`.
  movimientosMock.mockResolvedValue({
    ...DEL_MES,
    datos: DEL_MES.datos.map((m) => ({ ...m, recurrencia_id: 'rec-1' })),
  })
  montar()

  await waitFor(() => expect(screen.getByText('pan')).toBeTruthy())
  expect(screen.queryAllByTestId('fila-recurrente')).toHaveLength(0)
})

test('lo que quedó por confirmar en otro mes se avisa en una línea', async () => {
  // Las propuestas se ven en su fecha, así que una de otro mes no entra en
  // esta lista. Sin el aviso deja de existir para quien mira este mes, y es
  // justo la que se está olvidando.
  const otroMes = `${hoy.getFullYear()}-${String(((hoy.getMonth() + 10) % 12) + 1).padStart(2, '0')}-05`
  propuestasMock.mockResolvedValue({
    ok: true,
    errores: [],
    advertencias: [],
    cantidad: 1,
    datos: [propuesta(otroMes, 'arriendo', 525457)],
  })
  montar()

  await waitFor(() => expect(screen.getByTestId('propuestas-de-otros-meses')).toBeTruthy())
  expect(screen.getByText('1 por confirmar en otro mes')).toBeTruthy()
  // Y no se cuela entre los días del mes abierto.
  expect(screen.queryByText('arriendo')).toBeNull()
})

test('con las recurrencias apagadas no hay propuestas ni aviso', async () => {
  preferenciasMock.mockResolvedValue({
    ok: true,
    errores: [],
    datos: {
      categorias: { habilitado: true, activo: true },
      metodos: { habilitado: true, activo: false },
      recurrencias: { habilitado: true, activo: false },
      zona: null,
    },
  })
  propuestasMock.mockResolvedValue({
    ok: true,
    errores: [],
    advertencias: [],
    cantidad: 1,
    datos: [propuesta(fechaDeHoy, 'arriendo', 525457)],
  })
  montar()

  await waitFor(() => expect(screen.getByText('pan')).toBeTruthy())
  expect(screen.queryByText('arriendo')).toBeNull()
  expect(screen.queryByTestId('propuestas-de-otros-meses')).toBeNull()
})

test('le pide a la API hasta el fin del mes que se está mirando', async () => {
  // La ventana la decide el hook a partir del mes abierto, así que la lista y
  // la vista de una propuesta leen la misma consulta: con una ventana por
  // pantalla quedarían en llaves distintas y abrir una propuesta de fin de mes
  // encontraría una caché que no la tiene.
  const ultimoDelMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
  const finDelMes = `${ultimoDelMes.getFullYear()}-${String(ultimoDelMes.getMonth() + 1).padStart(2, '0')}-${String(ultimoDelMes.getDate()).padStart(2, '0')}`

  montar()

  await waitFor(() => expect(propuestasMock).toHaveBeenCalled())
  expect(propuestasMock).toHaveBeenCalledWith(expect.any(String), finDelMes)
})

test('una propuesta del mes que todavía no llegó también se ve', async () => {
  // Es lo que cambia con la ventana del mes: antes la API proponía hasta hoy,
  // así que un plan mensual no mostraba nada hasta que llegaba el día.
  const ultimoDelMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
  const finDelMes = `${ultimoDelMes.getFullYear()}-${String(ultimoDelMes.getMonth() + 1).padStart(2, '0')}-${String(ultimoDelMes.getDate()).padStart(2, '0')}`

  propuestasMock.mockResolvedValue({
    ok: true,
    errores: [],
    advertencias: [],
    cantidad: 1,
    datos: [propuesta(finDelMes, 'arriendo', 525457)],
  })
  montar()

  await waitFor(() => expect(screen.getByText('arriendo')).toBeTruthy())
  // En su día, no en el aviso de otros meses.
  expect(screen.queryByTestId('propuestas-de-otros-meses')).toBeNull()
})
