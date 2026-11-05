import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { MenuItem } from '../MenuItem'

test('sin switchValue la fila no lleva switch', () => {
  // `undefined` es "esta fila no tiene switch", que no es lo mismo que tenerlo
  // apagado: si fuera lo mismo, todas las filas del menú mostrarían uno.
  const { queryByTestId } = render(<MenuItem title="Perfil" onPress={() => {}} />)

  expect(queryByTestId('switch-Perfil')).toBeNull()
})

test('con switchValue en false la fila sí lleva switch, apagado', () => {
  const { getByTestId } = render(
    <MenuItem title="Categorías" switchValue={false} onSwitchChange={() => {}} />
  )

  expect(getByTestId('switch-Categorías').props.accessibilityState.checked).toBe(false)
})

test('el tap del switch no navega', () => {
  // Las dos acciones conviven en la misma fila: el switch prende la función y
  // el resto de la fila entra a configurarla.
  const alPresionar = jest.fn()
  const alCambiar = jest.fn()
  const { getByTestId } = render(
    <MenuItem
      title="Categorías"
      switchValue={false}
      onSwitchChange={alCambiar}
      onPress={alPresionar}
    />
  )

  fireEvent.press(getByTestId('switch-Categorías'))

  expect(alCambiar).toHaveBeenCalledWith(true)
  expect(alPresionar).not.toHaveBeenCalled()
})
