import { categorizar, formatearMonto, METODO_DEFAULT, TARJETA, EFECTIVO } from '@saldai/core'
import { supabase } from './supabase'

const API_URL = process.env.EXPO_PUBLIC_API_URL
// ============================================================================
// MOCK MODE SETUP (DEV/QA ONLY)
// Este flag previene que la app golpee el backend real.
// En producción, `process.env.EXPO_PUBLIC_USE_MOCKS` siempre será undefined/false.
// ============================================================================
const isMockMode = process.env.EXPO_PUBLIC_USE_MOCKS === 'true'

// Función auxiliar para obtener los headers con el token de autenticación
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  
  return headers
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Saca el mensaje de error de una respuesta de la API.
 *
 * La API siempre responde `{ ok, errores: string[] }`, nunca `{ error }`, así
 * que leer `error` dejaba fuera el detalle (por ejemplo "El parámetro 'mes'
 * debe ser un número entre 1 y 12") y siempre se mostraba el texto genérico.
 * Los errores del parser vienen varios juntos, así que se muestran todos.
 */
async function leerError(res: Response, fallback: string): Promise<string> {
  const cuerpo = await res.json().catch(() => null)
  return mensajeDeError(cuerpo, fallback)
}

function mensajeDeError(cuerpo: unknown, fallback: string): string {
  if (cuerpo && typeof cuerpo === 'object') {
    const { errores, error } = cuerpo as { errores?: unknown; error?: unknown }
    if (Array.isArray(errores) && errores.length > 0) {
      return errores.filter((e): e is string => typeof e === 'string').join('\n') || fallback
    }
    if (typeof error === 'string' && error) return error
  }
  return fallback
}

import { mockFeedConfig } from './mockConfig';

// Los mocks tienen que verse como lo que devuelve la API de verdad: categoría
// del catálogo, método en mayúsculas y monto en formato chileno. Antes
// inventaban categorías ("Comida", "Despensa", "Test") que ningún selector ni
// color conocía, y el monto venía en formato gringo ($15,000.00).
const mockGasto = (
  id: string,
  monto: number,
  item: string,
  categoria: string,
  diasAtras = 0,
  metodo: string = METODO_DEFAULT
) => ({
  id,
  monto,
  monto_formateado: formatearMonto(monto),
  item,
  categoria,
  fecha: new Date(Date.now() - diasAtras * 86400000).toISOString().split('T')[0],
  metodo,
})

const MOCK_GASTOS = [
  mockGasto('1', 15000, 'Uber', 'Transporte', 0, TARJETA),
  mockGasto('2', 3500, 'Café', 'Ocio', 0, EFECTIVO),
  mockGasto('3', 120000, 'Supermercado', 'Mercado', 1, TARJETA),
  mockGasto('4', 45000, 'Rappi', 'Delivery', 2, TARJETA),
];

const MOCK_GASTOS_HUGE = Array.from({ length: 150 }).map((_, i) =>
  mockGasto(
    `huge-${i}`,
    Math.floor(Math.random() * 50000) + 1000,
    `Gasto Masivo ${i}`,
    'Ocio',
    Math.floor(Math.random() * 10)
  )
);

export async function fetchGastosPorMes(mes: number, anio?: number) {
  if (isMockMode) {
    if (mockFeedConfig.state === 'loading') {
      await delay(10000); // Simulate an infinite/long loading state
    } else {
      await delay(800);
    }

    if (mockFeedConfig.state === 'error') {
      throw new Error('Simulated network error fetching expenses.');
    }

    let datos = MOCK_GASTOS;
    if (mockFeedConfig.state === 'empty') datos = [];
    if (mockFeedConfig.state === 'huge') datos = MOCK_GASTOS_HUGE;

    const total = datos.reduce((acc, g) => acc + g.monto, 0);
    return {
      ok: true,
      cantidad: datos.length,
      total,
      totalFormateado: formatearMonto(total),
      datos: datos
    };
  }

  // El año es parte del filtro: sin él la API asume el año en curso.
  const params = new URLSearchParams({ mes: String(mes) })
  if (anio !== undefined) params.set('anio', String(anio))

  const res = await fetch(`${API_URL}/gastos?${params.toString()}`, {
    method: 'GET',
    headers: await getAuthHeaders(),
  })
  
  if (!res.ok) {
    throw new Error(await leerError(res, 'Error en la respuesta del servidor al obtener gastos'))
  }
  
  return res.json()
}

export async function fetchGastosAnuales(anio: number | string) {
  if (isMockMode) {
    if (mockFeedConfig.state === 'loading') {
      await delay(10000); // Simulate an infinite/long loading state
    } else {
      await delay(800);
    }

    if (mockFeedConfig.state === 'error') {
      throw new Error('Simulated network error fetching annual expenses.');
    }

    // Simple mock para los datos anuales: un array de 12 totales
    let mockTotales = Array.from({ length: 12 }, () => Math.floor(Math.random() * 500000) + 100000);
    
    if (mockFeedConfig.state === 'empty') {
      mockTotales = Array(12).fill(0);
    }

    return {
      ok: true,
      anio,
      totales: mockTotales
    };
  }

  const res = await fetch(`${API_URL}/gastos/anuales?anio=${anio}`, {
    method: 'GET',
    headers: await getAuthHeaders(),
  })
  
  if (!res.ok) {
    throw new Error(await leerError(res, 'Error en la respuesta del servidor al obtener gastos anuales'))
  }
  
  return res.json()
}

export async function crearGasto(inputStr: string) {
  if (isMockMode) {
    const partes = inputStr.split(',').map(p => p.trim());
    const itemName = partes[1] ? partes[1].toLowerCase() : '';
    const montoBase = parseInt(partes[0].replace(/[^0-9]/g, ''), 10) || 9999;

    if (itemName.startsWith('error api')) {
      await delay(500);
      throw new Error('Error simulado: No se pudo conectar con el servidor (503)');
    }
    
    if (itemName.startsWith('error rate')) {
      await delay(200);
      throw new Error('Too many requests. Please try again after 30 seconds.');
    }

    if (itemName.startsWith('error db')) {
      await delay(800);
      throw new Error('Error simulado: Fallo de restricción en base de datos');
    }

    if (itemName.startsWith('error token')) {
      await delay(300);
      throw new Error('Error simulado: Token de sesión expirado o inválido');
    }

    if (itemName.startsWith('long espera')) {
      await delay(5000);
    } else {
      await delay(800);
    }

    // La categoría se infiere con la misma regla que usa la API, así el mock
    // responde como responde producción.
    const item = partes[1] || inputStr;
    const nuevoGasto = mockGasto(Date.now().toString(), montoBase, item, categorizar(item));
    MOCK_GASTOS.unshift(nuevoGasto);
    
    return { 
      ok: true, 
      datos: {
        ...nuevoGasto,
        montoFormateado: nuevoGasto.monto_formateado
      } 
    };
  }

  const res = await fetch(`${API_URL}/gastos`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ input: inputStr }),
  })

  const json = await res.json().catch(() => null)

  // La API puede fallar por HTTP status o por `ok: false` en el cuerpo.
  if (!res.ok || !json?.ok) {
    throw new Error(mensajeDeError(json, 'Error al guardar el gasto'))
  }

  return json
}
