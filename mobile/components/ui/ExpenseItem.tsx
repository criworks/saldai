import React from 'react';
import { Text, View } from 'react-native';

export interface ExpenseItemProps {
  id?: string;
  monto: string;
  metodoPago: string;
  emoji: string;
  titulo: string;
}

export function ExpenseItem({ monto, metodoPago, emoji, titulo }: ExpenseItemProps) {
  return (
    <View className="flex-row items-center justify-between">
      {/* Lado izquierdo: Emoji, Metodo, Titulo */}
      <View className="flex-row items-center gap-[12px] flex-shrink">
        <View className="bg-secondary rounded-full w-[32px] h-[32px] items-center justify-center">
          <Text className="text-body">{emoji}</Text>
        </View>

        <View className="bg-secondary rounded-full w-[32px] h-[32px] items-center justify-center">
          <Text className="text-muted-foreground text-detail font-medium">{metodoPago}</Text>
        </View>

        <Text 
          className="text-muted-foreground text-body font-regular flex-shrink" 
          numberOfLines={1} 
          ellipsizeMode="tail"
        >
          {titulo}
        </Text>
      </View>

      {/* Lado derecho: Monto */}
      <View className="bg-secondary rounded-full px-[16px] py-[8px] ml-auto">
        <Text className="text-primary text-body font-medium">{monto}</Text>
      </View>
    </View>
  );
}