import React from 'react';
import { Text } from 'react-native';

interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <Text className="text-[#60677D] text-xs px-[24px] pt-[24px] pb-[8px]">
      {title}
    </Text>
  );
}
