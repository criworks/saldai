/**
 * Hasta dónde pedirle propuestas a la API.
 *
 * Una propuesta pendiente se deriva del plan cada vez que se la pide, así que
 * la pregunta "hasta cuándo" la hace el cliente y no la base. La respuesta es
 * **el fin del mes que se está mirando**: el mes abierto muestra todo lo que
 * pasa en él, incluido lo que el plan dice que todavía falta, que es lo que uno
 * busca cuando abre un mes.
 *
 * Y nunca antes de hoy, aunque se esté mirando un mes viejo: lo atrasado se
 * debe igual y es justo lo que se está olvidando. Sin este piso, abrir
 * septiembre haría desaparecer las propuestas de octubre y de noviembre, y con
 * ellas el aviso que las cuenta.
 */
export function ventanaDePropuestas(mes: number, anio: number, hoy: Date = new Date()): string {
  // El día 0 del mes siguiente es el último del mes pedido, sin tener que saber
  // cuántos días tiene ni si el año es bisiesto.
  const ultimo = new Date(anio, mes, 0)
  const finDelMes = `${ultimo.getFullYear()}-${String(ultimo.getMonth() + 1).padStart(2, '0')}-${String(ultimo.getDate()).padStart(2, '0')}`

  const hoyIso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

  // Las dos son `AAAA-MM-DD`, así que la comparación de textos alcanza.
  return finDelMes > hoyIso ? finDelMes : hoyIso
}
