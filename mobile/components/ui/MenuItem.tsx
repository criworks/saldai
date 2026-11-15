import { CaretRight } from 'phosphor-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { Switch } from './Switch';

interface MenuItemProps {
  title: string;
  /**
   * Una línea debajo del título que dice para qué sirve la fila. Va acá y no
   * en un componente aparte porque es la misma fila: el switch tiene que
   * quedar alineado con el título y no con el bloque entero.
   */
  descripcion?: string;
  value?: string;
  onPress?: () => void;
  hideChevron?: boolean;
  /**
   * Si va, la fila lleva un switch antes del chevron. `undefined` es una fila
   * sin switch, que no es lo mismo que una con el switch apagado.
   */
  switchValue?: boolean;
  onSwitchChange?: (valor: boolean) => void;
  /** Mientras el cambio viaja a la API: el switch no acepta taps. */
  switchDisabled?: boolean;
}

/**
 * Una fila del menú de configuraciones.
 *
 * El switch va acá y no en una fila aparte porque en el diseño la misma fila
 * puede llevar título, switch y chevron a la vez: el switch prende la función y
 * el chevron entra a configurarla. Como son dos acciones distintas en una
 * fila, el switch se queda con su propio tap —`Pressable` sobre `Pressable`, el
 * de adentro gana— y el resto de la fila navega.
 */
export function MenuItem({
  title,
  descripcion,
  value,
  onPress,
  hideChevron = false,
  switchValue,
  onSwitchChange,
  switchDisabled,
}: MenuItemProps) {
  const fila = (
    <View className="flex-row items-center justify-between py-md w-full">
      <Text className="text-muted-foreground text-md font-normal leading-[normal]">
        {title}
      </Text>
      <View className="flex-row items-center gap-sm">
        {value ? (
          <Text className="text-foreground text-md font-medium leading-[normal]">
            {value}
          </Text>
        ) : null}
        {switchValue !== undefined && onSwitchChange ? (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            disabled={switchDisabled}
            accessibilityLabel={title}
            testID={`switch-${title}`}
          />
        ) : null}
        {!hideChevron && <CaretRight size={18} color={colors.textMuted} weight="regular" />}
      </View>
    </View>
  );

  const contenido = (
    <>
      {fila}
      {descripcion ? (
        <Text className="text-muted-foreground text-detail font-normal leading-[normal] w-full">
          {descripcion}
        </Text>
      ) : null}
    </>
  );

  // Sin `onPress` la fila no navega a ningún lado, así que tampoco se pinta al
  // tocarla: un `active:opacity-80` que no lleva a nada se lee como un botón
  // roto. El switch, cuando va, sigue teniendo su propio tap.
  if (!onPress) {
    return <View className="w-full">{contenido}</View>;
  }

  return (
    <Pressable onPress={onPress} className="w-full active:opacity-80">
      {contenido}
    </Pressable>
  );
}
