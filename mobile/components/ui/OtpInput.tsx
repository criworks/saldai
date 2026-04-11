import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';

export interface OtpInputProps {
  value: string;
  onChangeText: (val: string) => void;
  error?: boolean;
}

export function OtpInput({ value, onChangeText, error }: OtpInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isFocused) {
      setCursorVisible(true);
      interval = setInterval(() => {
        setCursorVisible((v) => !v);
      }, 500);
    } else {
      setCursorVisible(false);
    }
    return () => clearInterval(interval);
  }, [isFocused]);

  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < 6; i++) {
      const char = value[i];
      const isCurrent = i === value.length;
      
      let displayChar = '•';
      let colorClass = 'text-muted-foreground';
      
      if (char) {
        displayChar = char;
        colorClass = 'text-foreground';
      } else if (isCurrent && isFocused) {
        displayChar = '|';
        colorClass = cursorVisible ? 'text-foreground' : 'text-transparent';
      }

      dots.push(
        <Text key={i} className={`text-subtitle font-normal font-['Inter'] leading-[normal] ${colorClass}`}>
          {displayChar}
        </Text>
      );
    }
    return dots;
  };

  const borderClass = error 
    ? 'border-destructive' 
    : isFocused 
      ? 'border-muted-foreground' 
      : 'border-transparent';

  return (
    <View className="w-full relative justify-center">
      <Pressable 
        className={`w-full h-[56px] px-xl flex-row justify-center items-center gap-lg rounded-[16px] bg-secondary border-2 ${borderClass}`}
        onPress={() => inputRef.current?.focus()}
      >
        {renderDots()}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        maxLength={6}
        className="absolute w-[1px] h-[1px] opacity-0"
        autoFocus={true}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </View>
  );
}
