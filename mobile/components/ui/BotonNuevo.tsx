import { Plus } from 'phosphor-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

export interface BotonNuevoProps {
  /** Lo que se crea: "Nueva categoría", "Nuevo método". */
  etiqueta: string;
  /**
   * Con la etiqueta a la vista o solo el `+`. Se muestra mientras la lista está
   * vacía, que es cuando hay que explicar para qué es el botón, y se esconde
   * una vez que hay elementos, porque ahí el `+` se entiende solo y la etiqueta
   * le roba lugar a la lista.
   */
  conEtiqueta?: boolean;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

/**
 * El botón de crear: un `+` redondo con su etiqueta al lado.
 *
 * No es una variante de `Button` porque no es la forma de un botón del
 * producto: es un círculo del color del texto con la etiqueta **afuera**, que
 * no es algo que `buttonVariants` pueda expresar sin un caso especial para el
 * texto y otro para el tamaño. Lo que sí comparte con todo lo demás son los
 * tokens.
 *
 * La etiqueta y el `+` son un solo `Pressable`: con el `+` tocable y la
 * etiqueta no, el objetivo de toque queda más chico de lo que se ve.
 */
export function BotonNuevo({
  etiqueta,
  conEtiqueta = true,
  onPress,
  disabled = false,
  testID,
}: BotonNuevoProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled }}
      testID={testID}
      className={`flex-row items-center gap-md ${disabled ? 'opacity-50' : 'active:opacity-80'}`}
    >
      {conEtiqueta && (
        <Text className="text-muted-foreground text-base font-normal leading-[normal]">
          {etiqueta}
        </Text>
      )}
      <View className="w-4xl h-4xl rounded-full bg-primary items-center justify-center">
        <Plus size={20} color={colors.bg} weight="bold" />
      </View>
    </Pressable>
  );
}
