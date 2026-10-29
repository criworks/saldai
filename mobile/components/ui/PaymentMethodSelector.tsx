import { METODOS_VALIDOS } from '@saldai/core';
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Plus } from 'phosphor-react-native';

interface PaymentMethodSelectorProps {
  method: string;
  onSelectMethod: (method: string) => void;
}

export function PaymentMethodSelector({ method, onSelectMethod }: PaymentMethodSelectorProps) {
  return (
    <View className="flex-row items-center justify-end">
      <Pressable 
        className="bg-secondary rounded-full items-center justify-center w-xxl h-xxl mr-lg active:opacity-80"
        onPress={() => {}}
      >
        <Plus size={16} color="#60677D" />
      </Pressable>
      
      {METODOS_VALIDOS.map((m, index) => (
        <Pressable
          key={m}
          className={`${index < METODOS_VALIDOS.length - 1 ? 'mr-lg' : ''} active:opacity-80`}
          onPress={() => onSelectMethod(m)}
        >
          <Text className={`text-body ${method === m ? 'text-white font-bold' : 'text-muted-foreground'}`}>{m}</Text>
        </Pressable>
      ))}
    </View>
  );
}