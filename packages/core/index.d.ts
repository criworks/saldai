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

// ── Registro de un movimiento ───────────────────────────────────────────────

/** La zona y el día de referencia con los que se resolvió la fecha. */
export interface ContextoDeRegistro {
  zona: string
  /** El día que el parser usó como "hoy", en AAAA-MM-DD. */
  hoyResuelto: FechaISO
}

export interface ResultadoDeRegistro extends ResultadoParseo {
  contexto: ContextoDeRegistro
}

/** `true` si `Intl` reconoce la zona IANA. */
export declare function esZonaValida(zona: unknown): boolean

/**
 * El único punto de entrada de escritura: parsea y devuelve, además del
 * resultado, el contexto que usó. Una zona que no existe advierte y cae al
 * default en vez de rechazar.
 */
export declare function registrarMovimiento(
  input: string | null | undefined,
  opciones?: { zona?: string; hoy?: Date }
): ResultadoDeRegistro

// ── Edición a mano de un movimiento ────────────────────────────────────────

/** Los campos que el usuario puede corregir después de registrar. */
export type CampoEditable = 'monto' | 'item' | 'categoria' | 'metodo' | 'fecha' | 'notas'

export declare const CAMPOS_EDITABLES: readonly CampoEditable[]
export declare const LARGO_MAXIMO_ITEM: number
export declare const LARGO_MAXIMO_NOTAS: number

/** `true` si es una fecha real en AAAA-MM-DD: el 31/02 no pasa. */
export declare function esFechaIso(valor: unknown): boolean

/**
 * El cuerpo de `PATCH /gastos/:id`: solo los campos que cambian. `notas` en
 * `null` o en `''` borra la nota.
 */
export interface CambioDeMovimiento {
  monto?: number
  item?: string
  categoria?: CategoriaDeGasto
  metodo?: Metodo
  fecha?: FechaISO
  notas?: string | null
}

export interface ResultadoDeCambio {
  ok: boolean
  errores: string[]
  /** Los campos a guardar, con los nombres del dominio. Vacío si `ok` es false. */
  campos: Record<string, unknown>
  /** Los campos que este cambio toca, para `campos_editados`. */
  editados: CampoEditable[]
}

/**
 * Valida una edición a mano y la deja lista para guardar. Acá **no corre el
 * parser**: el usuario corrige campos sueltos, no escribe una línea.
 */
export declare function validarCambioDeMovimiento(cambio: unknown): ResultadoDeCambio

/** La unión de lo ya marcado con lo que cambia ahora, sin duplicados. */
export declare function unirCamposEditados(
  previos: readonly string[] | null | undefined,
  nuevos: readonly string[]
): CampoEditable[]

/** `true` si ese campo del movimiento lo corrigió el usuario a mano. */
export declare function fueEditadoAMano(movimiento: unknown, campo: CampoEditable): boolean

// ── Zonas horarias ──────────────────────────────────────────────────────────

/** Una zona del catálogo, lista para mostrar. */
export interface ZonaDelCatalogo {
  /** El nombre IANA, que es lo que se guarda. */
  zona: string
  /** El nombre para mostrar: "Buenos Aires, Argentina". */
  nombre: string
  /** Minutos adelantados respecto de UTC. */
  minutos: number
  /** "(UTC-03:00)". */
  desplazamiento: string
}

/** Los nombres IANA que se le ofrecen al usuario. */
export declare const ZONAS: readonly string[]

/** Minutos adelantados respecto de UTC, o `null` si el motor no conoce la zona. */
export declare function desplazamientoDeZona(zona: string, instante?: Date): number | null

/** -180 → "(UTC-03:00)". */
export declare function etiquetaDeDesplazamiento(minutos: number): string

/** "America/Argentina/Buenos_Aires" → "Buenos Aires, Argentina". */
export declare function nombreDeZona(zona: string): string

/** El catálogo ordenado de oeste a este, sin las zonas que el motor no conoce. */
export declare function catalogoDeZonas(instante?: Date): ZonaDelCatalogo[]

/** Filtra el catálogo por nombre, nombre IANA o desplazamiento. */
export declare function buscarZonas(texto: string, catalogo: ZonaDelCatalogo[]): ZonaDelCatalogo[]

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
  /** Detalle libre del usuario. `null` mientras no escribió ninguno. */
  notas?: string | null
  /** Cuándo se editó a mano por última vez. `null` = nunca se editó. */
  editado_en?: string | null
  /**
   * Los campos que el usuario corrigió a mano. Un reclasificar masivo tiene
   * que saltearse los que estén acá, o le pisa la corrección.
   */
  campos_editados?: CampoEditable[]
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

/** `PATCH /gastos/:id` y `DELETE /gastos/:id` */
export interface MovimientoCambiado {
  ok: true
  errores: []
  /** La fila como quedó, o —en el borrado— como estaba antes de borrarse. */
  datos: Gasto
}

/** `GET /gastos/anuales` */
export interface TotalesAnuales {
  ok: true
  anio: number | string
  /** Doce posiciones, de enero a diciembre. */
  totales: number[]
}

/**
 * Un flag del perfil.
 *
 * Son dos campos y no uno: `habilitado` es si el perfil *puede* usar la función
 * (lo decide el plan) y `activo` si *quiere* usarla (lo decide el usuario). Con
 * uno solo, al llegar un plan pago no se distingue "apagado porque lo apagó" de
 * "apagado porque no pagó". La UI muestra la función cuando los dos son true.
 */
export interface FlagDePerfil {
  habilitado: boolean
  activo: boolean
}

/** `GET /perfil/preferencias` y `PATCH /perfil/preferencias` */
export interface Preferencias {
  ok: true
  errores: []
  datos: {
    categorias: FlagDePerfil
    metodos: FlagDePerfil
    /** Zona IANA elegida. En `null`, se usa la del dispositivo. */
    zona: string | null
  }
}

/**
 * El cuerpo de `PATCH /perfil/preferencias`. Todos los campos son opcionales:
 * se manda solo lo que cambia. `habilitado` no se puede cambiar desde acá.
 */
export interface CambioDePreferencias {
  categoriasActivo?: boolean
  metodosActivo?: boolean
  zona?: string | null
}

export type ApiResponse<T> = T | ApiError
