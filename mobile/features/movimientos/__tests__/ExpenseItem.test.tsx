import { SIN_CATEGORIA } from '@saldai/core'
import { render } from '@testing-library/react-native'
import React from 'react'
import { ExpenseItem } from '../componentes/ExpenseItem'

test('sin categoría ni método, la fila es el monto y el item', () => {
  // Es la v1: las dos funciones apagadas.
  const { queryByTestId, getByText } = render(<ExpenseItem monto="$1" titulo="café" />)

  getByText('$1')
  getByText('café')
  expect(queryByTestId('fila-categoria-Ocio')).toBeNull()
  expect(queryByTestId('fila-metodo-TC')).toBeNull()
})

test('con categoría aparece su burbuja, con el emoji del catálogo', () => {
  const { getByTestId } = render(<ExpenseItem monto="$1" titulo="café" categoria="Ocio" />)

  expect(getByTestId('fila-categoria-Ocio')).toBeTruthy()
})

test('con método aparece su burbuja, con el código', () => {
  const { getByTestId, getByText } = render(<ExpenseItem monto="$1" titulo="café" metodo="EF" />)

  expect(getByTestId('fila-metodo-EF')).toBeTruthy()
  getByText('EF')
})

test('las dos conviven en la misma fila', () => {
  const { getByTestId } = render(
    <ExpenseItem monto="$1" titulo="café" categoria="Ocio" metodo="TC" />
  )

  expect(getByTestId('fila-categoria-Ocio')).toBeTruthy()
  expect(getByTestId('fila-metodo-TC')).toBeTruthy()
})

test('"Sin categoría" no dibuja burbuja', () => {
  // Es lo que queda cuando ni el usuario ni el parser eligieron: una burbuja en
  // cada fila sin categoría es ruido y no información.
  const { queryByTestId } = render(
    <ExpenseItem monto="$1" titulo="café" categoria={SIN_CATEGORIA} />
  )

  expect(queryByTestId(`fila-categoria-${SIN_CATEGORIA}`)).toBeNull()
})

test('las burbujas dicen qué son, para un lector de pantalla', () => {
  // Un emoji y un código de dos letras no se leen solos.
  const { getByTestId } = render(
    <ExpenseItem monto="$1" titulo="café" categoria="Ocio" metodo="TC" />
  )

  expect(getByTestId('fila-categoria-Ocio').props.accessibilityLabel).toBe('Ocio')
  expect(getByTestId('fila-metodo-TC').props.accessibilityLabel).toBe('TC')
})
