/**
 * Tipos de @saldai/core.
 *
 * El paquete está escrito en JavaScript porque la API lo consume con
 * `require`, así que los tipos van acá. `Gasto` y `ApiResponse` describen el
 * contrato de la API: mobile los declaraba por su cuenta y así se colaron
 * errores como leer `error` cuando la API responde `errores[]`.
 */

// ── Categorías ──────────────────────────────────────────────────────────────

/** Las siete categorías del catálogo. */
export type Categoria =
  | 'Básicos'
  | 'Suscripciones'
  | 'Mercado'
  | 'Inversión'
  | 'Ocio'
  | 'Delivery'
  | 'Transporte'

/** Lo que puede tener un gasto en el campo categoría. */
export type CategoriaDeGasto = Categoria | 'Sin categoría'

export declare const CATEGORIAS: Record<Categoria, string[]>
export declare const NOMBRES_CATEGORIAS: readonly Categoria[]
export declare const TODAS_LAS_CATEGORIAS: readonly CategoriaDeGasto[]
export declare const SIN_CATEGORIA: 'Sin categoría'
export declare function categorizar(descripcion: string): CategoriaDeGasto
export declare function esCategoriaValida(categoria: unknown): boolean

// ── Métodos de pago ─────────────────────────────────────────────────────────

/** EF es efectivo y TC tarjeta de crédito. */
export type Metodo = 'EF' | 'TC'

export declare const EFECTIVO: 'EF'
export declare const TARJETA: 'TC'
export declare const METODO_DEFAULT: Metodo
export declare const METODOS_VALIDOS: readonly Metodo[]
export declare const ALIAS_METODOS: Record<string, Metodo>
export declare const NOMBRES_METODOS: Record<Metodo, string>
export declare function normalizarMetodo(raw: string | null | undefined): {
  metodo: Metodo
  advertencia?: string
}
export declare function esMetodoValido(metodo: unknown): boolean

// ── Montos ──────────────────────────────────────────────────────────────────

export declare const LOCALE: 'es-CL'
/** 12500 → "12.500" */
export declare function formatearNumero(monto: unknown): string
/** 12500 → "$12.500" */
export declare function formatearMonto(monto: unknown): string

// ── Fechas ──────────────────────────────────────────────────────────────────

/** Una fecha en AAAA-MM-DD, que es como la guarda y la devuelve la API. */
export type FechaISO = string

export declare const MESES: readonly string[]
export declare function nombreDeMes(mes: number): string
export declare function abreviaturaDeMes(mes: number): string
export declare function esMesValido(mes: unknown): boolean
export declare function isoAChileno(iso: string | null | undefined): string
export declare function chilenoAIso(fecha: string | null | undefined): FechaISO | null
export declare function mesDeIso(iso: string | null | undefined): number | null
export declare function anioDeIso(iso: string | null | undefined): number | null
/** Rango semiabierto [desde, hasta). */
export declare function rangoDelMes(anio: number, mes: number): { desde: FechaISO; hasta: FechaISO }
export declare function rangoDelAnio(anio: number): { desde: FechaISO; hasta: FechaISO }

// ── Fechas escritas por una persona ─────────────────────────────────────────

export declare const ZONA_DEFECTO: 'America/Santiago'
/** El día de hoy en `zona`, como fecha civil anclada a medianoche UTC. */
export declare function hoyCivil(zona?: string): Date
export declare function parsearFecha(
  input: string | null | undefined,
  hoy?: Date
): {
  fecha?: Date
  fechaISO?: FechaISO
  fechaStr?: string
  raw: string
  advertencia?: string
  error?: string
}

// ── Parser ──────────────────────────────────────────────────────────────────

/** De dónde salió la categoría: del campo, inferida del item, o de ninguno. */
export type FuenteCategoria = 'campo' | 'item' | 'ninguna'

/** Lo que el parser saca de un texto, antes de guardarlo. */
export interface GastoParseado {
  monto: number
  montoFormateado: string
  item: string
  categoria: CategoriaDeGasto
  categoriaSrc: FuenteCategoria
  metodo: Metodo
  /** AAAA-MM-DD, el formato de la columna. */
  fecha: FechaISO
  /** DD/MM/AAAA, para mostrar. */
  fechaFormateada: string
}

export interface ResultadoParseo {
  ok: boolean
  errores: string[]
  advertencias: string[]
  datos: GastoParseado | null
}

export declare function parsearGasto(
  input: string | null | undefined,
  opciones?: { zona?: string; hoy?: Date }
): ResultadoParseo

// ── Contrato de la API ──────────────────────────────────────────────────────

/** Un gasto como lo devuelve la API. */
export interface Gasto {
  id: string | number
  monto: number
  monto_formateado: string
  item: string
  categoria: CategoriaDeGasto
  /** AAAA-MM-DD: la columna es `date`. */
  fecha: FechaISO
  metodo: Metodo
}

/**
 * Toda respuesta de la API trae `ok`. Cuando falla trae `errores`, en plural y
 * en arreglo, porque el parser puede devolver varios juntos; `error` en
 * singular solo aparece en los 401 del middleware de auth.
 */
export interface ApiError {
  ok: false
  errores?: string[]
  error?: string
  datos?: null
}

/** `GET /gastos` */
export interface GastosDelMes {
  ok: true
  cantidad: number
  total: number
  totalFormateado: string
  datos: Gasto[]
}

/** `POST /gastos` */
export interface GastoCreado {
  ok: true
  datos: GastoParseado & { id: string | number }
}

/** `GET /gastos/anuales` */
export interface TotalesAnuales {
  ok: true
  anio: number | string
  /** Doce posiciones, de enero a diciembre. */
  totales: number[]
}

export type ApiResponse<T> = T | ApiError
