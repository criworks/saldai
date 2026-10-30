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
      // Un gasto no cambia solo: el mes que ya se cargó se muestra al toque y
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
      // Guardar un gasto no se reintenta solo: el usuario ve el error y
      // decide, porque un reintento a ciegas puede duplicar el gasto.
      retry: 0,
    },
  },
})

/**
 * Las llaves de caché, en un solo lugar: una llave escrita a mano en dos
 * pantallas distintas es una caché que no se invalida.
 */
export const llaves = {
  gastosDelMes: (mes: number, anio: number) => ['gastos', anio, mes] as const,
  totalesAnuales: (anio: number) => ['gastos-anuales', anio] as const,
}
