import React from 'react';
import { Pressable } from 'react-native';
import { X } from 'phosphor-react-native';

export interface BotonLimpiarProps {
  onPress: () => void;
  /** Lo que lee un lector de pantalla. Cambia según qué input lo usa. */
  accessibilityLabel?: string;
}

/**
 * La "x" que borra todo lo escrito en un input.
 *
 * Vive acá y no dentro de un input en particular porque no sabe nada del
 * dominio: recibe el `onPress` y el que lo usa decide qué significa borrar.
 *
 * El `hitSlop` agranda el área de toque sin mover el icono: 18px es el tamaño
 * que pide el diseño y es bastante menos de lo que necesita un dedo.
 */
export function BotonLimpiar({
  onPress,
  accessibilityLabel = 'Borrar lo escrito',
}: BotonLimpiarProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID="boton-limpiar"
      className="active:opacity-60"
    >
      <X size={18} className="text-muted-foreground" weight="bold" />
    </Pressable>
  );
}
