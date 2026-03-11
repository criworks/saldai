import { supabase } from './supabase'

const API_URL = process.env.EXPO_PUBLIC_API_URL

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

export async function fetchGastosPorMes(mes: number) {
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

export async function crearGasto(inputStr: string) {
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
