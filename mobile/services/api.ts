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

// ============================================================================
// MOCK CONTROLS (DEV/QA ONLY)
// Este objeto permite mutar el estado global de los datos simulados desde
// el UI Playground para testear casos como "Lista vacía" o "Errores".
// Al igual que isMockMode, no afecta en producción.
// ============================================================================
export const mockFeedConfig = {
  state: 'normal' as 'normal' | 'empty' | 'huge' | 'error' | 'loading'
};

const MOCK_GASTOS = [
  { id: '1', monto: 15000, monto_formateado: '$15,000.00', item: 'Uber', categoria: 'Transporte', fecha: new Date().toISOString().split('T')[0], metodo: 'tc' },
  { id: '2', monto: 3500, monto_formateado: '$3,500.00', item: 'Café', categoria: 'Comida', fecha: new Date().toISOString().split('T')[0], metodo: 'ef' },
  { id: '3', monto: 120000, monto_formateado: '$120,000.00', item: 'Supermercado', categoria: 'Despensa', fecha: new Date(Date.now() - 86400000).toISOString().split('T')[0], metodo: 'tc' },
  { id: '4', monto: 45000, monto_formateado: '$45,000.00', item: 'Rappi', categoria: 'Delivery', fecha: new Date(Date.now() - 172800000).toISOString().split('T')[0], metodo: 'tc' },
];

const MOCK_GASTOS_HUGE = Array.from({ length: 150 }).map((_, i) => ({
  id: `huge-${i}`,
  monto: Math.floor(Math.random() * 50000) + 1000,
  monto_formateado: `$${(Math.floor(Math.random() * 50000) + 1000).toLocaleString('es-CL')}`,
  item: `Gasto Masivo ${i}`,
  categoria: 'Test',
  fecha: new Date(Date.now() - Math.floor(Math.random() * 10) * 86400000).toISOString().split('T')[0],
  metodo: 'tc'
}));

export async function fetchGastosPorMes(mes: number) {
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
      totalFormateado: `$${total.toLocaleString('es-CL')}`,
      datos: datos
    };
  }

  const res = await fetch(`${API_URL}/gastos?mes=${mes}`, {
    method: 'GET',
    headers: await getAuthHeaders(),
  })
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => null)
    throw new Error(errorData?.error || 'Error en la respuesta del servidor al obtener gastos')
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
    const errorData = await res.json().catch(() => null)
    throw new Error(errorData?.error || 'Error en la respuesta del servidor al obtener gastos anuales')
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

    const nuevoGasto = {
      id: Date.now().toString(),
      monto: montoBase,
      monto_formateado: `$${montoBase.toLocaleString('es-CL')}`,
      item: partes[1] || inputStr,
      categoria: 'Mock',
      fecha: new Date().toISOString().split('T')[0],
      metodo: 'tc'
    };
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

  const json = await res.json()

  // La API devuelve un status diferente de ok a nivel de objeto o HTTP status
  if (!res.ok || !json.ok) {
     throw new Error(json.errores?.[0] ?? json.error ?? 'Error al guardar el gasto')
  }

  return json
}
