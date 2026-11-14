import type { CambioDePreferencias, Preferencias } from '@saldai/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { llaves } from '@/lib/consultas'
import { fetchPreferencias, guardarPreferencias } from './api'

type Datos = Preferencias['datos']

/**
 * Lo que vale mientras las preferencias no cargaron, y si la lectura falla.
 *
 * Son los mismos defaults que tienen el schema y la API. Se repiten acá porque
 * la pantalla se dibuja antes de que la respuesta llegue y tiene que mostrar
 * algo: lo que muestre es el estado de la v1, todo apagado. Al revés —asumir
 * prendido— el usuario vería aparecer un selector que después desaparece, que
 * es peor que verlo aparecer una vez que cargó.
 */
export const PREFERENCIAS_POR_DEFECTO: Datos = {
  categorias: { habilitado: true, activo: false },
  metodos: { habilitado: true, activo: false },
  // Las recurrencias arrancan prendidas y no apagadas como las otras dos: la
  // función ya estaba en uso cuando se agregó el flag, así que mostrarla
  // apagada mientras carga le escondería las propuestas por confirmar a quien
  // ya tiene planes.
  recurrencias: { habilitado: true, activo: true },
  zona: null,
}

/**
 * Las preferencias del perfil, para leerlas y cambiarlas.
 *
 * `categoriasVisibles`, `metodosVisibles` y `recurrenciasVisibles` ya vienen
 * resueltos: una función se ve cuando el perfil **puede** y el usuario
 * **quiere**. Esa cuenta se hace una vez acá y no en cada pantalla, que es
 * como terminarían difiriendo.
 *
 * Reemplaza a las constantes `CATEGORIAS_VISIBLES` y `METODOS_VISIBLES` que
 * estaban en `lib/funciones.ts`: eran de compilación e iguales para todos, así
 * que para prender una función había que publicar una versión nueva en las
 * stores. El archivo se borró con este cambio.
 *
 * No se cachea con `staleTime` corto: una preferencia cambia cuando el usuario
 * la cambia, y en ese momento la mutación deja la respuesta en la caché.
 */
export function usePreferencias() {
  const cliente = useQueryClient()

  const consulta = useQuery({
    queryKey: llaves.preferencias(),
    queryFn: fetchPreferencias,
    staleTime: Infinity,
  })

  const mutacion = useMutation({
    mutationFn: (cambio: CambioDePreferencias) => guardarPreferencias(cambio),
    // La API devuelve el estado completo, así que se guarda tal cual en vez de
    // invalidar y volver a pedir: el toggle queda firme sin un viaje de más.
    onSuccess: (respuesta) => {
      cliente.setQueryData(llaves.preferencias(), respuesta)
    },
  })

  // Los defaults se aplican flag por flag y no reemplazando el objeto entero:
  // una API más vieja que esta versión de la app responde sin el flag que se
  // agregó después, y `datos.recurrencias.habilitado` sobre un `undefined`
  // rompe la pantalla. Pasa de verdad, porque la app se actualiza por la
  // store y la API por un deploy, y no en ese orden.
  const respuesta = consulta.data?.datos
  const datos: Datos = {
    ...PREFERENCIAS_POR_DEFECTO,
    ...respuesta,
    categorias: { ...PREFERENCIAS_POR_DEFECTO.categorias, ...respuesta?.categorias },
    metodos: { ...PREFERENCIAS_POR_DEFECTO.metodos, ...respuesta?.metodos },
    recurrencias: { ...PREFERENCIAS_POR_DEFECTO.recurrencias, ...respuesta?.recurrencias },
  }

  return {
    preferencias: datos,
    categoriasVisibles: datos.categorias.habilitado && datos.categorias.activo,
    metodosVisibles: datos.metodos.habilitado && datos.metodos.activo,
    recurrenciasVisibles: datos.recurrencias.habilitado && datos.recurrencias.activo,
    /** La zona elegida, o `undefined` para que se use la del dispositivo. */
    zonaElegida: datos.zona ?? undefined,
    cargando: consulta.isPending,
    error: consulta.error,
    guardar: mutacion.mutate,
    guardando: mutacion.isPending,
    errorAlGuardar: mutacion.error,
  }
}
