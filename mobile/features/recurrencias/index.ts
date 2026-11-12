/**
 * La superficie pública de la feature de recurrencias.
 *
 * Las pantallas importan desde acá y no de los archivos de adentro, igual que
 * en movimientos: así reacomodar la feature por dentro no toca las rutas.
 */
export { usePropuestas } from './usePropuestas'
export { useRecurrencias } from './useRecurrencias'
export {
  borradorDePropuesta,
  cambioDeLaPropuesta,
  sePuedeConfirmar,
} from './confirmacion'
export type { BorradorDePropuesta } from './confirmacion'
export { NOMBRES_FRECUENCIAS, descripcionDeFrecuencia } from './frecuencias'
export { ConfirmarPropuesta } from './componentes/ConfirmarPropuesta'
export { EditorDeRecurrencia } from './componentes/EditorDeRecurrencia'
export { ListaDePropuestas } from './componentes/ListaDePropuestas'
export {
  confirmarPropuesta,
  crearRecurrencia,
  editarRecurrencia,
  fetchPropuestas,
  fetchRecurrencias,
  omitirPropuesta,
} from './api'
