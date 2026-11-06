import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Plus } from 'phosphor-react-native';
import { categoryEmoji, colors, NOMBRES_CATEGORIAS } from '@/constants/theme';

interface CategorySelectorProps {
  /** La categoría que el usuario confirmó. Vacía mientras no toque ninguna. */
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  /**
   * La categoría que el parser deduce de lo que se va escribiendo. Se muestra
   * atenuada mientras no haya una confirmada, y un tap sobre ella la confirma.
   */
  inferredCategory?: string;
}

/** Cómo se ve cada burbuja: confirmada, sugerida por el parser o ninguna. */
export type EstadoCategoria = 'confirmada' | 'sugerida' | 'normal';

export function estadoDeCategoria(
  categoria: string,
  confirmada: string,
  inferida?: string,
): EstadoCategoria {
  if (confirmada === categoria) return 'confirmada';
  // La sugerencia solo se muestra mientras el usuario no haya elegido: una vez
  // que confirma algo, la inferencia deja de importar.
  const hayConfirmada = (NOMBRES_CATEGORIAS as readonly string[]).includes(confirmada);
  if (!hayConfirmada && inferida === categoria) return 'sugerida';
  return 'normal';
}

const FONDO: Record<EstadoCategoria, string> = {
  confirmada: 'bg-white',
  sugerida: 'bg-white/30',
  normal: 'bg-secondary',
};

export function CategorySelector({ selectedCategory, onSelectCategory, inferredCategory }: CategorySelectorProps) {
  // Las categorías reales del catálogo. "Sin categoría" no se muestra como
  // opción: es lo que queda cuando ni el usuario ni el parser eligen.
  const categories = NOMBRES_CATEGORIAS;

  return (
    <View className="flex-row items-center justify-end mb-xl">
      {/* Limpia la elección: vuelve a mandar la sugerencia del parser. */}
      <Pressable
        className="bg-secondary rounded-full items-center justify-center w-xxl h-xxl mr-md active:opacity-80"
        onPress={() => onSelectCategory('')}
        accessibilityRole="button"
        accessibilityLabel="Quitar categoría elegida"
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
          const estado = estadoDeCategoria(cat, selectedCategory, inferredCategory);
          const isLast = index === arr.length - 1;
          return (
            <Pressable
              key={cat}
              // Tocar la confirmada la suelta y vuelve a la sugerencia; tocar
              // cualquier otra, la sugerida incluida, la confirma.
              onPress={() => onSelectCategory(estado === 'confirmada' ? '' : cat)}
              accessibilityRole="button"
              accessibilityLabel={estado === 'sugerida' ? `${cat}, sugerida` : cat}
              accessibilityState={{ selected: estado === 'confirmada' }}
              testID={`categoria-${cat}`}
              className={`rounded-full items-center justify-center w-xxl h-xxl ${!isLast ? 'mr-md' : ''} ${FONDO[estado]} active:opacity-80`}
            >
              <Text className="text-menu">{categoryEmoji(cat)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
