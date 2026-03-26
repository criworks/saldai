import { BellSimple, CardsThree, Nut, Plus } from 'phosphor-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFilter } from '../../contexts/FilterContext';

export function GradientFooter(props: BottomTabBarProps) {
  // Obtiene el safe area del dispositivo (notch en iOS, navigation bar en Android, etc.)
  const insets = useSafeAreaInsets();
  const safePaddingBottom = 24 + insets.bottom;

  // Averiguar qué ruta está activa
  const routeName = props.state.routeNames[props.state.index];
  const isGastosActive = routeName === 'index';
  const isCapturaActive = routeName === 'captura';
  const isCategoriasActive = routeName === 'categorias';
  const isConfiguracionesActive = routeName === 'configuraciones';

  // Alturas dinámicas para el gradiente
  let gradientHeight = 200;
  if (isGastosActive) gradientHeight = 280;
  else if (isConfiguracionesActive) gradientHeight = 160;
  else if (isCapturaActive) gradientHeight = 100;

  const { selectedCategory, setSelectedCategory, availableCategories } = useFilter();

  const handleCategoryPress = (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
    }
  };

  return (
    <View className="absolute bottom-0 left-0 right-0 pointer-events-box-none">
      <LinearGradient
        colors={['rgba(17,18,23,0)', 'rgba(17,18,23,0.95)', '#111217', '#111217']}
        locations={[0, 0.2, 0.7, 1]}
        className="justify-end"
        style={{
          height: gradientHeight,
          paddingBottom: safePaddingBottom
        }}
      >
        <View className="flex-col gap-[8px] px-[24px]">
          {/* Categories Row (Emojis - Opcional según data) */}
          {isGastosActive && availableCategories.length > 0 && (
            <View className="mb-[16px] -mx-[24px]">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 12 }}
              >
                {availableCategories.map((category) => {
                  const emoji = require('../../../packages/ui/tokens').EMOJIS_CAT[category] || require('../../../packages/ui/tokens').EMOJIS_CAT["Sin categoría"];
                  const isBgActive = selectedCategory === null || selectedCategory === category;
                  const bgClass = isBgActive ? 'bg-[#262A35]' : 'bg-transparent';

                  return (
                    <Pressable
                      key={category}
                      onPress={() => handleCategoryPress(category)}
                      className={`${bgClass} rounded-full w-[32px] h-[32px] items-center justify-center active:opacity-80`}
                    >
                      <Text className="text-[14px]">{emoji}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Filters Row (Centrado) */}
          {!isConfiguracionesActive && !isCapturaActive && (
            <View className="flex-row justify-center items-center w-full mb-[8px]">
              <Pressable
                className="bg-[#262A35] rounded-full px-[12px] py-[8px] active:opacity-80"
                onPress={() => props.navigation.navigate('index')}
              >
                <Text className="text-[#ffffff] text-[12px] font-normal leading-[14px]">
                  En curso
                </Text>
              </Pressable>
            </View>
          )}

          {/* Main Nav & FAB Row */}
          {!isCapturaActive && (
            <View className="flex-row justify-between items-center w-full">
              
              {/* Nav Group (Izquierda) */}
              <View className="flex-row items-center gap-[8px]">
                
                {/* Bell (Idle only for now) */}
                <Pressable className="w-[48px] h-[48px] items-center justify-center rounded-full active:opacity-80">
                  <BellSimple size={24} color="#60677D" weight="fill" />
                </Pressable>

                {/* Configuraciones Item */}
                <Pressable
                  className={`w-[48px] h-[48px] items-center justify-center rounded-full active:opacity-80 ${isConfiguracionesActive ? 'bg-[#262A35]' : ''}`}
                  onPress={() => props.navigation.navigate('configuraciones')}
                >
                  <Nut size={24} color={isConfiguracionesActive ? "#ffffff" : "#60677D"} weight="fill" />
                </Pressable>

                {/* Gastos Item */}
                <Pressable
                  className={`w-[48px] h-[48px] items-center justify-center rounded-full active:opacity-80 ${isGastosActive ? 'bg-[#262A35]' : ''}`}
                  onPress={() => props.navigation.navigate('index')}
                >
                  <CardsThree size={24} color={isGastosActive ? "#ffffff" : "#60677D"} weight="fill" />
                </Pressable>

              </View>

              {/* FAB Item (Derecha) */}
              <Pressable
                className="w-[48px] h-[48px] bg-[#ffffff] rounded-full items-center justify-center active:opacity-80"
                onPress={() => props.navigation.navigate('captura')}
              >
                <Plus size={24} color="#111217" weight="bold" />
              </Pressable>
              
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}
