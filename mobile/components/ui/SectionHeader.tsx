import React from 'react';
import { Text } from 'react-native';

interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <Text className="text-muted-foreground text-base font-normal leading-[normal] pt-lg pb-sm w-full text-left">
      {title}
    </Text>
  );
}
