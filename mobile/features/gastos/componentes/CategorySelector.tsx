import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Plus } from 'phosphor-react-native';
import { categoryEmoji, colors, NOMBRES_CATEGORIAS, SIN_CATEGORIA } from '@/constants/theme';

interface CategorySelectorProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategorySelector({ selectedCategory, onSelectCategory }: CategorySelectorProps) {
  // Las categorías reales del catálogo. "Sin categoría" no se muestra como
  // opción: es lo que queda al tocar el botón de limpiar.
  const categories = NOMBRES_CATEGORIAS;

  return (
    <View className="flex-row items-center justify-end mb-xl">
      <Pressable 
        className="bg-secondary rounded-full items-center justify-center w-xxl h-xxl mr-md active:opacity-80"
        onPress={() => onSelectCategory(SIN_CATEGORIA)}
      >
        <Plus size={16} color={colors.textMuted} />
      </Pressable>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center' }}
        className="flex-grow-0"
      >
        {categories.map((cat, index, arr) => {
          const isSelected = selectedCategory === cat;
          const isLast = index === arr.length - 1;
          return (
            <Pressable 
              key={cat} 
              onPress={() => onSelectCategory(cat)}
              className={`rounded-full items-center justify-center w-xxl h-xxl ${!isLast ? 'mr-md' : ''} ${isSelected ? 'bg-white' : 'bg-secondary'} active:opacity-80`}
            >
              <Text className="text-menu">{categoryEmoji(cat)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}