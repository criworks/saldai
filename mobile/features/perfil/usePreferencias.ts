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
  zona: null,
}

/**
 * Las preferencias del perfil, para leerlas y cambiarlas.
 *
 * `categoriasVisibles` y `metodosVisibles` ya vienen resueltos: una función se
 * ve cuando el perfil **puede** y el usuario **quiere**. Esa cuenta se hace una
 * vez acá y no en cada pantalla, que es como terminarían difiriendo.
 *
 * Reemplaza a las constantes `CATEGORIAS_VISIBLES` y `METODOS_VISIBLES` de
 * `lib/funciones.ts`, que son de compilación e iguales para todos. Las cuatro
 * pantallas que las usan se cambian junto con el diseño nuevo de los toggles,
 * para no tocar dos veces los mismos archivos.
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

  const datos = consulta.data?.datos ?? PREFERENCIAS_POR_DEFECTO

  return {
    preferencias: datos,
    categoriasVisibles: datos.categorias.habilitado && datos.categorias.activo,
    metodosVisibles: datos.metodos.habilitado && datos.metodos.activo,
    /** La zona elegida, o `undefined` para que se use la del dispositivo. */
    zonaElegida: datos.zona ?? undefined,
    cargando: consulta.isPending,
    error: consulta.error,
    guardar: mutacion.mutate,
    guardando: mutacion.isPending,
    errorAlGuardar: mutacion.error,
  }
}
