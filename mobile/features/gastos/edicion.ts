import { SIN_CATEGORIA, type CambioDeMovimiento, type Gasto, type Metodo } from '@saldai/core'

/** Lo que el editor tiene en pantalla. Todo texto, como lo escribe el usuario. */
export interface BorradorDeMovimiento {
  /** Solo dígitos, sin separadores: lo que se escribe en el campo de monto. */
  monto: string
  item: string
  /** La categoría elegida, o `''` para dejarlo sin categoría. */
  categoria: string
  metodo: Metodo
  /** AAAA-MM-DD. */
  fecha: string
  notas: string
}

/** El borrador con el que abre el editor: el movimiento tal como está. */
export function borradorDe(movimiento: Gasto): BorradorDeMovimiento {
  return {
    monto: String(movimiento.monto),
    item: movimiento.item,
    categoria: movimiento.categoria === SIN_CATEGORIA ? '' : movimiento.categoria,
    metodo: movimiento.metodo,
    fecha: movimiento.fecha,
    notas: movimiento.notas ?? '',
  }
}

/**
 * Lo que hay que mandarle a la API: **solo los campos que cambiaron**.
 *
 * Mandar el movimiento completo sería más simple de escribir y estaría mal: la
 * API marca como editados a mano los campos que recibe, así que un PATCH con
 * los seis campos marca los seis aunque el usuario haya corregido uno solo, y
 * esa marca es la que decide si un reclasificar masivo puede tocar la fila.
 *
 * Un borrador igual al movimiento devuelve `{}`, y con eso el editor sabe que
 * no hay nada que guardar: así el botón no manda un PATCH que la API va a
 * rechazar por vacío.
 */
export function cambioPendiente(
  movimiento: Gasto,
  borrador: BorradorDeMovimiento
): CambioDeMovimiento {
  const cambio: CambioDeMovimiento = {}

  const monto = parseInt(borrador.monto, 10)
  if (Number.isInteger(monto) && monto > 0 && monto !== movimiento.monto) {
    cambio.monto = monto
  }

  const item = borrador.item.trim()
  if (item && item !== movimiento.item) cambio.item = item

  // El editor usa `''` para "sin categoría" porque es lo que usa el selector de
  // la captura; la API habla del catálogo, donde eso se llama "Sin categoría".
  const categoria = borrador.categoria || SIN_CATEGORIA
  if (categoria !== movimiento.categoria) {
    cambio.categoria = categoria as CambioDeMovimiento['categoria']
  }

  if (borrador.metodo !== movimiento.metodo) cambio.metodo = borrador.metodo
  if (borrador.fecha && borrador.fecha !== movimiento.fecha) cambio.fecha = borrador.fecha

  // Vaciar el campo borra la nota, así que `''` sí es un cambio cuando antes
  // había texto. `null` y `''` son lo mismo para la API: las dos la borran.
  const notas = borrador.notas.trim()
  if (notas !== (movimiento.notas ?? '')) cambio.notas = notas

  return cambio
}

/** `true` si el borrador se puede guardar: hay algo que cambió y el monto sirve. */
export function hayAlgoQueGuardar(movimiento: Gasto, borrador: BorradorDeMovimiento): boolean {
  const monto = parseInt(borrador.monto, 10)
  if (!Number.isInteger(monto) || monto <= 0) return false
  if (!borrador.item.trim()) return false

  return Object.keys(cambioPendiente(movimiento, borrador)).length > 0
}
