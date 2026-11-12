import type { Metodo } from '@saldai/core';
import React from 'react';
import { Text, View } from 'react-native';
import { categoryEmoji, SIN_CATEGORIA } from '@/constants/theme';

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
 * "Sin categoría" no se dibuja. Es lo que queda cuando ni el usuario ni el
 * parser eligieron, igual que en el selector de la captura, y una burbuja en
 * cada fila que no tiene categoría es ruido y no información.
 */
export function ExpenseItem({ monto, titulo, categoria, metodo }: ExpenseItemProps) {
  const muestraCategoria = !!categoria && categoria !== SIN_CATEGORIA;

  return (
    <View className="flex-row items-center gap-sm w-full">
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
