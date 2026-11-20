import { tituloDelDia } from './fechas'

/** Un grupo del listado, con la forma que espera `SectionList`. */
export interface SeccionDeDia<T> {
  titulo: string
  data: T[]
}

/** Una cosa que ocurre en una fecha, con su lugar dentro del día. */
export interface ConFecha<T> {
  /** `AAAA-MM-DD`. */
  fecha: string
  /** Dentro de un mismo día, el más chico va primero. Sin valor, 0. */
  orden?: number
  item: T
}

/**
 * Lo que ocurre en una fecha, agrupado por día y del día más nuevo al más
 * viejo.
 *
 * Es genérico porque bajo el encabezado de un día caen dos cosas distintas —un
 * movimiento registrado y una propuesta sin decidir— y la pantalla no debería
 * tener dos agrupados que ordenan parecido.
 *
 * Ordena comparando los textos ISO y no `Date`: son todos `AAAA-MM-DD`, así que
 * el orden alfabético **es** el cronológico, y así una fecha ilegible no obliga
 * a inventarle un `Date` para poder ordenarla.
 */
export function agruparPorDia<T>(items: ConFecha<T>[]): SeccionDeDia<T>[] {
  const ordenados = [...items].sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1
    return (a.orden ?? 0) - (b.orden ?? 0)
  })

  // Un Map y no un objeto: el Map mantiene el orden de inserción, que acá es el
  // orden en que se van a ver los grupos. La llave es la fecha y no el título,
  // porque dos meses distintos pueden escribir el mismo "Jue 26".
  const porDia = new Map<string, T[]>()
  for (const { fecha, item } of ordenados) {
    if (!porDia.has(fecha)) porDia.set(fecha, [])
    porDia.get(fecha)!.push(item)
  }

  return Array.from(porDia, ([fecha, data]) => ({ titulo: tituloDelDia(fecha), data }))
}
