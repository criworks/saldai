import { esSoloEmoji, soloElPrimerEmoji } from '../emoji'

test('un emoji simple pasa', () => {
  expect(esSoloEmoji('🏠')).toBe(true)
  expect(esSoloEmoji('☕️')).toBe(true)
  expect(esSoloEmoji('✅')).toBe(true)
})

test('las letras, los números y el vacío no', () => {
  expect(esSoloEmoji('casa')).toBe(false)
  expect(esSoloEmoji('a')).toBe(false)
  expect(esSoloEmoji('7')).toBe(false)
  expect(esSoloEmoji('')).toBe(false)
  expect(esSoloEmoji(' ')).toBe(false)
})

test('un emoji con una letra al lado no pasa', () => {
  expect(esSoloEmoji('🏠a')).toBe(false)
})

test('del texto escrito se queda el primer emoji', () => {
  expect(soloElPrimerEmoji('🏠')).toBe('🏠')
  expect(soloElPrimerEmoji('🏠🛒🚌')).toBe('🏠')
})

test('lo que no es emoji se descarta sin dejar nada', () => {
  // El teclado del sistema no se puede limitar a emojis, así que una letra
  // tiene que dejar el campo quieto y no poner un error.
  expect(soloElPrimerEmoji('casa')).toBe('')
  expect(soloElPrimerEmoji('')).toBe('')
  expect(soloElPrimerEmoji('   ')).toBe('')
})

test('el emoji se encuentra aunque venga después de texto', () => {
  expect(soloElPrimerEmoji('casa 🏠')).toBe('🏠')
})

test('un emoji compuesto se toma entero y no su primera pieza', () => {
  // Tomar solo el primer code point de 👨‍👩‍👧 deja 👨, que es otro emoji.
  expect(soloElPrimerEmoji('👨‍👩‍👧')).toBe('👨‍👩‍👧')
  // El tono de piel modifica al anterior; sin él 👍🏽 quedaría como 👍.
  expect(soloElPrimerEmoji('👍🏽')).toBe('👍🏽')
  // El selector de variación es lo que vuelve emoji a un símbolo de texto.
  expect(soloElPrimerEmoji('☕️')).toBe('☕️')
})

test('un modificador suelto no cuenta como emoji', () => {
  // Si contara, el campo se llenaría de un carácter invisible.
  expect(soloElPrimerEmoji('‍')).toBe('')
  expect(soloElPrimerEmoji('️')).toBe('')
})
