/**
 * Respuestas simuladas de la API, para revisar estados de UI sin tocar el
 * backend: lista vacía, lista gigante, carga eterna, errores.
 *
 * Se activan con `EXPO_PUBLIC_USE_MOCKS=true` y el estado se cambia en caliente
 * desde el playground, con `mockFeedConfig`. En un build de EAS las variables
 * quedan congeladas dentro del bundle, así que esto es solo para desarrollo.
 *
 * Vive aparte de `services/api.ts` a propósito: cuando estaban juntos, cada
 * función de red empezaba con treinta líneas de mentira antes de llegar al
 * `fetch`, y costaba ver qué hacía la app de verdad.
 */

import { categorizar, formatearMonto, isoAChileno } from '@saldai/core'
import { mockFeedConfig } from './config'
import { GASTOS, GASTOS_MUCHOS, gastoDeMentira } from './datos'

const esperar = (ms: number) => new Promise(res => setTimeout(res, ms))

/** Está prendido solo si la variable dice exactamente "true". */
export const enModoMock = process.env.EXPO_PUBLIC_USE_MOCKS === 'true'

/**
 * La espera que comparten todas las llamadas simuladas, para que la UI muestre
 * sus estados de carga como los mostraría de verdad. El estado "loading" no
 * termina nunca en la práctica: son diez segundos.
 */
async function esperarSegunEstado() {
  await esperar(mockFeedConfig.state === 'loading' ? 10000 : 800)
}

export async function fetchGastosPorMes() {
  await esperarSegunEstado()

  if (mockFeedConfig.state === 'error') {
    throw new Error('Error simulado al obtener los gastos del mes')
  }

  const datos =
    mockFeedConfig.state === 'empty' ? [] : mockFeedConfig.state === 'huge' ? GASTOS_MUCHOS : GASTOS

  const total = datos.reduce((acc, g) => acc + g.monto, 0)

  return { ok: true as const, cantidad: datos.length, total, totalFormateado: formatearMonto(total), datos }
}

export async function fetchGastosAnuales(anio: number | string) {
  await esperarSegunEstado()

  if (mockFeedConfig.state === 'error') {
    throw new Error('Error simulado al obtener los totales del año')
  }

  const totales =
    mockFeedConfig.state === 'empty'
      ? Array(12).fill(0)
      : Array.from({ length: 12 }, () => Math.floor(Math.random() * 500000) + 100000)

  return { ok: true as const, anio, totales }
}

/**
 * Los errores se disparan por el nombre del item, así se prueban desde la
 * pantalla de captura sin tocar código: "error api", "error rate", "error db",
 * "error token" y "long espera".
 */
const ERRORES_POR_ITEM: { prefijo: string; espera: number; mensaje: string }[] = [
  { prefijo: 'error api', espera: 500, mensaje: 'Error simulado: No se pudo conectar con el servidor (503)' },
  { prefijo: 'error rate', espera: 200, mensaje: 'Too many requests. Please try again after 30 seconds.' },
  { prefijo: 'error db', espera: 800, mensaje: 'Error simulado: Fallo de restricción en base de datos' },
  { prefijo: 'error token', espera: 300, mensaje: 'Error simulado: Token de sesión expirado o inválido' },
]

export async function crearGasto(input: string) {
  const partes = input.split(',').map(p => p.trim())
  const item = partes[1] || input
  const monto = parseInt(partes[0].replace(/[^0-9]/g, ''), 10) || 9999

  const falla = ERRORES_POR_ITEM.find(e => item.toLowerCase().startsWith(e.prefijo))
  if (falla) {
    await esperar(falla.espera)
    throw new Error(falla.mensaje)
  }

  await esperar(item.toLowerCase().startsWith('long espera') ? 5000 : 800)

  // La categoría se infiere con la misma regla que usa la API, así el mock
  // responde como responde producción.
  const nuevo = gastoDeMentira(Date.now().toString(), monto, item, categorizar(item))
  GASTOS.unshift(nuevo)

  // `POST /gastos` devuelve lo que armó el parser, no la fila cruda: de ahí
  // salen `montoFormateado`, `categoriaSrc` y `fechaFormateada`. El mock las
  // faltaba y el tipo del contrato lo cacheó.
  return {
    ok: true as const,
    datos: {
      ...nuevo,
      montoFormateado: nuevo.monto_formateado,
      categoriaSrc: 'item' as const,
      fechaFormateada: isoAChileno(nuevo.fecha),
    },
  }
}
