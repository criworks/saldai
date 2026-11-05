import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { CampoDeCategoria } from '../componentes/CampoDeCategoria'

const montar = (emoji = '', nombre = '') => {
  const props = {
    emoji,
    nombre,
    onEmoji: jest.fn(),
    onNombre: jest.fn(),
    onConfirmar: jest.fn(),
    onCancelar: jest.fn(),
  }
  return { ...props, ...render(<CampoDeCategoria {...props} />) }
}

test('el campo del emoji solo deja pasar emojis', () => {
  const { getByTestId, onEmoji } = montar()

  fireEvent.changeText(getByTestId('campo-de-categoria-emoji'), '🏠')

  expect(onEmoji).toHaveBeenCalledWith('🏠')
})

test('escribir una letra en el emoji no pone nada', () => {
  // Deja el campo quieto en vez de mostrar un error: el teclado del sistema no
  // se puede limitar a emojis, así que escribir una letra es lo normal.
  const { getByTestId, onEmoji } = montar()

  fireEvent.changeText(getByTestId('campo-de-categoria-emoji'), 'casa')

  expect(onEmoji).toHaveBeenCalledWith('')
})

test('de varios emojis se queda el primero', () => {
  // El icono de una categoría es uno: pegar tres desde el portapapeles deja el
  // primero y no los tres pegados.
  const { getByTestId, onEmoji } = montar()

  fireEvent.changeText(getByTestId('campo-de-categoria-emoji'), '🏠🛒🚌')

  expect(onEmoji).toHaveBeenCalledWith('🏠')
})

test('el nombre pasa tal cual, sin filtrar', () => {
  const { getByTestId, onNombre } = montar()

  fireEvent.changeText(getByTestId('campo-de-categoria-nombre'), 'Mascotas')

  expect(onNombre).toHaveBeenCalledWith('Mascotas')
})

test('el check del teclado confirma, desde los dos campos', () => {
  // Es la única forma de confirmar: no hay botón de guardar.
  const { getByTestId, onConfirmar } = montar('🏠', 'Mascotas')

  fireEvent(getByTestId('campo-de-categoria-nombre'), 'submitEditing')
  fireEvent(getByTestId('campo-de-categoria-emoji'), 'submitEditing')

  expect(onConfirmar).toHaveBeenCalledTimes(2)
})

test('la "x" cancela y no confirma', () => {
  const { getByTestId, onCancelar, onConfirmar } = montar('🏠', 'Mascotas')

  fireEvent.press(getByTestId('boton-limpiar'))

  expect(onCancelar).toHaveBeenCalled()
  expect(onConfirmar).not.toHaveBeenCalled()
})

test('la "x" está desde el principio, con el campo vacío', () => {
  // Es lo que saca la burbuja recién creada: si apareciera solo con texto, un
  // campo vacío no se podría cancelar.
  const { queryByTestId } = montar()

  expect(queryByTestId('boton-limpiar')).not.toBeNull()
})
