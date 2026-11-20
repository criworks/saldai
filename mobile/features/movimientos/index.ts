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
export { borradorDe, cambioPendiente, hayAlgoQueGuardar, montoEItemValidos } from './edicion'
export type { BorradorDeMovimiento, SujetoDelBorrador } from './edicion'
export { useMovimiento } from './useMovimiento'
export {
  diaDesdeIso,
  esIsoDeDia,
  finDelMes,
  isoDelDia,
  nombreRelativoDelDia,
  tituloDelDia,
} from './fechas'
export { agruparPorDia } from './agrupacion'
export {
  ACCION_DESCARTAR,
  ACCION_GUARDAR,
  useAccionesDeLaBarra,
} from './accionesDeLaBarra'
export type { ConFecha, SeccionDeDia } from './agrupacion'
export { editarMovimiento, eliminarMovimiento } from './api'
export { CampoDeCategoria } from './componentes/CampoDeCategoria'
export { CategorySelector } from './componentes/CategorySelector'
export { FormularioDeMovimiento } from './componentes/FormularioDeMovimiento'
export type { ValoresDelMovimiento } from './componentes/FormularioDeMovimiento'
export { EncabezadoDelMes } from './componentes/EncabezadoDelMes'
export { ExpenseItem } from './componentes/ExpenseItem'
export { GradientFooter } from './componentes/GradientFooter'
export { PaymentMethodSelector } from './componentes/PaymentMethodSelector'
