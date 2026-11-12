/**
 * La superficie pública de la feature de movimientos.
 *
 * Las pantallas importan desde acá y no de los archivos de adentro: así el
 * reacomodo interno de la feature no toca las rutas, y se ve de un vistazo qué
 * expone.
 */
export { MovimientosProvider, useMovimientos } from './MovimientosContext'
export type { CategoriaInfo, DatosResponse, Movimiento } from './MovimientosContext'
export { FilterProvider, useFilter } from './FilterContext'
export { useMovimientoMutation } from './useMovimientoMutation'
export { consultaDelMes } from './consultaDelMes'
export { crearMovimiento, fetchMovimientosAnuales, fetchMovimientosPorMes } from './api'
export { borradorDe, cambioPendiente, hayAlgoQueGuardar } from './edicion'
export type { BorradorDeMovimiento } from './edicion'
export { useMovimiento } from './useMovimiento'
export { editarMovimiento, eliminarMovimiento } from './api'
export { CampoDeCategoria } from './componentes/CampoDeCategoria'
export { EditorDeMovimiento } from './componentes/EditorDeMovimiento'
export { CategorySelector } from './componentes/CategorySelector'
export { EncabezadoDelMes } from './componentes/EncabezadoDelMes'
export { ExpenseItem } from './componentes/ExpenseItem'
export { GradientFooter } from './componentes/GradientFooter'
export { PaymentMethodSelector } from './componentes/PaymentMethodSelector'
