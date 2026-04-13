import { BellSimple, CardsThree, Nut, Plus, Check } from 'phosphor-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState, useRef } from 'react';
import { Pressable, ScrollView, Text, View, Keyboard, Platform, DeviceEventEmitter } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFilter } from '../../contexts/FilterContext';
import { useGastos } from '../../hooks/useGastos';

export function GradientFooter(props: BottomTabBarProps) {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      setKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      hideTimeoutRef.current = setTimeout(() => {
        setKeyboardVisible(false);
      }, 50);
    });

    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const insets = useSafeAreaInsets();
  const safePaddingBottom = 24 + insets.bottom;

  const { mes, setMes } = useGastos();
  const currentCalendarMonth = new Date().getMonth() + 1;

  const routeName = props.state.routeNames[props.state.index];
  const isGastosActive = routeName === 'index' || routeName === 'meses';
  const isMesesViewActive = routeName === 'meses';
  const isCapturaActive = routeName === 'captura';
  const isCategoriasActive = routeName === 'categorias';
  const isConfiguracionesActive = routeName === 'configuraciones';
  const isCuentaActive = routeName === 'cuenta';
  const isEnCursoActive = routeName === 'index' && mes === currentCalendarMonth;

  if (isKeyboardVisible) {
    return null;
  }

  const { selectedCategory, setSelectedCategory, availableCategories } = useFilter();

  const handleCategoryPress = (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
    }
  };

  // El gradiente (fade) solo es necesario si estamos en la vista principal (index)
  // ya que es la única que tiene scroll largo con items que necesitan el efecto fade-out
  // y que tiene filas extras (categorías, filtro "En curso").
  const hasSubmenus = isGastosActive;

  const content = (
    <View className="flex-col gap-sm px-xl">
      {/* Categories Row (Emojis) */}
      {isGastosActive && !isMesesViewActive && availableCategories.length > 0 && (
        <View className="mb-lg -mx-xl">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 12 }}
          >
            {availableCategories.map((category) => {
              const emoji = require('../../../packages/ui/tokens').EMOJIS_CAT[category] || require('../../../packages/ui/tokens').EMOJIS_CAT["Sin categoría"];
              const isBgActive = selectedCategory === null || selectedCategory === category;
              const bgClass = isBgActive ? 'bg-secondary' : 'bg-transparent';

              return (
                <Pressable
                  key={category}
                  onPress={() => handleCategoryPress(category)}
                  className={`${bgClass} rounded-full w-xxl h-xxl items-center justify-center active:opacity-80`}
                >
                  <Text className="text-body">{emoji}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Filters Row (Centrado) */}
      {!isConfiguracionesActive && !isCapturaActive && !isCuentaActive && (
        <View className="flex-row justify-center items-center w-full mb-sm">
          <Pressable
            className={`rounded-full px-md py-sm active:opacity-80 ${isEnCursoActive ? 'bg-secondary' : 'bg-transparent'}`}
            onPress={() => {
              setMes(currentCalendarMonth);
              props.navigation.navigate('index');
            }}
          >
            <Text className={`${isEnCursoActive ? 'text-foreground' : 'text-muted-foreground'} text-detail font-normal leading-[14px]`}>
              En curso
            </Text>
          </Pressable>
        </View>
      )}

      {/* Main Nav & FAB Row */}
      <View className="flex-row justify-between items-center w-full">
        
        {/* Nav Group (Izquierda) */}
        <View className="flex-row items-center gap-sm">
          
          {/* Bell (Idle only for now) */}
          <Pressable className="w-4xl h-4xl items-center justify-center rounded-full active:opacity-80">
            <BellSimple size={24} className="text-muted-foreground" weight="fill" />
          </Pressable>

          {/* Configuraciones Item */}
          <Pressable
            className={`w-4xl h-4xl items-center justify-center rounded-full active:opacity-80 ${isConfiguracionesActive ? 'bg-secondary' : ''}`}
            onPress={() => props.navigation.navigate('configuraciones')}
          >
            <Nut size={24} className={isConfiguracionesActive ? "text-foreground" : "text-muted-foreground"} weight="fill" />
          </Pressable>

          {/* Gastos Item */}
          <Pressable
            className={`w-4xl h-4xl items-center justify-center rounded-full active:opacity-80 ${isGastosActive ? 'bg-secondary' : ''}`}
            onPress={() => props.navigation.navigate('index')}
          >
            <CardsThree size={24} className={isGastosActive ? "text-foreground" : "text-muted-foreground"} weight="fill" />
          </Pressable>

        </View>

        {/* FAB Item (Derecha) */}
        {isCapturaActive ? (
          <Pressable
            className="bg-primary rounded-full items-center justify-center active:opacity-80 px-8 py-3"
            onPress={() => DeviceEventEmitter.emit('submitCaptura')}
          >
            <Check size={24} className="text-primary-foreground" weight="bold" />
          </Pressable>
        ) : (
          <Pressable
            className="w-4xl h-4xl bg-primary rounded-full items-center justify-center active:opacity-80"
            onPress={() => props.navigation.navigate('captura')}
          >
            <Plus size={24} className="text-primary-foreground" weight="bold" />
          </Pressable>
        )}
        
      </View>
    </View>
  );

  return (
    <View className="absolute bottom-0 left-0 right-0 pointer-events-box-none">
      {hasSubmenus ? (
        <LinearGradient
          colors={['rgba(17,18,23,0)', 'rgba(17,18,23,0.95)', '#111217', '#111217']}
          locations={[0, 0.2, 0.7, 1]}
          className="justify-end w-full"
          style={{
            paddingTop: 80, // Espacio superior para crear el efecto fade largo
            paddingBottom: safePaddingBottom
          }}
        >
          {content}
        </LinearGradient>
      ) : (
        <View 
          className="justify-end w-full bg-background"
          style={{
            paddingTop: 24, // Padding estándar sólido superior
            paddingBottom: safePaddingBottom
          }}
        >
          {content}
        </View>
      )}
    </View>
  );
}
