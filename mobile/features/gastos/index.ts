/**
 * La superficie pública de la feature de gastos.
 *
 * Las pantallas importan desde acá y no de los archivos de adentro: así el
 * reacomodo interno de la feature no toca las rutas, y se ve de un vistazo qué
 * expone.
 */
export { GastosProvider, useGastos } from './GastosContext'
export type { CategoriaInfo, DatosResponse, Gasto } from './GastosContext'
export { FilterProvider, useFilter } from './FilterContext'
export { useGastoMutation } from './useGastoMutation'
export { consultaDelMes } from './consultaDelMes'
export { crearGasto, fetchGastosAnuales, fetchGastosPorMes } from './api'
export { CategorySelector } from './componentes/CategorySelector'
export { ExpenseItem } from './componentes/ExpenseItem'
export { GradientFooter } from './componentes/GradientFooter'
export { PaymentMethodSelector } from './componentes/PaymentMethodSelector'
