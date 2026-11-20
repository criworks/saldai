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
  /**
   * Saca el chevron. Es para una fila que no lleva a ninguna parte: una con
   * `onPress` lo necesita, porque es lo único que dice que se puede entrar.
   */
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
 * puede llevar título, switch y navegación a la vez: el switch prende la
 * función y entrar a la fila la configura. Como son dos acciones distintas en
 * una fila, el switch se queda con su propio tap —`Pressable` sobre
 * `Pressable`, el de adentro gana— y **todo el resto del container navega**.
 *
 * **Dónde va el chevron depende de si la fila tiene switch**, y es el patrón
 * del diseño para una lista de switches que además navega:
 *
 * - Sin switch, va al final de la fila, que es donde se lo busca en una fila
 *   que no hace otra cosa.
 * - Con switch, va **pegado al título**. Al final quedaría al lado del switch,
 *   y entonces los dos controles de la fila se leerían como uno: parecería que
 *   el chevron es del switch o que tocar ahí lo conmuta. Junto al título dice
 *   qué es lo que lleva a otra parte.
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
  const llevaSwitch = switchValue !== undefined && !!onSwitchChange;
  const chevron = !hideChevron ? (
    <CaretRight size={18} color={colors.textMuted} weight="regular" />
  ) : null;

  const fila = (
    <View className="flex-row items-center justify-between py-md w-full">
      <View className="flex-row items-center gap-xs">
        <Text className="text-muted-foreground text-md font-normal leading-[normal]">
          {title}
        </Text>
        {llevaSwitch ? chevron : null}
      </View>
      <View className="flex-row items-center gap-sm">
        {value ? (
          <Text className="text-foreground text-md font-medium leading-[normal]">
            {value}
          </Text>
        ) : null}
        {llevaSwitch ? (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            disabled={switchDisabled}
            accessibilityLabel={title}
            testID={`switch-${title}`}
          />
        ) : null}
        {llevaSwitch ? null : chevron}
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
