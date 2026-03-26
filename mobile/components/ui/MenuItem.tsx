import { CaretRight } from 'phosphor-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

interface MenuItemProps {
  title: string;
  value?: string;
  onPress?: () => void;
  hideChevron?: boolean;
}

export function MenuItem({ title, value, onPress, hideChevron = false }: MenuItemProps) {
  return (
    <Pressable 
      onPress={onPress}
      className="flex-row items-center justify-between py-md w-full active:opacity-80"
    >
      <Text className="text-muted-foreground text-md font-normal leading-[normal]">
        {title}
      </Text>
      <View className="flex-row items-center gap-sm">
        {value ? (
          <Text className="text-foreground text-md font-medium leading-[normal]">
            {value}
          </Text>
        ) : null}
        {!hideChevron && <CaretRight size={18} color="#60677D" weight="regular" />}
      </View>
    </Pressable>
  );
}
