import React from 'react';
import { Pressable, View } from 'react-native';

export interface SwitchProps {
  /** Si está prendido. El componente no guarda estado: lo decide quien lo usa. */
  value: boolean;
  onValueChange: (valor: boolean) => void;
  /** Mientras se guarda: se ve igual pero no acepta taps. */
  disabled?: boolean;
  /** Lo que lee un lector de pantalla. Sin esto el switch no dice de qué es. */
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * El interruptor de las preferencias.
 *
 * No se usa el `Switch` de React Native porque en Android pinta la pista y el
 * botón con los colores del sistema, no con los del producto: en el fondo
 * oscuro de Saldai el apagado quedaba casi invisible. Son dos `View` y un
 * `Pressable`, con los colores saliendo de los tokens.
 *
 * Prendido es la pista blanca (`primary`) con el botón del color del fondo, que
 * es la misma inversión que usa el botón primario. Apagado es la pista gris
 * (`secondary`) con el botón atenuado.
 *
 * Sin animación: el cambio viaja a la API y vuelve, así que lo que se ve es el
 * estado confirmado. Una transición de 150ms sobre algo que puede tardar 300
 * en confirmarse se lee como que el switch se movió solo.
 *
 * Las tres medidas están escritas acá y no en `packages/ui/tokens.js` porque
 * son la definición del switch, no una medida compartida: este es el único
 * archivo que las usa, y un token para un solo consumidor es la abstracción que
 * las convenciones del repo piden no inventar. Si un día otro componente
 * necesita la misma pista, ahí sí suben a los tokens.
 */
export function Switch({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
  testID,
}: SwitchProps) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      className={`w-[44px] h-[26px] rounded-full justify-center px-[3px] ${
        value ? 'bg-primary' : 'bg-secondary'
      } ${disabled ? 'opacity-50' : 'active:opacity-80'}`}
    >
      <View
        className={`w-[20px] h-[20px] rounded-full ${
          value ? 'bg-background self-end' : 'bg-muted-foreground self-start'
        }`}
      />
    </Pressable>
  );
}
