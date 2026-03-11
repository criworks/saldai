const API_URL = process.env.EXPO_PUBLIC_API_URL

export async function fetchGastosPorMes(mes: number) {
  const res = await fetch(`${API_URL}/gastos?mes=${mes}`)
  if (!res.ok) {
    throw new Error('Error en la respuesta del servidor')
  }
  return res.json()
}

export async function crearGasto(inputStr: string) {
  const res = await fetch(`${API_URL}/gastos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: inputStr }),
  })

  const json = await res.json()

  // La API devuelve un status diferente de ok a nivel de objeto o HTTP status
  if (!res.ok || !json.ok) {
     throw new Error(json.errores?.[0] ?? 'Error al guardar el gasto')
  }

  return json
}
