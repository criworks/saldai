import { useEffect, useState } from 'react'
import { DeviceEventEmitter, View } from 'react-native'
import {
  FormularioDeMovimiento,
  isoDelDia,
  nombreRelativoDelDia,
  useMovimientoMutation,
  type ValoresDelMovimiento,
} from '@/features/movimientos'
import { Notification } from '@/components/ui/Notification'
import { Alert } from '@/components/ui/Alert'
import { usePreferencias } from '@/features/perfil'
import { BotonDeRecurrencia } from '@/features/recurrencias'

/**
 * El texto del chip de fecha para el día que se eligió en el calendario.
 *
 * Acá la fecha se guarda **como la escribiría la persona** ("Hoy", "Ayer",
 * 05/03/2026) y no en ISO: lo que se manda es una línea que el parser lee del
 * otro lado, así que el movimiento queda con el `input_original` que la persona
 * habría tecleado.
 */
function textoDeLaFecha(elegida: Date): string {
  const relativo = nombreRelativoDelDia(elegida)
  if (relativo) return relativo

  const dd = String(elegida.getDate()).padStart(2, '0')
  const mm = String(elegida.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${elegida.getFullYear()}`
}

/**
 * Registrar un movimiento.
 *
 * El formulario es el mismo componente que usa la vista del movimiento, así
 * que crear y editar se ven igual: era la petición del diseño y además es lo
 * que evita que las dos pantallas se vayan separando de a un arreglo. Lo que
 * esta pantalla pone de su parte es qué pasa al guardar: el alta optimista, el
 * mensaje de resultado y volver a dejar el cursor en el monto para el
 * siguiente.
 */
export default function CapturaScreen() {
  const {
    valores,
    metodo,
    setMetodo,
    estado,
    mensaje,
    handleChange,
    guardarMovimiento,
    lastSaved,
    categoriaInferida,
    recurrencia,
    setRecurrencia,
  } = useMovimientoMutation()

  // Con la función apagada el botón no aparece: un plan que después no se ve en
  // ningún lado es peor que no poder crearlo.
  const { recurrenciasVisibles } = usePreferencias()

  // El día con el que abre el calendario. El texto del chip lo lleva el hook
  // (es parte de la línea que se manda), así que el `Date` vive acá: de "Ayer"
  // no se puede volver al día sin volver a resolverlo.
  const [dia, setDia] = useState(new Date())

  const [alerta, setAlerta] = useState('')

  useEffect(() => {
    if (estado !== 'error') return
    setAlerta(mensaje || 'Error desconocido')
    const limpiar = setTimeout(() => setAlerta(''), 4000)
    return () => clearTimeout(limpiar)
  }, [estado, mensaje])

  // El check que guarda está en el footer de la app, que es el que sabe en qué
  // ruta está; llega por evento para no pasar un callback por la navegación.
  useEffect(() => {
    const suscripcion = DeviceEventEmitter.addListener('submitCaptura', () => {
      // La lista no se recarga desde acá: el movimiento entra en la caché del mes
      // al guardarlo y la mutación invalida ese mes sola (ver useMovimientoMutation).
      guardarMovimiento()
    })
    return () => suscripcion.remove()
  }, [guardarMovimiento])

  const enPantalla: ValoresDelMovimiento = {
    monto: valores.monto,
    item: valores.item,
    categoria: valores.categoria,
    metodo,
    // La captura no muestra el campo de nota: acá se escribe una línea, y la
    // nota se agrega después abriendo el movimiento.
    notas: '',
  }

  const cambiar = (cambio: Partial<ValoresDelMovimiento>) => {
    if (cambio.metodo !== undefined) setMetodo(cambio.metodo)
    if (cambio.monto !== undefined) handleChange('monto', cambio.monto)
    if (cambio.item !== undefined) handleChange('item', cambio.item)
    if (cambio.categoria !== undefined) handleChange('categoria', cambio.categoria)
    // `notas` no llega: el campo no se muestra en la captura.
  }

  return (
    <View className="flex-1 bg-background">
      <Alert visible={!!alerta} message={alerta} type="error" />
      <Notification
        visible={estado === 'ok' && lastSaved !== null}
        monto={lastSaved?.monto || ''}
        descripcion={lastSaved?.descripcion || ''}
        type="success"
      />

      <FormularioDeMovimiento
        valores={enPantalla}
        onCambiar={cambiar}
        fechaTexto={valores.fecha || 'Hoy'}
        fechaDelPicker={dia}
        onElegirFecha={(elegida) => {
          setDia(elegida)
          handleChange('fecha', textoDeLaFecha(elegida))
        }}
        categoriaInferida={categoriaInferida}
        ocupado={estado === 'loading'}
        enfocarAlEntrar
        accionesDeLaFila={
          recurrenciasVisibles ? (
            // Acá todavía no hay plan: el movimiento no existe, así que la
            // frecuencia queda elegida y viaja con el alta. Quitarla es soltar
            // lo que se eligió, no cortar nada.
            <BotonDeRecurrencia
              frecuenciaElegida={recurrencia?.frecuencia ?? null}
              repeticionElegida={recurrencia?.repeticion ?? null}
              // El ancla es el día que el movimiento va a tener, y de ahí sale
              // el default de la regla: "cada mes" significa "el día 2" porque
              // el movimiento es del 2.
              ancla={isoDelDia(dia)}
              onElegir={(frecuencia, repeticion) => setRecurrencia({ frecuencia, repeticion })}
              onQuitar={() => setRecurrencia(null)}
              ocupado={estado === 'loading'}
            />
          ) : null
        }
      />
    </View>
  )
}
