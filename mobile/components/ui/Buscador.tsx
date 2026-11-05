import { MagnifyingGlass, X } from 'phosphor-react-native';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { BotonLimpiar } from './BotonLimpiar';
import { Input } from './Input';

export interface BuscadorProps {
  /** El título de la pantalla, que comparte fila con la lupa. */
  titulo: string;
  /** Lo que se busca. El texto lo guarda quien lo usa, que es quien filtra. */
  texto: string;
  onTexto: (texto: string) => void;
  placeholder?: string;
  /** Lo que lee un lector de pantalla sobre el campo. */
  accessibilityLabel?: string;
  /** Prefijo de los testID: `${testID}-boton` y `${testID}-campo`. */
  testID?: string;
}

/**
 * La cabecera de una pantalla que se puede buscar: el título, la lupa que abre
 * el campo, y el campo con su "x".
 *
 * Incluye el título porque la lupa va en la misma fila y el campo debajo, así
 * que el abierto/cerrado afecta a las dos filas: si el componente fuera solo el
 * campo, cada pantalla tendría que llevar el estado y acomodar las dos filas
 * por su cuenta, que es justo lo que termina distinto de una pantalla a otra.
 *
 * El texto no se guarda acá. Quien lo usa es quien filtra, y si el estado
 * viviera adentro tendría que avisar hacia afuera en cada tecla, que es el
 * mismo estado en dos lugares. Lo que sí es de acá es si está abierto, que no
 * le importa a nadie más.
 *
 * Cerrar la búsqueda vacía el texto: dejar un filtro puesto con el campo
 * escondido es una lista que miente y no dice por qué.
 */
export function Buscador({
  titulo,
  texto,
  onTexto,
  placeholder,
  accessibilityLabel,
  testID = 'buscador',
}: BuscadorProps) {
  const [abierto, setAbierto] = useState(false);

  const alternar = () => {
    if (abierto) onTexto('');
    setAbierto(!abierto);
  };

  return (
    <View className="px-xl pt-3xl pb-lg gap-lg">
      <View className="flex-row items-center justify-between w-full">
        <Text className="text-foreground text-xl font-normal leading-[normal]">{titulo}</Text>
        <Pressable
          onPress={alternar}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={abierto ? 'Cerrar el buscador' : `Buscar en ${titulo}`}
          testID={`${testID}-boton`}
          className="w-4xl h-4xl rounded-full bg-card items-center justify-center active:opacity-80"
        >
          {abierto ? (
            <X size={20} color={colors.text} weight="regular" />
          ) : (
            <MagnifyingGlass size={20} color={colors.text} weight="regular" />
          )}
        </Pressable>
      </View>

      {abierto && (
        <Input
          value={texto}
          onChangeText={onTexto}
          placeholder={placeholder}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel={accessibilityLabel ?? `Busca en ${titulo}`}
          testID={`${testID}-campo`}
          iconoDerecha={
            texto ? (
              <BotonLimpiar onPress={() => onTexto('')} accessibilityLabel="Borrar la búsqueda" />
            ) : undefined
          }
        />
      )}
    </View>
  );
}
