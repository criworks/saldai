import { queryOptions } from '@tanstack/react-query'
import { llaves } from '@/lib/consultas'
import { fetchGastosPorMes } from './api'

/**
 * Cuánto dura fresco un mes en caché antes de volver a pedirlo.
 *
 * Los gastos solo cambian cuando el usuario guarda uno, y cada alta ya
 * invalida el mes que le toca (ver `useGastoMutation`). Así que un mes que no
 * es el que corre no tiene por qué volver a la red cada minuto: queda fresco
 * hasta que una alta lo invalide, el usuario tire para refrescar, o la caché lo
 * suelte por no usarlo (`gcTime`, media hora).
 *
 * El mes en curso sí conserva el minuto por defecto, porque es el que puede
 * recibir un gasto cargado desde otro lado.
 */
export function frescuraDelMes(mes: number, anio: number, hoy = new Date()) {
  const esElMesEnCurso = mes === hoy.getMonth() + 1 && anio === hoy.getFullYear()
  return esElMesEnCurso ? 60_000 : Infinity
}

/**
 * La consulta de un mes, en un solo lugar: la pantalla que lo muestra y la que
 * lo pide por adelantado usan la misma llave, la misma función y la misma
 * frescura, y por eso el adelanto sirve.
 */
export function consultaDelMes(mes: number, anio: number) {
  return queryOptions({
    queryKey: llaves.gastosDelMes(mes, anio),
    queryFn: () => fetchGastosPorMes(mes, anio),
    staleTime: frescuraDelMes(mes, anio),
  })
}
