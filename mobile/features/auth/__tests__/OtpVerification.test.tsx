import { render, screen } from '@testing-library/react-native'
import React from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { OtpVerification } from '../componentes/OtpVerification'

/**
 * `Alert` llama `useSafeAreaInsets()` sin condición, incluso cuando es inline y
 * no los usa, así que sin provider no renderiza. Las métricas van a mano porque
 * en un test no hay ventana de la que sacarlas.
 */
const metricas = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
}

const renderizar = (ui: React.ReactElement) =>
  render(<SafeAreaProvider initialMetrics={metricas}>{ui}</SafeAreaProvider>)

const props = {
  message: 'Ingresa el código de 6 dígitos que enviamos a tu email.',
  otp: '',
  onOtpChange: () => {},
  onResend: () => {},
}

test('por defecto el aviso sigue con el reloj', () => {
  // Es el caso de cambiar el email de una cuenta que ya existe (cuenta.tsx),
  // que no pasa `alertType`: si este test se cae, ese flujo cambió sin querer.
  renderizar(<OtpVerification {...props} />)
  expect(screen.getByTestId('alerta-icono-pending')).toBeTruthy()
})

test('el flujo de crear cuenta pide el buzón', () => {
  renderizar(<OtpVerification {...props} alertType="mailbox" />)
  expect(screen.getByTestId('alerta-icono-mailbox')).toBeTruthy()
  expect(screen.queryByTestId('alerta-icono-pending')).toBeNull()
})
