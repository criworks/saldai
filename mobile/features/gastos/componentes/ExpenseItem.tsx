import React from 'react';
import { View, Text } from 'react-native';

export interface ExpenseItemProps {
  id?: string;
  monto: string;
  titulo: string;
}

export function ExpenseItem({ monto, titulo }: ExpenseItemProps) {
  return (
    <View className="flex-row items-center gap-sm w-full">
      <View className="bg-secondary rounded-full px-md py-[6px] justify-center items-center">
        <Text className="text-foreground text-body font-medium leading-[normal]">{monto}</Text>
      </View>
      <Text className="text-muted-foreground text-body font-normal leading-[normal] flex-1" numberOfLines={1}>{titulo}</Text>
    </View>
  );
}
