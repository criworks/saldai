import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Plus } from 'phosphor-react-native';
import { EMOJIS_CAT } from '../../constants/theme';

interface CategorySelectorProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategorySelector({ selectedCategory, onSelectCategory }: CategorySelectorProps) {
  const categories = Object.keys(EMOJIS_CAT);

  return (
    <View className="flex-row items-center justify-end mb-xl">
      <Pressable 
        className="bg-secondary rounded-full items-center justify-center w-xxl h-xxl mr-md active:opacity-80"
        onPress={() => onSelectCategory('Sin categoría')}
      >
        <Plus size={16} color="#60677D" />
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
              className={`rounded-full items-center justify-center w-xxl h-xxl ${!isLast ? 'mr-md' : ''} ${isSelected ? 'bg-white' : 'bg-secondary'} active:opacity-80`}
            >
              <Text className="text-menu">{EMOJIS_CAT[cat as keyof typeof EMOJIS_CAT]}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}