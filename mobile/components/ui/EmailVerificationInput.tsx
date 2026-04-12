import React, { useState } from 'react';
import { View } from 'react-native';
import { Input } from './Input';
import { Clock, PencilSimple } from 'phosphor-react-native';

export interface EmailVerificationInputProps {
  value: string;
  onChangeText: (text: string) => void;
  isVerifying: boolean;
  isEditing?: boolean;
}

export function EmailVerificationInput({ value, onChangeText, isVerifying, isEditing }: EmailVerificationInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="w-full relative justify-center">
      <Input 
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="tu@email.com"
        editable={true}
        className={`w-full pr-4xl ${(isEditing || isFocused) ? 'border-2 border-muted-foreground' : 'border border-transparent'} ${(isVerifying && !isFocused) ? 'text-muted-foreground' : ''}`}
      />
      <View className="absolute right-lg pointer-events-none">
        {(isVerifying && !isFocused) ? (
          <Clock size={18} color="#ffffff" weight="fill" />
        ) : (
          <PencilSimple size={18} className="text-muted-foreground" weight="fill" />
        )}
      </View>
    </View>
  );
}
