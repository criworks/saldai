import { SIN_CATEGORIA, type CambioDeMovimiento, type Movimiento, type Metodo } from '@saldai/core'

/**
 * Contra qué se compara el borrador.
 *
 * Son los seis campos que el formulario edita, y los tiene igual un movimiento
 * guardado que el que una propuesta de recurrencia propone. Está escrito como
 * los campos y no como `Movimiento` porque confirmar una propuesta es lo mismo
 * que corregir un movimiento —solo lo que difiere viaja, y eso es lo que queda
 * marcado en `campos_editados`—, y tenerlo dos veces era tener dos reglas que
 * se iban a separar de a un arreglo.
 */
export type SujetoDelBorrador = Pick<
  Movimiento,
  'monto' | 'item' | 'categoria' | 'metodo' | 'fecha' | 'notas'
>

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

/**
 * El borrador con el que abre el editor: el sujeto tal como está.
 *
 * Desde una propuesta se le pasa `propuesta.movimiento`, que es el movimiento
 * que crearía confirmarla sin tocar nada.
 */
export function borradorDe(movimiento: SujetoDelBorrador): BorradorDeMovimiento {
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
 * rechazar por vacío. Al confirmar una propuesta `{}` sí es válido, y significa
 * "confirmo lo que proponés".
 */
export function cambioPendiente(
  movimiento: SujetoDelBorrador,
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

/**
 * `true` si el borrador tiene lo mínimo: un monto que es un entero positivo y
 * un item con algo escrito.
 *
 * Es lo mínimo de un movimiento y también de un plan de recurrencia, y está acá
 * una sola vez porque la pantalla del plan lo tenía escrito de nuevo: con dos
 * copias, subir el tope del monto en una dejaba la otra aceptando lo que la API
 * iba a rechazar.
 */
export function montoEItemValidos(borrador: BorradorDeMovimiento): boolean {
  const monto = parseInt(borrador.monto, 10)
  return Number.isInteger(monto) && monto > 0 && !!borrador.item.trim()
}

/** `true` si el borrador se puede guardar: hay algo que cambió y el monto sirve. */
export function hayAlgoQueGuardar(
  movimiento: SujetoDelBorrador,
  borrador: BorradorDeMovimiento
): boolean {
  if (!montoEItemValidos(borrador)) return false

  return Object.keys(cambioPendiente(movimiento, borrador)).length > 0
}
