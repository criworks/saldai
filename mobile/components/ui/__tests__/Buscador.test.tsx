import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { Buscador } from '../Buscador'

const montar = (texto = '', onTexto = jest.fn()) => ({
  onTexto,
  ...render(<Buscador titulo="Zona horaria" texto={texto} onTexto={onTexto} />),
})

test('arranca cerrado: solo el título y la lupa', () => {
  const { queryByTestId, getByText } = montar()

  getByText('Zona horaria')
  expect(queryByTestId('buscador-campo')).toBeNull()
})

test('la lupa abre el campo', () => {
  const { getByTestId } = montar()

  fireEvent.press(getByTestId('buscador-boton'))

  expect(getByTestId('buscador-campo')).toBeTruthy()
})

test('cerrar el buscador vacía el texto', () => {
  // Un filtro puesto con el campo escondido es una lista que miente y no dice
  // por qué.
  const { getByTestId, onTexto } = montar('madrid')

  fireEvent.press(getByTestId('buscador-boton'))
  fireEvent.press(getByTestId('buscador-boton'))

  expect(onTexto).toHaveBeenCalledWith('')
})

test('abrirlo no toca el texto', () => {
  const { getByTestId, onTexto } = montar()

  fireEvent.press(getByTestId('buscador-boton'))

  expect(onTexto).not.toHaveBeenCalled()
})

test('lo que se escribe sale hacia afuera', () => {
  // El texto no vive acá: quien lo usa es quien filtra.
  const { getByTestId, onTexto } = montar()

  fireEvent.press(getByTestId('buscador-boton'))
  fireEvent.changeText(getByTestId('buscador-campo'), 'madrid')

  expect(onTexto).toHaveBeenCalledWith('madrid')
})

test('la "x" aparece solo cuando hay algo escrito', () => {
  const vacio = montar('')
  fireEvent.press(vacio.getByTestId('buscador-boton'))
  expect(vacio.queryByTestId('boton-limpiar')).toBeNull()

  const conTexto = montar('madrid')
  fireEvent.press(conTexto.getByTestId('buscador-boton'))
  expect(conTexto.queryByTestId('boton-limpiar')).not.toBeNull()
})

test('la "x" vacía el texto sin cerrar el campo', () => {
  const { getByTestId, onTexto } = montar('madrid')

  fireEvent.press(getByTestId('buscador-boton'))
  fireEvent.press(getByTestId('boton-limpiar'))

  expect(onTexto).toHaveBeenCalledWith('')
  expect(getByTestId('buscador-campo')).toBeTruthy()
})
