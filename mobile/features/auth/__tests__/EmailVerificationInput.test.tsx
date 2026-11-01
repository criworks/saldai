import { fireEvent, render, screen } from '@testing-library/react-native'
import React, { useState } from 'react'

import { EmailVerificationInput, iconoDelInput } from '../componentes/EmailVerificationInput'

/** El input con el estado que en la pantalla vive en LoginScreen. */
function ConEstado({ inicial = '', isVerifying = false }: { inicial?: string; isVerifying?: boolean }) {
  const [email, setEmail] = useState(inicial)
  return (
    <EmailVerificationInput
      value={email}
      onChangeText={setEmail}
      isVerifying={isVerifying}
    />
  )
}

const input = () => screen.getByPlaceholderText('tu@email.com')

test('la "x" aparece solo cuando se está escribiendo y hay algo escrito', () => {
  // Sin foco no hay nada que borrar, aunque haya texto.
  expect(iconoDelInput({ isVerifying: false, isFocused: false, tieneTexto: true })).toBe('lapiz')
  // En foco pero vacío tampoco: una "x" que no borra nada es peor que no estar.
  expect(iconoDelInput({ isVerifying: false, isFocused: true, tieneTexto: false })).toBe('lapiz')
  // El único caso con algo que borrar.
  expect(iconoDelInput({ isVerifying: false, isFocused: true, tieneTexto: true })).toBe('limpiar')
})

test('esperando el código el reloj gana, pero volver al input ofrece borrar', () => {
  expect(iconoDelInput({ isVerifying: true, isFocused: false, tieneTexto: true })).toBe('reloj')
  expect(iconoDelInput({ isVerifying: true, isFocused: true, tieneTexto: true })).toBe('limpiar')
})

test('con el input en foco y texto se ve la "x"', () => {
  render(<ConEstado inicial="crim@saldai.app" />)
  expect(screen.queryByTestId('boton-limpiar')).toBeNull()

  fireEvent(input(), 'focus')
  expect(screen.getByTestId('boton-limpiar')).toBeTruthy()
})

test('un tap en la "x" borra todo el texto, no solo el último caracter', () => {
  render(<ConEstado inicial="crim@saldai.app" />)
  fireEvent(input(), 'focus')

  fireEvent.press(screen.getByTestId('boton-limpiar'))

  expect(input().props.value).toBe('')
  // Y con el input vacío la "x" se va, porque ya no hay nada que borrar.
  expect(screen.queryByTestId('boton-limpiar')).toBeNull()
})

test('al salir del input la "x" desaparece y vuelve el lápiz', () => {
  render(<ConEstado inicial="crim@saldai.app" />)
  fireEvent(input(), 'focus')
  expect(screen.getByTestId('boton-limpiar')).toBeTruthy()

  fireEvent(input(), 'blur')
  expect(screen.queryByTestId('boton-limpiar')).toBeNull()
})
