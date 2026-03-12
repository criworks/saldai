import { Feather } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFilter } from '../../contexts/FilterContext';


export function GradientFooter(props: BottomTabBarProps) {
  // Obtiene el safe area del dispositivo (notch en iOS, navigation bar en Android, etc.)
  const insets = useSafeAreaInsets();

  // paddingBottomBase es el token de GEMINI.md,
  // le sumamos el margen de seguridad para los dispositivos con navegación en pantalla
  const safePaddingBottom = 24 + insets.bottom;

  // Averiguar qué ruta está activa
  const routeName = props.state.routeNames[props.state.index];
  const isGastosActive = routeName === 'index';
  const isCapturaActive = routeName === 'captura';
  const isCategoriasActive = routeName === 'categorias';
  const isConfiguracionesActive = routeName === 'configuraciones';

  // Altura dinámica: 280px para Gastos (con emojis), 200px para Categorías (sin emojis), 120px para Configuraciones
  let gradientHeight = 200;
  if (isGastosActive) gradientHeight = 280;
  else if (isConfiguracionesActive) gradientHeight = 120;

  const { selectedCategory, setSelectedCategory, availableCategories } = useFilter();

  const handleCategoryPress = (category: string) => {
    // Si ya está seleccionada, la deseleccionamos (volvemos a estado default = ver todo)
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
        // Eliminamos px-[24px] del wrapper padre para que el ScrollView de emojis pegue al borde de la pantalla
        className="justify-end"
        style={{
          height: gradientHeight,
          paddingBottom: safePaddingBottom
        }}
      >
        {/* Categories Row (Específico del Home, solo se muestra en 'Mes en curso' si hay data) */}
        {isGastosActive && availableCategories.length > 0 && (
          <View className="mb-[24px]">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              // flexGrow: 1 y justifyContent: 'center' es el patrón correcto en RN para:
              // - Centrar items si el contenido es menor al ancho del viewport.
              // - Alinear a la izquierda permitiendo scroll si es mayor al ancho del viewport.
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

        {/* Filters Row */}
        {!isConfiguracionesActive && (
          <View className="flex-row justify-center items-center gap-[24px] mb-[24px] px-[24px]">
            <Pressable
              className={`rounded-full px-[16px] py-[8px] active:opacity-80 ${isGastosActive ? 'bg-[#262A35]' : ''}`}
              onPress={() => props.navigation.navigate('index')}
            >
              <Text className={`text-sm font-regular ${isGastosActive ? 'text-[#ffffff]' : 'text-[#60677D]'}`}>
                Mes en curso
              </Text>
            </Pressable>

            <Pressable
              className={`rounded-full px-[16px] py-[8px] active:opacity-80 ${isCategoriasActive ? 'bg-[#262A35]' : ''}`}
              onPress={() => props.navigation.navigate('categorias')}
            >
              <Text className={`text-sm font-regular ${isCategoriasActive ? 'text-[#ffffff]' : 'text-[#60677D]'}`}>
                Categorías
              </Text>
            </Pressable>

            <Pressable className="active:opacity-80">
              <Text className="text-[#60677D] text-sm font-regular">Métodos</Text>
            </Pressable>
          </View>
        )}

        {/* Main Nav Row */}
        <View className="flex-row items-center justify-between px-[24px]">
          <View className="flex-row items-center gap-[24px]">
            {isConfiguracionesActive ? (
              <Pressable className="active:opacity-80" onPress={() => props.navigation.navigate('index')}>
                <Feather name="list" size={24} color="#60677D" />
              </Pressable>
            ) : (
              <Pressable
                className="active:opacity-80"
                onPress={() => props.navigation.navigate('configuraciones')}
              >
                <Feather name="settings" size={24} color="#60677D" />
              </Pressable>
            )}
            <Pressable className="active:opacity-80">
              <Feather name="bell" size={24} color="#60677D" />
            </Pressable>

            <Pressable
              className="bg-[#262A35] rounded-full px-[24px] py-[12px] active:opacity-80"
              onPress={() => {
                if (!isConfiguracionesActive) props.navigation.navigate('index');
              }}
            >
              <Text className="text-[#ffffff] text-sm font-regular">
                {isConfiguracionesActive ? 'Configuraciones' : 'Gastos'}
              </Text>
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      {/* FAB (+) */}
      {/* El botón de crear redirige a la pantalla "captura"
          También ajustamos el bottom dinámicamente para que flote sobre el tab principal */}
      {!isCapturaActive && (
        <Pressable
          className="absolute right-[24px] w-[56px] h-[56px] bg-[#ffffff] rounded-full items-center justify-center shadow-lg active:opacity-80"
          style={{ bottom: safePaddingBottom }}
          onPress={() => props.navigation.navigate('captura')}
        >
          <Feather name="plus" size={24} color="#111217" />
        </Pressable>
      )}
    </View>
  );
}
