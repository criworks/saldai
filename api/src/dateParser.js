/**
 * Date Parser
 * Resuelve strings de fecha humana en español a fechas civiles (sin hora).
 *
 * El "hoy" de referencia es el de la zona horaria de la app, no el del
 * servidor: Render corre en UTC, así que un gasto cargado a las 22:00 en Chile
 * quedaba con la fecha del día siguiente.
 */

const ZONA_HORARIA = process.env.APP_TIMEZONE || 'America/Santiago'

const DIAS_SEMANA = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3, miércoles: 3,
  jueves: 4, viernes: 5, sabado: 6, sábado: 6,
};

/**
 * Fecha civil (sin hora) anclada a medianoche UTC. Al no tener zona horaria,
 * sumar y restar días no se ve afectado por los cambios de horario de verano.
 */
function civil(anio, mes, dia) {
  return new Date(Date.UTC(anio, mes - 1, dia));
}

/** El día de hoy según ZONA_HORARIA. */
function hoyCivil() {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const valor = (tipo) => parseInt(partes.find((p) => p.type === tipo).value, 10);
  return civil(valor("year"), valor("month"), valor("day"));
}

function sumarDias(fecha, dias) {
  const d = new Date(fecha.getTime());
  d.setUTCDate(d.getUTCDate() + dias);
  return d;
}

function diasEnMes(anio, mes) {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/** Descarta fechas que no existen en el calendario, como 31/02. */
function existe(anio, mes, dia) {
  return mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasEnMes(anio, mes);
}

/**
 * @param {string|undefined} input - texto de fecha del usuario
 * @param {Date} [hoy] - fecha de referencia. Solo se pasa en los tests.
 * @returns {{ fecha?: Date, fechaISO?: string, fechaStr?: string, raw: string, advertencia?: string, error?: string }}
 */
function parsearFecha(input, hoy = hoyCivil()) {
  const raw = (input || "").trim().toLowerCase();

  // Sin input → hoy
  if (!raw || raw === "hoy" || raw === "today") {
    return formatear(hoy, raw || "hoy");
  }

  // "ayer"
  if (raw === "ayer" || raw === "yesterday") {
    return formatear(sumarDias(hoy, -1), raw);
  }

  // "anteayer"
  if (raw === "anteayer") {
    return formatear(sumarDias(hoy, -2), raw);
  }

  // Día de semana: "lunes", "el lunes", etc.
  for (const [nombre, numDia] of Object.entries(DIAS_SEMANA)) {
    if (raw === nombre || raw === `el ${nombre}`) {
      // Si es hoy mismo, se asume la semana pasada.
      const diff = (hoy.getUTCDay() - numDia + 7) % 7 || 7;
      return formatear(sumarDias(hoy, -diff), raw);
    }
  }

  // Solo número de día: "15", "3"
  if (/^\d{1,2}$/.test(raw)) {
    const dia = parseInt(raw, 10);
    let anio = hoy.getUTCFullYear();
    let mes = hoy.getUTCMonth() + 1;

    // Si el día todavía no llega este mes, se asume el mes anterior.
    if (dia > hoy.getUTCDate()) {
      mes -= 1;
      if (mes === 0) {
        mes = 12;
        anio -= 1;
      }
    }

    if (!existe(anio, mes, dia)) return fechaInvalida(raw);
    return formatear(civil(anio, mes, dia), raw);
  }

  // Formato DD/MM o DD-MM
  const matchDM = raw.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (matchDM) {
    const dia = parseInt(matchDM[1], 10);
    const mes = parseInt(matchDM[2], 10);
    let anio = hoy.getUTCFullYear();

    // Un gasto se registra después de ocurrir: si la fecha queda en el futuro,
    // se asume el año pasado.
    if (existe(anio, mes, dia) && civil(anio, mes, dia) > hoy) anio -= 1;

    if (!existe(anio, mes, dia)) return fechaInvalida(raw);
    return formatear(civil(anio, mes, dia), raw);
  }

  // Formato DD/MM/YYYY o DD-MM-YYYY
  const matchFull = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (matchFull) {
    const dia = parseInt(matchFull[1], 10);
    const mes = parseInt(matchFull[2], 10);
    let anio = parseInt(matchFull[3], 10);
    if (anio < 100) anio += 2000;

    if (!existe(anio, mes, dia)) return fechaInvalida(raw);
    return formatear(civil(anio, mes, dia), raw);
  }

  // No se parece a ninguna fecha conocida → hoy con advertencia
  return { ...formatear(hoy, raw), advertencia: `No se reconoció la fecha "${raw}", se usó hoy` };
}

/**
 * La fecha tiene forma de fecha pero no existe (31/02, 45/13). Es un error y no
 * una advertencia: el usuario la escribió explícitamente y conviene que
 * corrija, en vez de guardar otro día en silencio.
 */
function fechaInvalida(raw) {
  return { raw, error: `Fecha inválida: "${raw}"` };
}

function formatear(date, raw) {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return {
    fecha: date,
    // ISO para la base de datos (la columna es date) y DD/MM/AAAA para mostrar.
    fechaISO: `${yyyy}-${mm}-${dd}`,
    fechaStr: `${dd}/${mm}/${yyyy}`,
    raw,
  };
}

module.exports = { parsearFecha, hoyCivil, ZONA_HORARIA };
