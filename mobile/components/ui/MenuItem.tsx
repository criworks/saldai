import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

interface MenuItemProps {
  title: string;
  value?: string;
  onPress?: () => void;
}

export function MenuItem({ title, value, onPress }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between px-[24px] h-[64px] active:opacity-80"
    >
      <Text className="text-primary text-body">{title}</Text>
      <View className="flex-row items-center gap-[8px]">
        {value ? <Text className="text-muted-foreground text-body font-medium">{value}</Text> : null}
        <Feather name="chevron-right" size={16} color="#60677D" />
      </View>
    </Pressable>
  );
}