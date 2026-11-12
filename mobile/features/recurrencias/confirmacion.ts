import { SIN_CATEGORIA, type CambioDeMovimiento, type Metodo, type PropuestaPendiente } from '@saldai/core'

/** Lo que el confirmador tiene en pantalla. Todo texto, como lo escribe el usuario. */
export interface BorradorDePropuesta {
  /** Solo dígitos, sin separadores. */
  monto: string
  item: string
  /** La categoría elegida, o `''` para dejarlo sin categoría. */
  categoria: string
  metodo: Metodo
  /** AAAA-MM-DD. */
  fecha: string
  notas: string
}

/** El borrador con el que abre: la propuesta tal como el plan la propone. */
export function borradorDePropuesta(propuesta: PropuestaPendiente): BorradorDePropuesta {
  const { movimiento } = propuesta
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
 * Lo que hay que mandarle a la API al confirmar: **solo lo que difiere de lo
 * que el plan proponía**.
 *
 * Es la misma regla que al editar un movimiento y por la misma razón: los
 * campos que difieren quedan marcados en `campos_editados`, y esa marca es la
 * que después evita que un reclasificar masivo pise la corrección. Mandar los
 * seis campos siempre marcaría los seis aunque el usuario no haya tocado nada.
 *
 * Confirmar sin cambios devuelve `{}`, y eso es válido: no es un cuerpo vacío
 * que se rechaza, es "confirmo lo que proponés".
 */
export function cambioDeLaPropuesta(
  propuesta: PropuestaPendiente,
  borrador: BorradorDePropuesta
): CambioDeMovimiento {
  const propuesto = propuesta.movimiento
  const cambio: CambioDeMovimiento = {}

  const monto = parseInt(borrador.monto, 10)
  if (Number.isInteger(monto) && monto > 0 && monto !== propuesto.monto) {
    cambio.monto = monto
  }

  const item = borrador.item.trim()
  if (item && item !== propuesto.item) cambio.item = item

  const categoria = borrador.categoria || SIN_CATEGORIA
  if (categoria !== propuesto.categoria) {
    cambio.categoria = categoria as CambioDeMovimiento['categoria']
  }

  if (borrador.metodo !== propuesto.metodo) cambio.metodo = borrador.metodo
  if (borrador.fecha && borrador.fecha !== propuesto.fecha) cambio.fecha = borrador.fecha

  const notas = borrador.notas.trim()
  if (notas !== (propuesto.notas ?? '')) cambio.notas = notas

  return cambio
}

/** `true` si lo que hay en pantalla se puede confirmar. */
export function sePuedeConfirmar(borrador: BorradorDePropuesta): boolean {
  const monto = parseInt(borrador.monto, 10)
  if (!Number.isInteger(monto) || monto <= 0) return false
  return !!borrador.item.trim() && !!borrador.fecha
}
