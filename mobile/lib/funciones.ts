/**
 * Qué partes del producto se muestran en esta versión de la app.
 *
 * Son constantes y no variables de entorno a propósito: lo que entra en una
 * versión es una decisión de producto que queda en el código y en su historia,
 * no algo que cambia según el build o el `.env` de cada uno.
 */

/**
 * Las categorías quedan para una versión posterior: la v1 sale sin ellas
 * (decisión de crim, 2026-10-31). Con `false` no se ve el selector de la
 * captura, la fila de filtros por categoría de la lista ni la entrada
 * "Categorías" de configuraciones.
 *
 * La API sigue infiriendo y guardando la categoría de cada gasto, así que al
 * prenderlo los gastos de la v1 ya aparecen categorizados.
 */
export const CATEGORIAS_VISIBLES = false

/**
 * El selector de método de pago (EF/TC) de la captura también queda fuera de
 * la v1 (crim, 2026-10-31). Con `false` cada gasto se guarda con el método por
 * defecto de `@saldai/core` (TC), que es lo que pasaba mientras el selector
 * estuvo escondido.
 */
export const METODOS_VISIBLES = false
