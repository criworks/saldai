import { QueryClient } from '@tanstack/react-query'

/**
 * El cliente de consultas de la app.
 *
 * Antes cada pantalla tenía su propio `useState` + `fetch` + `useEffect`, así
 * que cambiar de mes volvía a pedir a la API un mes que ya se había mirado
 * hace diez segundos, y un error de red dejaba la pantalla vacía sin reintentar.
 */
export const clienteDeConsultas = new QueryClient({
  defaultOptions: {
    queries: {
      // Un movimiento no cambia solo: el mes que ya se cargó se muestra al toque y
      // se revalida en segundo plano pasado este rato.
      staleTime: 60_000,
      // Lo que se vio hace menos de media hora queda en memoria, así moverse
      // entre meses no vuelve a la red.
      gcTime: 30 * 60_000,
      // El celular pierde la red todo el tiempo; dos reintentos con espera
      // creciente cubren el túnel del metro sin dejar al usuario esperando.
      retry: 2,
      retryDelay: (intento) => Math.min(1000 * 2 ** intento, 8000),
      // React Native no tiene foco de ventana; el refetch al volver a la
      // pantalla lo maneja cada pantalla con useFocusEffect.
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Guardar un movimiento no se reintenta solo: el usuario ve el error y
      // decide, porque un reintento a ciegas puede duplicar el movimiento.
      retry: 0,
    },
  },
})

/**
 * Las llaves de caché, en un solo lugar: una llave escrita a mano en dos
 * pantallas distintas es una caché que no se invalida.
 */
export const llaves = {
  movimientosDelMes: (mes: number, anio: number) => ['movimientos', anio, mes] as const,
  totalesAnuales: (anio: number) => ['movimientos-anuales', anio] as const,
  preferencias: () => ['preferencias'] as const,
  recurrencias: () => ['recurrencias'] as const,
  /**
   * Las propuestas pendientes.
   *
   * No lleva el mes ni la zona en la llave: la respuesta son las propuestas
   * hasta hoy, no las de un periodo, así que no hay parámetro de agrupación que
   * se pueda cambiar sin que la llave lo refleje.
   */
  propuestas: () => ['propuestas'] as const,
  /**
   * El prefijo de todos los meses y de todos los años.
   *
   * Lo usan el editar y el eliminar: cambiarle la fecha a un movimiento lo
   * saca de un mes y lo mete en otro, así que las llaves afectadas son dos y
   * la pantalla tendría que acordarse de la fecha anterior para armarlas. Con
   * el prefijo no hace falta, y no cuesta una ráfaga de pedidos: react-query
   * vuelve a pedir solo las consultas activas y marca viejas las demás.
   */
  todosLosMovimientos: () => ['movimientos'] as const,
  todosLosTotalesAnuales: () => ['movimientos-anuales'] as const,
}
