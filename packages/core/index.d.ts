/**
 * Tipos de @saldai/core.
 *
 * El paquete está escrito en JavaScript porque la API lo consume con
 * `require`, así que los tipos van acá. `Movimiento` y `ApiResponse` describen el
 * contrato de la API: mobile los declaraba por su cuenta y así se colaron
 * errores como leer `error` cuando la API responde `errores[]`.
 */

// ── Categorías ─────────────────────────────────────────────────────────────

/** Las siete categorías del catálogo. */
export type Categoria =
  | 'Básicos'
  | 'Suscripciones'
  | 'Mercado'
  | 'Inversión'
  | 'Ocio'
  | 'Delivery'
  | 'Transporte'

/** Lo que puede tener un movimiento en el campo categoría. */
export type CategoriaDeMovimiento = Categoria | 'Sin categoría'

export declare const CATEGORIAS: Record<Categoria, string[]>
export declare const NOMBRES_CATEGORIAS: readonly Categoria[]
export declare const TODAS_LAS_CATEGORIAS: readonly CategoriaDeMovimiento[]
export declare const SIN_CATEGORIA: 'Sin categoría'
export declare function categorizar(descripcion: string): CategoriaDeMovimiento
export declare function esCategoriaValida(categoria: unknown): boolean

// ── Métodos de pago ────────────────────────────────────────────────────────

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

// ── Montos ─────────────────────────────────────────────────────────────────

export declare const LOCALE: 'es-CL'
/** 12500 → "12.500" */
export declare function formatearNumero(monto: unknown): string
/** 12500 → "$12.500" */
export declare function formatearMonto(monto: unknown): string

// ── Fechas ─────────────────────────────────────────────────────────────────

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

// ── Fechas escritas por una persona ────────────────────────────────────────

export declare const ZONA_DEFECTO: 'America/Santiago'
/** El día de hoy en `zona`, como fecha civil anclada a medianoche UTC. */
export declare function hoyCivil(zona?: string): Date
/** Una fecha civil (anclada a medianoche UTC) a AAAA-MM-DD. */
export declare function aIsoCivil(fecha: Date): FechaISO
/** AAAA-MM-DD a fecha civil, o `null` si esa fecha no existe. */
export declare function desdeIsoCivil(iso: string | null | undefined): Date | null
/** Fecha civil anclada a medianoche UTC. `mes` va de 1 a 12. */
export declare function civil(anio: number, mes: number, dia: number): Date
export declare function sumarDias(fecha: Date, dias: number): Date
export declare function diasEnMes(anio: number, mes: number): number
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

// ── Parser ─────────────────────────────────────────────────────────────────

/** De dónde salió la categoría: del campo, inferida del item, o de ninguno. */
export type FuenteCategoria = 'campo' | 'item' | 'ninguna'

/** Lo que el parser saca de un texto, antes de guardarlo. */
export interface MovimientoParseado {
  monto: number
  montoFormateado: string
  item: string
  categoria: CategoriaDeMovimiento
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
  datos: MovimientoParseado | null
}

export declare function parsearMovimiento(
  input: string | null | undefined,
  opciones?: { zona?: string; hoy?: Date }
): ResultadoParseo

// ── Registro de un movimiento ──────────────────────────────────────────────

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
 * El cuerpo de `PATCH /movimientos/:id`: solo los campos que cambian. `notas` en
 * `null` o en `''` borra la nota.
 */
export interface CambioDeMovimiento {
  monto?: number
  item?: string
  categoria?: CategoriaDeMovimiento
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

// ── Recurrencia con confirmación ───────────────────────────────────────────

/** Cada cuánto propone un plan. */
export type Frecuencia = 'semanal' | 'mensual' | 'anual'

export declare const FRECUENCIAS: readonly Frecuencia[]
export declare const CAMPOS_DEL_PLAN: readonly string[]
/** Tope de fechas que se derivan de un plan en una sola pasada. */
export declare const MAXIMO_DE_OCURRENCIAS: number

/**
 * Un plan de recurrencia como lo guarda y lo devuelve la API.
 *
 * Viaja con la forma de la fila porque es la misma que consumen el core y la
 * app: un solo nombre por campo es un lugar menos donde equivocarse.
 */
export interface Recurrencia {
  id: string
  monto: number
  monto_formateado: string | null
  item: string
  categoria: CategoriaDeMovimiento | null
  categoria_src: FuenteCategoria | null
  metodo: Metodo | null
  notas: string | null
  frecuencia: Frecuencia
  /** La primera ocurrencia y el ancla de las siguientes. */
  vigente_desde: FechaISO
  /** Último día en que propone, inclusive. `null` = sin fin. */
  vigente_hasta: FechaISO | null
  input_original: string | null
  zona: string | null
  hoy_resuelto: FechaISO | null
  /** El plan que este reemplazó, si salió de un "editar de aquí en adelante". */
  plan_anterior_id?: string | null
  creado_en?: string
  actualizado_en?: string
}

/** El movimiento que crearía confirmar una propuesta sin tocar nada. */
export interface MovimientoPropuesto {
  monto: number
  montoFormateado: string | null
  item: string
  categoria: CategoriaDeMovimiento
  categoriaSrc: FuenteCategoria
  metodo: Metodo
  fecha: FechaISO
  notas: string | null
}

/** Una propuesta pendiente: un plan y una fecha que el usuario no decidió. */
export interface PropuestaPendiente {
  recurrenciaId: string
  /** La fecha que el plan proponía. */
  fecha: FechaISO
  movimiento: MovimientoPropuesto
  recurrencia: Recurrencia
}

/** Las fechas que el plan propone hasta `hasta` inclusive. */
export declare function ocurrenciasDelPlan(
  plan: Recurrencia,
  opciones: { hasta: FechaISO }
): FechaISO[]

/** La ocurrencia número `n` del plan, contando la primera como 0. */
export declare function ocurrenciaNumero(plan: Recurrencia, n: number): Date | null

/** `true` si esa fecha es una de las que el plan propone. */
export declare function esOcurrenciaDelPlan(plan: Recurrencia, fecha: unknown): boolean

/** Las propuestas sin decidir, de la más vieja a la más nueva. */
export declare function propuestasPendientes(
  planes: readonly Recurrencia[],
  decisiones: readonly { recurrenciaId: string; fecha: FechaISO }[],
  opciones: { hasta: FechaISO }
): { recurrenciaId: string; fecha: FechaISO; plan: Recurrencia }[]

/**
 * El movimiento que crearía confirmar, y qué campos difieren del plan. Lo
 * segundo es lo que se guarda en `campos_editados`: un campo igual al del plan
 * no es una corrección.
 */
export declare function movimientoDeLaPropuesta(
  plan: Recurrencia,
  fechaPrevista: FechaISO,
  campos?: Record<string, unknown>
): { movimiento: MovimientoPropuesto; camposEditados: CampoEditable[] }

export declare function validarFrecuencia(frecuencia: unknown): boolean

/** `true` si el plan sigue proponiendo fechas al día `hoy`. */
export declare function planVigente(plan: Recurrencia, hoy: FechaISO): boolean

/** El cuerpo de `POST /recurrencias`. */
export interface NuevaRecurrencia {
  /** La línea, igual que la de un movimiento. Su fecha es el ancla. */
  input: string
  frecuencia: Frecuencia
  /** Ancla explícita, si el plan no empieza el día que dice la línea. */
  desde?: FechaISO
  /** Último día en que propone. Sin esto, el plan no termina. */
  hasta?: FechaISO | null
  notas?: string | null
  zona?: string
}

export interface ResultadoDePlan {
  ok: boolean
  errores: string[]
  advertencias: string[]
  /** Con los nombres del dominio; lo traduce a columnas el repositorio. */
  plan: Record<string, unknown> | null
  /** `true` si lo que falló fue leer la línea: la ruta responde 422 y no 400. */
  errorDeLectura: boolean
}

export declare function validarPlanDeRecurrencia(
  entrada: unknown,
  opciones?: { zona?: string; hoy?: Date }
): ResultadoDePlan

/** El cuerpo de `PATCH /recurrencias/:id`: "editar de aquí en adelante". */
export interface CambioDeRecurrencia {
  /** Obligatorio: desde qué fecha vale el cambio. */
  desde: FechaISO
  monto?: number
  item?: string
  categoria?: CategoriaDeMovimiento
  metodo?: Metodo
  notas?: string | null
  frecuencia?: Frecuencia
  hasta?: FechaISO | null
}

export declare function validarCambioDePlan(
  plan: Recurrencia,
  cambio: unknown
): { ok: boolean; errores: string[]; plan: Record<string, unknown> | null; desde: FechaISO | null }

// ── Zonas horarias ─────────────────────────────────────────────────────────

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

// ── Contrato de la API ─────────────────────────────────────────────────────

/** Un movimiento como lo devuelve la API. */
export interface Movimiento {
  id: string | number
  monto: number
  monto_formateado: string
  item: string
  categoria: CategoriaDeMovimiento
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
  /**
   * La cuenta del perfil a la que pertenece el movimiento. La llena la base
   * (trigger `movimientos_asignar_cuenta`), así que la app no la manda al crear.
   * Todavía no hay pantalla de cuentas: viaja porque la API devuelve la fila
   * entera, y está acá para que el día que se use no se declare de nuevo.
   */
  cuenta_id?: string | null
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

/** `GET /movimientos` */
export interface MovimientosDelMes {
  ok: true
  cantidad: number
  total: number
  totalFormateado: string
  datos: Movimiento[]
}

/** `POST /movimientos` */
export interface MovimientoCreado {
  ok: true
  datos: MovimientoParseado & { id: string | number }
}

/** `PATCH /movimientos/:id` y `DELETE /movimientos/:id` */
export interface MovimientoCambiado {
  ok: true
  errores: []
  /** La fila como quedó, o —en el borrado— como estaba antes de borrarse. */
  datos: Movimiento
}

/** `GET /recurrencias` */
export interface RecurrenciasDelPerfil {
  ok: true
  errores: []
  advertencias: string[]
  datos: Recurrencia[]
}

/** `GET /recurrencias/propuestas` */
export interface PropuestasPendientes {
  ok: true
  errores: []
  advertencias: string[]
  cantidad: number
  datos: PropuestaPendiente[]
}

/** `POST /recurrencias` y `PATCH /recurrencias/:id` */
export interface RecurrenciaGuardada {
  ok: true
  errores: []
  datos: Recurrencia
}

/**
 * `POST /recurrencias/propuestas/confirmar`
 *
 * Devuelve el movimiento que se creó, no la propuesta: lo que la app tiene que
 * mostrar y sumar es el movimiento.
 */
export interface PropuestaConfirmada {
  ok: true
  errores: []
  datos: Movimiento
}

/** `GET /movimientos/anuales` */
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
