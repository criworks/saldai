import type { Metodo } from '@saldai/core';
import { Alarm } from 'phosphor-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { categoryEmoji, colors, SIN_CATEGORIA } from '@/constants/theme';

export interface ExpenseItemProps {
  id?: string;
  monto: string;
  titulo: string;
  /**
   * La categoría del movimiento. Se omite para no mostrarla: quien usa el
   * componente decide según las preferencias del perfil, y así la fila no
   * depende de una consulta.
   */
  categoria?: string;
  /** El método de pago. Se omite igual que la categoría. */
  metodo?: Metodo;
  /**
   * El movimiento nace de un plan de recurrencia, o es una propuesta de uno.
   * Dibuja el reloj adelante.
   */
  recurrente?: boolean;
}

/**
 * Una fila del listado del mes: el monto, las burbujas de categoría y método, y
 * el item.
 *
 * Las dos burbujas van entre el monto y el item, como en el diseño. Son
 * opcionales porque las dos funciones se prenden y se apagan por perfil, y la
 * decisión se toma en la pantalla: la fila recibe lo que tiene que mostrar, sin
 * saber de preferencias ni pedirlas. Así el playground la puede dibujar en sus
 * cuatro combinaciones sin montar la consulta.
 *
 * El reloj adelante marca lo que viene de un plan, y lo marca igual en una
 * propuesta por confirmar y en un movimiento ya registrado. Es a propósito: si
 * el usuario marca como recurrente algo de hace tres meses, las propuestas de
 * los meses intermedios conviven en el feed con los movimientos que él cargó a
 * mano en su momento, y el reloj es lo que le deja ver cuál es cuál antes de
 * confirmar algo repetido.
 *
 * "Sin categoría" no se dibuja. Es lo que queda cuando ni el usuario ni el
 * parser eligieron, igual que en el selector de la captura, y una burbuja en
 * cada fila que no tiene categoría es ruido y no información.
 */
export function ExpenseItem({ monto, titulo, categoria, metodo, recurrente }: ExpenseItemProps) {
  const muestraCategoria = !!categoria && categoria !== SIN_CATEGORIA;

  return (
    <View className="flex-row items-center gap-sm w-full">
      {recurrente && (
        // El ícono de phosphor no acepta props de accesibilidad, así que la
        // etiqueta va en la View que lo envuelve.
        <View accessibilityLabel="Recurrente" testID="fila-recurrente">
          <Alarm size={16} color={colors.warning} />
        </View>
      )}

      <View className="bg-secondary rounded-full px-md py-[6px] justify-center items-center">
        <Text className="text-foreground text-body font-medium leading-[normal]">{monto}</Text>
      </View>

      {muestraCategoria && (
        <View
          accessibilityLabel={categoria}
          testID={`fila-categoria-${categoria}`}
          className="bg-secondary rounded-full w-xxl h-xxl justify-center items-center"
        >
          <Text className="text-body">{categoryEmoji(categoria)}</Text>
        </View>
      )}

      {!!metodo && (
        <View
          accessibilityLabel={metodo}
          testID={`fila-metodo-${metodo}`}
          className="bg-secondary rounded-full px-md py-[6px] justify-center items-center"
        >
          <Text className="text-muted-foreground text-detail font-medium leading-[normal]">
            {metodo}
          </Text>
        </View>
      )}

      <Text className="text-muted-foreground text-body font-normal leading-[normal] flex-1" numberOfLines={1}>{titulo}</Text>
    </View>
  );
}
