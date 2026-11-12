import { nombreDeZona } from '@saldai/core'

/**
 * La zona horaria del dispositivo.
 *
 * El core no lee el entorno: la zona se le pasa. Hasta ahora mobile no le
 * pasaba ninguna, así que el parser caía a su default (`America/Santiago`) y un
 * usuario fuera de Chile registraba un movimiento con el día de Chile.
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

/**
 * Cómo se muestra la zona en la fila de configuraciones.
 *
 * Sin zona guardada dice "Automática" y no el nombre de la zona del aparato,
 * porque lo que el usuario eligió es justamente que la siga: si dijera
 * "Santiago" parecería una elección fija y no se entendería que al viajar
 * cambia sola.
 */
export function nombreDeZonaMostrada(zona: string | undefined): string {
  return zona ? nombreDeZona(zona) : 'Automática'
}
