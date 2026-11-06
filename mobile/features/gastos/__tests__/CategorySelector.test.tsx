import { fireEvent, render, screen } from '@testing-library/react-native'
import React, { useState } from 'react'

import { CategorySelector, estadoDeCategoria } from '../componentes/CategorySelector'

/** El selector con el estado que en la pantalla vive en useGastoMutation. */
function ConEstado({ inferida }: { inferida: string }) {
  const [elegida, setElegida] = useState('')
  return (
    <CategorySelector
      selectedCategory={elegida}
      inferredCategory={inferida}
      onSelectCategory={setElegida}
    />
  )
}

const seleccionada = (categoria: string) =>
  screen.getByTestId(`categoria-${categoria}`).props.accessibilityState?.selected

test('la categoría inferida se ve sugerida, no elegida', () => {
  expect(estadoDeCategoria('Transporte', '', 'Transporte')).toBe('sugerida')
  expect(estadoDeCategoria('Mercado', '', 'Transporte')).toBe('normal')
})

test('una vez que el usuario elige, la sugerencia deja de mostrarse', () => {
  expect(estadoDeCategoria('Ocio', 'Ocio', 'Transporte')).toBe('confirmada')
  expect(estadoDeCategoria('Transporte', 'Ocio', 'Transporte')).toBe('normal')
})

test('"Sin categoría" nunca se sugiere: no tiene burbuja', () => {
  render(<ConEstado inferida="Sin categoría" />)
  expect(screen.queryByLabelText(/sugerida/)).toBeNull()
})

test('un tap sobre la sugerida la confirma', () => {
  render(<ConEstado inferida="Transporte" />)
  expect(screen.getByLabelText('Transporte, sugerida')).toBeTruthy()
  expect(seleccionada('Transporte')).toBe(false)

  fireEvent.press(screen.getByLabelText('Transporte, sugerida'))

  expect(seleccionada('Transporte')).toBe(true)
  expect(screen.queryByLabelText(/sugerida/)).toBeNull()
})

test('tocar la confirmada la suelta y vuelve la sugerencia', () => {
  render(<ConEstado inferida="Transporte" />)
  fireEvent.press(screen.getByTestId('categoria-Ocio'))
  expect(seleccionada('Ocio')).toBe(true)

  fireEvent.press(screen.getByTestId('categoria-Ocio'))

  expect(seleccionada('Ocio')).toBe(false)
  expect(screen.getByLabelText('Transporte, sugerida')).toBeTruthy()
})

test('el botón + quita la elección', () => {
  render(<ConEstado inferida="Transporte" />)
  fireEvent.press(screen.getByTestId('categoria-Mercado'))
  fireEvent.press(screen.getByLabelText('Quitar categoría elegida'))

  expect(seleccionada('Mercado')).toBe(false)
  expect(screen.getByLabelText('Transporte, sugerida')).toBeTruthy()
})
