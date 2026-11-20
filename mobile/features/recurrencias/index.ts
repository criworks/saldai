/**
 * La superficie pública de la feature de recurrencias.
 *
 * Las pantallas importan desde acá y no de los archivos de adentro, igual que
 * en movimientos: así reacomodar la feature por dentro no toca las rutas.
 *
 * El borrador de una propuesta no está acá: confirmar es corregir un
 * movimiento, así que se arma con `borradorDe` y `cambioPendiente` de
 * movimientos, pasándoles `propuesta.movimiento`. Y la ventana que se le pide a
 * la API la decide `usePropuestas` y nadie más, así que no se exporta.
 */
export { usePropuestas } from './usePropuestas'
export { useRecurrenciaDeMovimiento } from './useRecurrenciaDeMovimiento'
export { useRecurrencias } from './useRecurrencias'
export { NOMBRES_FRECUENCIAS, descripcionDeFrecuencia } from './frecuencias'
export { BotonDeRecurrencia } from './componentes/BotonDeRecurrencia'
export { FilaDePropuesta } from './componentes/FilaDePropuesta'
export { llaveDePropuesta } from './propuestas'
export {
  confirmarPropuesta,
  crearRecurrencia,
  editarRecurrencia,
  fetchPropuestas,
  fetchRecurrencia,
  fetchRecurrencias,
  omitirPropuesta,
  terminarRecurrencia,
} from './api'
