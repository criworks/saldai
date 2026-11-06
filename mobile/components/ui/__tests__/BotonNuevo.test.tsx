import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { BotonNuevo } from '../BotonNuevo'

test('con etiqueta se ve el texto', () => {
  const { getByText } = render(
    <BotonNuevo etiqueta="Nueva categoría" onPress={() => {}} />
  )

  getByText('Nueva categoría')
})

test('sin etiqueta queda solo el "+", pero sigue diciendo qué hace', () => {
  // La etiqueta se esconde cuando ya hay elementos; el lector de pantalla no
  // puede quedarse con un botón que no dice nada.
  const { queryByText, getByTestId } = render(
    <BotonNuevo etiqueta="Nueva categoría" conEtiqueta={false} onPress={() => {}} testID="nuevo" />
  )

  expect(queryByText('Nueva categoría')).toBeNull()
  expect(getByTestId('nuevo').props.accessibilityLabel).toBe('Nueva categoría')
})

test('la etiqueta también dispara el botón', () => {
  // Con el "+" tocable y la etiqueta no, el objetivo de toque queda más chico
  // de lo que se ve.
  const alPresionar = jest.fn()
  const { getByText } = render(
    <BotonNuevo etiqueta="Nueva categoría" onPress={alPresionar} />
  )

  fireEvent.press(getByText('Nueva categoría'))

  expect(alPresionar).toHaveBeenCalled()
})

test('deshabilitado no dispara', () => {
  const alPresionar = jest.fn()
  const { getByTestId } = render(
    <BotonNuevo etiqueta="Nueva categoría" disabled onPress={alPresionar} testID="nuevo" />
  )

  fireEvent.press(getByTestId('nuevo'))

  expect(alPresionar).not.toHaveBeenCalled()
})
