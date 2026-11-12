import { formatearMonto, type CategoriaDeMovimiento, type Movimiento, type Metodo } from '@saldai/core'
import { EFECTIVO, METODO_DEFAULT, TARJETA } from '@saldai/core'

/**
 * Movimientos de mentira con la forma exacta de los de verdad: categoría del
 * catálogo, método en mayúsculas y monto en formato chileno. Antes los mocks
 * inventaban categorías ("Comida", "Despensa", "Test") que ningún selector ni
 * color conocía, y el monto venía en formato gringo ($15,000.00), así que el
 * modo mock mostraba una app que no existe.
 */
export function movimientoDeMentira(
  id: string,
  monto: number,
  item: string,
  categoria: CategoriaDeMovimiento,
  diasAtras = 0,
  metodo: Metodo = METODO_DEFAULT
): Movimiento {
  return {
    id,
    monto,
    monto_formateado: formatearMonto(monto),
    item,
    categoria,
    fecha: fechaDeHaceDias(diasAtras),
    metodo,
  }
}

/** AAAA-MM-DD, el formato que devuelve la API. */
function fechaDeHaceDias(dias: number): string {
  return new Date(Date.now() - dias * 86400000).toISOString().split('T')[0]
}

/** El feed normal: pocos movimientos, variados, de los últimos días. */
export const MOVIMIENTOS: Movimiento[] = [
  movimientoDeMentira('1', 15000, 'Uber', 'Transporte', 0, TARJETA),
  movimientoDeMentira('2', 3500, 'Café', 'Ocio', 0, EFECTIVO),
  movimientoDeMentira('3', 120000, 'Supermercado', 'Mercado', 1, TARJETA),
  movimientoDeMentira('4', 45000, 'Rappi', 'Delivery', 2, TARJETA),
]

/** Para ver cómo se comporta la lista con muchos elementos. */
export const MOVIMIENTOS_MUCHOS: Movimiento[] = Array.from({ length: 150 }, (_, i) =>
  movimientoDeMentira(
    `muchos-${i}`,
    Math.floor(Math.random() * 50000) + 1000,
    `Movimiento Masivo ${i}`,
    'Ocio',
    Math.floor(Math.random() * 10)
  )
)
