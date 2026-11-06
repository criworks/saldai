import { nombreDeZonaMostrada } from '../zona'

test('sin zona guardada la fila dice "Automática"', () => {
  // No dice el nombre de la zona del aparato: lo que el usuario eligió es que
  // la siga, y al viajar cambia sola.
  expect(nombreDeZonaMostrada(undefined)).toBe('Automática')
})

test('con zona guardada la fila dice el nombre, no el IANA', () => {
  expect(nombreDeZonaMostrada('Europe/Madrid')).toBe('Madrid')
  expect(nombreDeZonaMostrada('America/Argentina/Buenos_Aires')).toBe('Buenos Aires, Argentina')
})
