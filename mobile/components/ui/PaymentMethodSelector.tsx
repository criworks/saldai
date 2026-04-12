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
      
      <Pressable 
        className="mr-lg active:opacity-80"
        onPress={() => onSelectMethod('EF')}
      >
        <Text className={`text-body ${method === 'EF' ? 'text-white font-bold' : 'text-muted-foreground'}`}>EF</Text>
      </Pressable>
      
      <Pressable 
        className="active:opacity-80"
        onPress={() => onSelectMethod('TC')}
      >
        <Text className={`text-body ${method === 'TC' ? 'text-white font-bold' : 'text-muted-foreground'}`}>TC</Text>
      </Pressable>
    </View>
  );
}