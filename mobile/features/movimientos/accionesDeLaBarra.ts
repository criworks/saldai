import { useFocusEffect } from 'expo-router'
import { useCallback, useRef } from 'react'
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
 * Suscribe el check y el tacho de la barra de abajo, **solo mientras la
 * pantalla está en foco**.
 *
 * El foco no es un detalle: `movimiento` y `recurrencia` son rutas de las tabs
 * y **quedan montadas** al volver atrás, y el evento lo recibe todo el que esté
 * suscrito. Sin esta condición, un tap en el tacho de la vista del movimiento
 * disparaba también el de la vista del plan abierta un rato antes, que abría su
 * propio "Eliminar la recurrencia" encima: confirmando ahí se terminaba un plan
 * que la persona no estaba mirando, y el plan dejaba de proponer y desaparecía
 * de la lista sin que nada lo explicara.
 *
 * Los handlers se leen de un ref y no se capturan en la suscripción: se rearman
 * en cada render de la pantalla, y el tap tiene que llegar al borrador que está
 * en pantalla y no al del primer render. Con el ref eso no cuesta volver a
 * suscribirse.
 */
export function useAccionesDeLaBarra(guardar: () => void, descartar: () => void) {
  const ultimos = useRef({ guardar, descartar })
  ultimos.current = { guardar, descartar }

  useFocusEffect(
    useCallback(() => {
      const check = DeviceEventEmitter.addListener(ACCION_GUARDAR, () =>
        ultimos.current.guardar()
      )
      const tacho = DeviceEventEmitter.addListener(ACCION_DESCARTAR, () =>
        ultimos.current.descartar()
      )
      return () => {
        check.remove()
        tacho.remove()
      }
    }, [])
  )
}
