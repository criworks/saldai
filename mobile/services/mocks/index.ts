/**
 * Respuestas simuladas de la API, para revisar estados de UI sin tocar el
 * backend: lista vacía, lista gigante, carga eterna, errores.
 *
 * Se activan con `EXPO_PUBLIC_USE_MOCKS=true` y el estado se cambia en caliente
 * desde el playground, con `mockFeedConfig`. En un build de EAS las variables
 * quedan congeladas dentro del bundle, así que esto es solo para desarrollo.
 *
 * Vive aparte de `services/api.ts` a propósito: cuando estaban juntos, cada
 * función de red empezaba con treinta líneas de mentira antes de llegar al
 * `fetch`, y costaba ver qué hacía la app de verdad.
 */

import {
  aIsoCivil,
  categorizar,
  desdeIsoCivil,
  formatearMonto,
  hoyCivil,
  isoAChileno,
  movimientoDeLaPropuesta,
  planVivoDeLaCadena,
  propuestasPendientes,
  sumarDias,
  unirCamposEditados,
  validarCambioDePlan,
  validarPlanDeRecurrencia,
} from '@saldai/core'
import type {
  CambioDeMovimiento,
  CambioDeRecurrencia,
  CampoEditable,
  Movimiento,
  NuevaRecurrencia,
  Recurrencia,
  RecurrenciaDeMovimiento,
  Repeticion,
} from '@saldai/core'
import { mockFeedConfig } from './config'
import { MOVIMIENTOS, MOVIMIENTOS_MUCHOS, movimientoDeMentira } from './datos'

const esperar = (ms: number) => new Promise(res => setTimeout(res, ms))

/** Está prendido solo si la variable dice exactamente "true". */
export const enModoMock = process.env.EXPO_PUBLIC_USE_MOCKS === 'true'

/**
 * La espera que comparten todas las llamadas simuladas, para que la UI muestre
 * sus estados de carga como los mostraría de verdad. El estado "loading" no
 * termina nunca en la práctica: son diez segundos.
 */
async function esperarSegunEstado() {
  await esperar(mockFeedConfig.state === 'loading' ? 10000 : 800)
}

export async function fetchMovimientosPorMes() {
  await esperarSegunEstado()

  if (mockFeedConfig.state === 'error') {
    throw new Error('Error simulado al obtener los movimientos del mes')
  }

  const datos =
    mockFeedConfig.state === 'empty' ? [] : mockFeedConfig.state === 'huge' ? MOVIMIENTOS_MUCHOS : MOVIMIENTOS

  const total = datos.reduce((acc, g) => acc + g.monto, 0)

  return { ok: true as const, cantidad: datos.length, total, totalFormateado: formatearMonto(total), datos }
}

export async function fetchMovimientosAnuales(anio: number | string) {
  await esperarSegunEstado()

  if (mockFeedConfig.state === 'error') {
    throw new Error('Error simulado al obtener los totales del año')
  }

  const totales =
    mockFeedConfig.state === 'empty'
      ? Array(12).fill(0)
      : Array.from({ length: 12 }, () => Math.floor(Math.random() * 500000) + 100000)

  return { ok: true as const, anio, totales }
}

/**
 * Los errores se disparan por el nombre del item, así se prueban desde la
 * pantalla de captura sin tocar código: "error api", "error rate", "error db",
 * "error token" y "long espera".
 */
const ERRORES_POR_ITEM: { prefijo: string; espera: number; mensaje: string }[] = [
  { prefijo: 'error api', espera: 500, mensaje: 'Error simulado: No se pudo conectar con el servidor (503)' },
  { prefijo: 'error rate', espera: 200, mensaje: 'Too many requests. Please try again after 30 seconds.' },
  { prefijo: 'error db', espera: 800, mensaje: 'Error simulado: Fallo de restricción en base de datos' },
  { prefijo: 'error token', espera: 300, mensaje: 'Error simulado: Token de sesión expirado o inválido' },
]

export async function crearMovimiento(input: string, recurrencia?: RecurrenciaDeMovimiento) {
  const partes = input.split(',').map(p => p.trim())
  const item = partes[1] || input
  const monto = parseInt(partes[0].replace(/[^0-9]/g, ''), 10) || 9999

  const falla = ERRORES_POR_ITEM.find(e => item.toLowerCase().startsWith(e.prefijo))
  if (falla) {
    await esperar(falla.espera)
    throw new Error(falla.mensaje)
  }

  await esperar(item.toLowerCase().startsWith('long espera') ? 5000 : 800)

  // La categoría se infiere con la misma regla que usa la API, así el mock
  // responde como responde producción.
  const nuevo = movimientoDeMentira(Date.now().toString(), monto, item, categorizar(item))
  MOVIMIENTOS.unshift(nuevo)

  // Con recurrencia, el alta crea además el plan y deja esta primera ocurrencia
  // confirmada: es lo que hace la función de Postgres, y el mock tiene que
  // dejar el mismo estado o la propuesta de hoy volvería a aparecer.
  if (recurrencia) {
    const plan = planDelMovimiento(nuevo, recurrencia)
    nuevo.recurrencia_id = plan.id
  }

  // `POST /movimientos` devuelve lo que armó el parser, no la fila cruda: de ahí
  // salen `montoFormateado`, `categoriaSrc` y `fechaFormateada`. El mock las
  // faltaba y el tipo del contrato lo cacheó.
  return {
    ok: true as const,
    datos: {
      ...nuevo,
      montoFormateado: nuevo.monto_formateado,
      categoriaSrc: 'item' as const,
      fechaFormateada: isoAChileno(nuevo.fecha),
    },
    ...(nuevo.recurrencia_id ? { recurrenciaId: nuevo.recurrencia_id } : {}),
  }
}

/**
 * Edita un movimiento del arreglo de mentira, en el lugar.
 *
 * Muta `MOVIMIENTOS` igual que `crearMovimiento`: el mock tiene que comportarse como la
 * base, o sea que después de editar, el siguiente `fetchMovimientosPorMes` devuelve
 * lo editado. Si devolviera la fila cambiada sin guardarla, la lista volvería
 * sola al valor viejo en el refetch y parecería un bug de la app.
 */
export async function editarMovimiento(id: string, cambio: CambioDeMovimiento) {
  await esperar(500)

  const indice = MOVIMIENTOS.findIndex(g => String(g.id) === String(id))
  if (indice === -1) throw new Error('Error simulado: ese movimiento no existe')

  const previo = MOVIMIENTOS[indice]
  const editados = Object.keys(cambio) as CampoEditable[]

  const actualizado: Movimiento = {
    ...previo,
    ...cambio,
    notas: cambio.notas === '' ? null : (cambio.notas ?? previo.notas ?? null),
    monto_formateado:
      cambio.monto === undefined ? previo.monto_formateado : formatearMonto(cambio.monto),
    editado_en: new Date().toISOString(),
    campos_editados: unirCamposEditados(previo.campos_editados, editados),
  }

  MOVIMIENTOS[indice] = actualizado

  return { ok: true as const, errores: [] as [], datos: actualizado }
}

/** Borra un movimiento del arreglo de mentira y devuelve el que borró. */
export async function eliminarMovimiento(id: string) {
  await esperar(500)

  const indice = MOVIMIENTOS.findIndex(g => String(g.id) === String(id))
  if (indice === -1) throw new Error('Error simulado: ese movimiento no existe')

  const [borrado] = MOVIMIENTOS.splice(indice, 1)

  return { ok: true as const, errores: [] as [], datos: borrado }
}

// ── Recurrencia con confirmación ───────────────────────────────────────────
//
// Los planes y las decisiones viven en dos arreglos de mentira y las propuestas
// **se derivan**, con las mismas funciones del core que usa la API: así el mock
// se equivoca donde se equivocaría producción. Si las propuestas estuvieran
// escritas a mano, confirmar una no la sacaría de la lista y parecería un bug
// de la app.

const RECURRENCIAS: Recurrencia[] = [
  {
    id: 'rec-1',
    monto: 525457,
    monto_formateado: formatearMonto(525457),
    item: 'arriendo',
    categoria: 'Básicos',
    categoria_src: 'campo',
    metodo: 'TC',
    notas: null,
    frecuencia: 'mensual',
    // La regla en null es "derivá del ancla", que es el default del dominio.
    dia_de_la_semana: null,
    semana_del_mes: null,
    dia_del_mes: null,
    mes_del_anio: null,
    // Tres meses atrás del día de hoy, así el mock siempre tiene propuestas
    // pendientes sin que haya que editar una fecha a mano cada mes.
    vigente_desde: aIsoCivil(sumarDias(hoyCivil(), -92)),
    vigente_hasta: null,
    input_original: '525457, arriendo, basicos, tc',
    zona: 'America/Santiago',
    hoy_resuelto: aIsoCivil(hoyCivil()),
    plan_anterior_id: null,
  },
]

/** Las fechas que el usuario ya decidió, con los nombres del dominio. */
const DECISIONES: { recurrenciaId: string; fecha: string }[] = []

export async function fetchRecurrencias() {
  await esperar(400)
  return {
    ok: true as const,
    errores: [] as [],
    advertencias: [] as string[],
    datos: RECURRENCIAS,
  }
}

export async function fetchPropuestas(hasta?: string) {
  await esperar(400)

  // La misma regla que la API: `hasta` solo estira la ventana hacia adelante,
  // nunca antes de hoy, porque lo atrasado se debe igual.
  const hoy = aIsoCivil(hoyCivil())
  const tope = hasta && hasta > hoy ? hasta : hoy
  const pendientes = propuestasPendientes(RECURRENCIAS, DECISIONES, { hasta: tope })

  return {
    ok: true as const,
    errores: [] as [],
    advertencias: [] as string[],
    cantidad: pendientes.length,
    datos: pendientes.map(({ recurrenciaId, fecha, plan }) => ({
      recurrenciaId,
      fecha,
      movimiento: movimientoDeLaPropuesta(plan, fecha).movimiento,
      recurrencia: plan,
    })),
  }
}

export async function crearRecurrencia(plan: NuevaRecurrencia) {
  await esperar(600)

  // Se valida con lo mismo que la API, así un input que producción rechaza acá
  // también se rechaza y con el mismo mensaje.
  const lectura = validarPlanDeRecurrencia(plan, { zona: plan.zona })
  if (!lectura.ok || !lectura.plan) throw new Error(lectura.errores.join('\n'))

  // `plan` viene con los nombres del dominio, igual que lo que recibe el
  // repositorio de la API: la traducción a la forma de la fila es esto.
  const campos = lectura.plan as {
    monto: number
    montoFormateado: string
    item: string
    categoria: Recurrencia['categoria']
    categoriaSrc: Recurrencia['categoria_src']
    metodo: Recurrencia['metodo']
    notas: string | null
    frecuencia: Recurrencia['frecuencia']
    repeticion: Repeticion
    vigenteDesde: string
    vigenteHasta: string | null
    zona: string
    hoyResuelto: string
  }

  const nueva: Recurrencia = {
    id: `rec-${Date.now()}`,
    monto: campos.monto,
    monto_formateado: campos.montoFormateado,
    item: campos.item,
    categoria: campos.categoria,
    categoria_src: campos.categoriaSrc,
    metodo: campos.metodo,
    notas: campos.notas,
    frecuencia: campos.frecuencia,
    dia_de_la_semana: campos.repeticion.diaDeLaSemana,
    semana_del_mes: campos.repeticion.semanaDelMes,
    dia_del_mes: campos.repeticion.diaDelMes,
    mes_del_anio: campos.repeticion.mesDelAnio,
    vigente_desde: campos.vigenteDesde,
    vigente_hasta: campos.vigenteHasta,
    input_original: plan.input,
    zona: campos.zona,
    hoy_resuelto: campos.hoyResuelto,
    plan_anterior_id: null,
  }

  RECURRENCIAS.unshift(nueva)

  return { ok: true as const, errores: [] as [], datos: nueva }
}

export async function confirmarPropuesta(
  recurrenciaId: string,
  fecha: string,
  cambio?: CambioDeMovimiento
) {
  await esperar(500)

  const plan = RECURRENCIAS.find(r => r.id === recurrenciaId)
  if (!plan) throw new Error('Error simulado: esa recurrencia no existe')

  // La misma unicidad que el índice de la base: un doble toque no crea dos
  // movimientos, responde que ya estaba decidida.
  if (DECISIONES.some(d => d.recurrenciaId === recurrenciaId && d.fecha === fecha)) {
    throw new Error('Esa propuesta ya estaba decidida')
  }

  const { movimiento, camposEditados } = movimientoDeLaPropuesta(
    plan,
    fecha,
    (cambio ?? {}) as Record<string, unknown>
  )

  const nuevo: Movimiento = {
    id: `movimiento-${Date.now()}`,
    monto: movimiento.monto,
    monto_formateado: formatearMonto(movimiento.monto),
    item: movimiento.item,
    categoria: movimiento.categoria,
    fecha: movimiento.fecha,
    metodo: movimiento.metodo,
    notas: movimiento.notas,
    campos_editados: camposEditados,
    editado_en: camposEditados.length > 0 ? new Date().toISOString() : null,
  }

  MOVIMIENTOS.unshift(nuevo)
  DECISIONES.push({ recurrenciaId, fecha })

  return { ok: true as const, errores: [] as [], datos: nuevo }
}

export async function omitirPropuesta(recurrenciaId: string, fecha: string) {
  await esperar(400)

  if (DECISIONES.some(d => d.recurrenciaId === recurrenciaId && d.fecha === fecha)) {
    throw new Error('Esa propuesta ya estaba decidida')
  }

  // Omitir no crea movimiento: solo deja la fecha decidida.
  DECISIONES.push({ recurrenciaId, fecha })

  return { ok: true as const }
}

export async function editarRecurrencia(id: string, cambio: CambioDeRecurrencia) {
  await esperar(500)

  const indice = RECURRENCIAS.findIndex(r => r.id === id)
  if (indice === -1) throw new Error('Error simulado: esa recurrencia no existe')

  const previo = RECURRENCIAS[indice]
  const validado = validarCambioDePlan(previo, cambio)
  if (!validado.ok || !validado.plan || !validado.desde) {
    throw new Error(validado.errores.join('\n'))
  }

  const desde = validado.desde
  const siguiente = validado.plan as {
    monto: number
    montoFormateado: string
    item: string
    categoria: Recurrencia['categoria']
    categoriaSrc: Recurrencia['categoria_src']
    metodo: Recurrencia['metodo']
    notas: string | null
    frecuencia: Recurrencia['frecuencia']
    repeticion: Repeticion
    vigenteHasta: string | null
  }

  // Si el cambio vale desde antes de que el plan empezara no hay historia que
  // preservar, así que se edita en el lugar: es la misma rama que tiene
  // `editar_recurrencia_desde` en Postgres.
  const enElLugar = desde <= previo.vigente_desde

  const nuevo: Recurrencia = {
    ...previo,
    id: enElLugar ? previo.id : `rec-${Date.now()}`,
    monto: siguiente.monto,
    monto_formateado: siguiente.montoFormateado,
    item: siguiente.item,
    categoria: siguiente.categoria,
    categoria_src: siguiente.categoriaSrc,
    metodo: siguiente.metodo,
    notas: siguiente.notas,
    frecuencia: siguiente.frecuencia,
    dia_de_la_semana: siguiente.repeticion.diaDeLaSemana,
    semana_del_mes: siguiente.repeticion.semanaDelMes,
    dia_del_mes: siguiente.repeticion.diaDelMes,
    mes_del_anio: siguiente.repeticion.mesDelAnio,
    vigente_desde: desde,
    vigente_hasta: siguiente.vigenteHasta,
    plan_anterior_id: enElLugar ? (previo.plan_anterior_id ?? null) : previo.id,
  }

  if (enElLugar) {
    RECURRENCIAS[indice] = nuevo
  } else {
    // El plan viejo se cierra el día anterior y sigue en el arreglo: es lo que
    // hace que una propuesta pendiente de antes de `desde` conserve sus valores.
    const vispera = desdeIsoCivil(desde)
    RECURRENCIAS[indice] = {
      ...previo,
      vigente_hasta: vispera ? aIsoCivil(sumarDias(vispera, -1)) : previo.vigente_hasta,
    }
    RECURRENCIAS.unshift(nuevo)
  }

  return { ok: true as const, errores: [] as [], datos: nuevo }
}

/**
 * El plan de un movimiento marcado como recurrente, anclado en su fecha, y la
 * decisión que deja esa primera ocurrencia confirmada.
 *
 * Las dos cosas juntas, como la función de Postgres: con el plan creado y la
 * decisión sin escribir, el movimiento que la persona acaba de registrar
 * volvería como propuesta.
 */
function planDelMovimiento(
  movimiento: Movimiento,
  recurrencia: RecurrenciaDeMovimiento
): Recurrencia {
  const plan: Recurrencia = {
    id: `rec-${Date.now()}`,
    monto: movimiento.monto,
    monto_formateado: movimiento.monto_formateado,
    item: movimiento.item,
    categoria: movimiento.categoria,
    categoria_src: 'campo',
    metodo: movimiento.metodo,
    notas: movimiento.notas ?? null,
    frecuencia: recurrencia.frecuencia,
    // La regla sin elegir queda en null, que es "derivá del ancla": acá, la
    // fecha del movimiento.
    dia_de_la_semana: recurrencia.repeticion?.diaDeLaSemana ?? null,
    semana_del_mes: recurrencia.repeticion?.semanaDelMes ?? null,
    dia_del_mes: recurrencia.repeticion?.diaDelMes ?? null,
    mes_del_anio: recurrencia.repeticion?.mesDelAnio ?? null,
    vigente_desde: movimiento.fecha,
    vigente_hasta: recurrencia.hasta ?? null,
    input_original: null,
    zona: 'America/Santiago',
    hoy_resuelto: null,
    plan_anterior_id: null,
  }

  RECURRENCIAS.unshift(plan)
  DECISIONES.push({ recurrenciaId: plan.id, fecha: movimiento.fecha })

  return plan
}

/** Marca como recurrente un movimiento que ya existe. */
export async function atarRecurrencia(id: string, recurrencia: RecurrenciaDeMovimiento) {
  await esperar(500)

  const movimiento = MOVIMIENTOS.find((m) => String(m.id) === String(id))
  if (!movimiento) throw new Error('Error simulado: ese movimiento no existe')
  if (movimiento.recurrencia_id) {
    // El mismo 409 que da el unique de la base: dos toques seguidos no crean
    // dos planes para el mismo movimiento.
    throw new Error('Ese movimiento ya tiene una recurrencia')
  }

  const plan = planDelMovimiento(movimiento, recurrencia)
  movimiento.recurrencia_id = plan.id

  return { ok: true as const, errores: [] as [], datos: plan }
}

/** Un plan por id, y el que sigue proponiendo de su cadena. */
export async function fetchRecurrencia(id: string) {
  await esperar(300)

  const plan = RECURRENCIAS.find((r) => r.id === id)
  if (!plan) throw new Error('Error simulado: esa recurrencia no existe')

  return {
    ok: true as const,
    errores: [] as [],
    datos: plan,
    vivo: planVivoDeLaCadena(RECURRENCIAS, id) ?? plan,
  }
}

/** Termina un plan: deja de proponer desde hoy, sin borrar nada. */
export async function terminarRecurrencia(id: string) {
  await esperar(500)

  const vivo = planVivoDeLaCadena(RECURRENCIAS, id)
  if (!vivo) throw new Error('Error simulado: esa recurrencia no existe')

  const indice = RECURRENCIAS.findIndex((r) => r.id === vivo.id)
  const ayer = aIsoCivil(sumarDias(hoyCivil(), -1))
  const corte = ayer < vivo.vigente_desde ? vivo.vigente_desde : ayer

  const terminado = { ...vivo, vigente_hasta: corte }
  RECURRENCIAS[indice] = terminado

  return { ok: true as const, errores: [] as [], datos: terminado }
}
