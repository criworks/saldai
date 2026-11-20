import { act, render } from '@testing-library/react-native'
import React from 'react'
import { DeviceEventEmitter, Text } from 'react-native'
import { ACCION_DESCARTAR, ACCION_GUARDAR, useAccionesDeLaBarra } from '../accionesDeLaBarra'

// `useFocusEffect` de verdad necesita el navegador. Acá se reemplaza por uno
// que corre el efecto solo cuando la pantalla está "en foco", que es la única
// cosa que este hook tiene que respetar.
let mockEnfocada = true
jest.mock('expo-router', () => ({
  useFocusEffect: (efecto: () => void | (() => void)) => {
    const React = require('react')
    const enfocada = mockEnfocada
    React.useEffect(() => {
      if (!enfocada) return
      return efecto()
    }, [enfocada, efecto])
  },
}))

function Pantalla({ guardar, descartar }: { guardar: () => void; descartar: () => void }) {
  useAccionesDeLaBarra(guardar, descartar)
  return <Text>pantalla</Text>
}

const tocar = (evento: string) => act(() => DeviceEventEmitter.emit(evento))

beforeEach(() => {
  mockEnfocada = true
})

test('en foco, el check y el tacho llegan a la pantalla', () => {
  const guardar = jest.fn()
  const descartar = jest.fn()
  render(<Pantalla guardar={guardar} descartar={descartar} />)

  tocar(ACCION_GUARDAR)
  tocar(ACCION_DESCARTAR)

  expect(guardar).toHaveBeenCalledTimes(1)
  expect(descartar).toHaveBeenCalledTimes(1)
})

test('fuera de foco no llega nada, aunque la pantalla siga montada', () => {
  // `movimiento` y `recurrencia` son rutas de las tabs y quedan montadas al
  // volver atrás. Sin esta condición, el tacho de la vista del movimiento
  // disparaba también el de la vista del plan, que terminaba un plan que la
  // persona no estaba mirando.
  const guardar = jest.fn()
  const descartar = jest.fn()
  const { rerender } = render(<Pantalla guardar={guardar} descartar={descartar} />)

  mockEnfocada = false
  rerender(<Pantalla guardar={guardar} descartar={descartar} />)

  tocar(ACCION_GUARDAR)
  tocar(ACCION_DESCARTAR)

  expect(guardar).not.toHaveBeenCalled()
  expect(descartar).not.toHaveBeenCalled()
})

test('el tap llega al handler de ahora y no al del primer render', () => {
  // El borrador cambia en cada tecla, así que el check tiene que guardar lo que
  // está en pantalla y no lo que había cuando la pantalla se montó.
  const viejo = jest.fn()
  const nuevo = jest.fn()
  const { rerender } = render(<Pantalla guardar={viejo} descartar={() => {}} />)

  rerender(<Pantalla guardar={nuevo} descartar={() => {}} />)
  tocar(ACCION_GUARDAR)

  expect(nuevo).toHaveBeenCalledTimes(1)
  expect(viejo).not.toHaveBeenCalled()
})

test('volver al foco vuelve a suscribir, una sola vez', () => {
  const guardar = jest.fn()
  const { rerender } = render(<Pantalla guardar={guardar} descartar={() => {}} />)

  mockEnfocada = false
  rerender(<Pantalla guardar={guardar} descartar={() => {}} />)
  mockEnfocada = true
  rerender(<Pantalla guardar={guardar} descartar={() => {}} />)

  tocar(ACCION_GUARDAR)

  expect(guardar).toHaveBeenCalledTimes(1)
})
