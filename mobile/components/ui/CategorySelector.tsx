import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { EMOJIS_CAT } from '../../constants/theme';

interface CategorySelectorProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategorySelector({ selectedCategory, onSelectCategory }: CategorySelectorProps) {
  const categories = Object.keys(EMOJIS_CAT);

  return (
    <View className="flex-row items-center justify-end mb-[24px]">
      <Pressable 
        className="bg-[#262A35] rounded-full items-center justify-center w-[32px] h-[32px] mr-[12px] active:opacity-80"
        onPress={() => onSelectCategory('Sin categoría')}
      >
        <Feather name="plus" size={16} color="#60677D" />
      </Pressable>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center' }}
        className="flex-grow-0"
      >
        {categories.filter(cat => cat !== 'Sin categoría').map((cat, index, arr) => {
          const isSelected = selectedCategory === cat;
          const isLast = index === arr.length - 1;
          return (
            <Pressable 
              key={cat} 
              onPress={() => onSelectCategory(cat)}
              className={`rounded-full items-center justify-center w-[32px] h-[32px] ${!isLast ? 'mr-[12px]' : ''} ${isSelected ? 'bg-white' : 'bg-[#262A35]'} active:opacity-80`}
            >
              <Text className="text-[16px]">{EMOJIS_CAT[cat as keyof typeof EMOJIS_CAT]}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}