import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { Switch } from '../Switch'

test('expone su estado como switch, para los lectores de pantalla', () => {
  const { getByTestId } = render(
    <Switch value testID="sw" onValueChange={() => {}} accessibilityLabel="Categorías" />
  )

  const sw = getByTestId('sw')
  expect(sw.props.accessibilityRole).toBe('switch')
  expect(sw.props.accessibilityState.checked).toBe(true)
  expect(sw.props.accessibilityLabel).toBe('Categorías')
})

test('un tap manda lo contrario de lo que tiene', () => {
  // El componente no guarda estado: si mandara `true` estando prendido, el
  // switch no se podría apagar nunca.
  const alCambiar = jest.fn()
  const { getByTestId } = render(<Switch value testID="sw" onValueChange={alCambiar} />)

  fireEvent.press(getByTestId('sw'))

  expect(alCambiar).toHaveBeenCalledWith(false)
})

test('apagado, un tap manda true', () => {
  const alCambiar = jest.fn()
  const { getByTestId } = render(<Switch value={false} testID="sw" onValueChange={alCambiar} />)

  fireEvent.press(getByTestId('sw'))

  expect(alCambiar).toHaveBeenCalledWith(true)
})

test('mientras se guarda no acepta taps', () => {
  // Dos taps seguidos mandarían dos PATCH y el segundo podría llegar primero.
  const alCambiar = jest.fn()
  const { getByTestId } = render(
    <Switch value={false} disabled testID="sw" onValueChange={alCambiar} />
  )

  const sw = getByTestId('sw')
  fireEvent.press(sw)

  expect(alCambiar).not.toHaveBeenCalled()
  expect(sw.props.accessibilityState.disabled).toBe(true)
})
