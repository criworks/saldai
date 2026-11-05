/**
 * La zona horaria del dispositivo.
 *
 * El core no lee el entorno: la zona se le pasa. Hasta ahora mobile no le
 * pasaba ninguna, así que el parser caía a su default (`America/Santiago`) y un
 * usuario fuera de Chile registraba un gasto con el día de Chile.
 *
 * `Intl` con `timeZone` ya se usa dentro del bundle (`hoyCivil` del core), así
 * que no agrega nada nuevo. El `try` es por si un dispositivo devuelve algo
 * raro: en ese caso se manda `undefined` y la API decide, que es exactamente lo
 * que pasaba antes de este cambio.
 */
export function zonaDelDispositivo(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined
  } catch {
    return undefined
  }
}
