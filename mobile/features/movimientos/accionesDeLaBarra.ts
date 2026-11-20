import { useEffect } from 'react'
import { DeviceEventEmitter } from 'react-native'

/**
 * Los dos botones de la barra de abajo, como eventos.
 *
 * La barra la dibuja el footer de la app, que sabe en qué ruta está, y no la
 * pantalla: así los botones quedan siempre en el mismo lugar y con el mismo
 * aspecto, pero el tap tiene que llegar a la pantalla de alguna forma. Esa
 * forma son estos dos eventos, y los nombres están acá porque estaban escritos
 * como texto en el footer y en cada pantalla: un typo en uno de esos lugares es
 * un botón que no hace nada, y no lo atrapa ni el typecheck ni un render.
 */
export const ACCION_GUARDAR = 'guardarMovimiento'
export const ACCION_DESCARTAR = 'descartarMovimiento'

/**
 * Suscribe el check y el tacho de la barra de abajo.
 *
 * **Sin arreglo de dependencias a propósito**: las dos funciones se rearman en
 * cada render de la pantalla y acá se vuelve a suscribir con ellas, así el tap
 * llega al borrador que está en pantalla y no al del primer render. Con un
 * `[]`, guardar mandaría lo que había cuando la pantalla se montó.
 */
export function useAccionesDeLaBarra(guardar: () => void, descartar: () => void) {
  useEffect(() => {
    const check = DeviceEventEmitter.addListener(ACCION_GUARDAR, guardar)
    const tacho = DeviceEventEmitter.addListener(ACCION_DESCARTAR, descartar)
    return () => {
      check.remove()
      tacho.remove()
    }
  })
}
