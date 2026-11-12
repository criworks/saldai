import { ArrowLeft, BellSimple, CardsThree, Nut, Plus, Check } from 'phosphor-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, Text, View, DeviceEventEmitter } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TODAS_LAS_CATEGORIAS } from '@saldai/core';
import { categoryEmoji, colors, withAlpha } from '@/constants/theme';
import { usePreferencias } from '@/features/perfil';
import { useFilter } from '../FilterContext';
import { useMovimientos } from '../MovimientosContext';

export function GradientFooter(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const safePaddingBottom = 24 + insets.bottom;

  const { mes, setMes, categorias } = useMovimientos();
  const { categoriasVisibles } = usePreferencias();
  const { selectedCategory, setSelectedCategory } = useFilter();

  // Las categorías que de verdad tiene el mes, en el orden del catálogo y no
  // por monto: ordenadas por lo gastado, las burbujas se reacomodan debajo del
  // dedo cada vez que entra un movimiento.
  const categoriasDelMes = useMemo(
    () => TODAS_LAS_CATEGORIAS.filter((cat) => categorias.some(([nombre]) => nombre === cat)),
    [categorias],
  );

  // Al cambiar de mes el filtro se suelta: una categoría que el mes nuevo no
  // tiene dejaría el listado vacío, y la burbuja para soltarlo tampoco estaría.
  useEffect(() => {
    setSelectedCategory(null);
  }, [mes, setSelectedCategory]);

  // El footer no se desmonta cuando sube el teclado: se va animado contra la
  // misma curva del sistema que mueve el form en captura. Un `return null`
  // no puede animar su salida, y ahí estaba el salto que se veía.
  const { progress } = useReanimatedKeyboardAnimation();
  const alto = useSharedValue(0);
  const medirAlto = (e: LayoutChangeEvent) => {
    alto.value = e.nativeEvent.layout.height;
  };
  const estiloSalida = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * alto.value }],
    opacity: 1 - progress.value,
  }));
  const currentCalendarMonth = new Date().getMonth() + 1;

  const routeName = props.state.routeNames[props.state.index];
  const isListaActive = routeName === 'index';
  const isMesesViewActive = routeName === 'meses';
  const isPorCategoriaActive = routeName === 'por-categoria';
  // Las tres son la misma sección: el mes que se está mirando. El footer les
  // deja el icono encendido y el degradado.
  const isMovimientosActive = isListaActive || isMesesViewActive || isPorCategoriaActive;
  const isCapturaActive = routeName === 'captura';
  const isConfiguracionesActive = routeName === 'configuraciones';
  const isCuentaActive = routeName === 'cuenta';
  // Las pantallas a las que solo se entra desde configuraciones: el footer les
  // cambia los tres iconos por una flecha de volver, porque desde ahí la única
  // navegación que tiene sentido es salir.
  const esPantallaDeAjuste = routeName === 'zona-horaria';
  const isEnCursoActive = routeName === 'index' && mes === currentCalendarMonth;

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
  const hasSubmenus = isMovimientosActive;

  const content = (
    <View className="flex-col gap-sm px-xl">
      {/* Categories Row (Emojis) */}
      {/*
        Las burbujas filtran el listado, así que van solo sobre el listado: en
        el desglose por categoría cada fila ya es una categoría, y en la lista
        de meses no hay nada que filtrar.
      */}
      {categoriasVisibles && isListaActive && categoriasDelMes.length > 0 && (
        <View className="mb-lg -mx-xl">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 12 }}
          >
            {categoriasDelMes.map((category) => {
              const emoji = categoryEmoji(category);
              const isBgActive = selectedCategory === null || selectedCategory === category;
              const bgClass = isBgActive ? 'bg-secondary' : 'bg-transparent';

              return (
                <Pressable
                  key={category}
                  // Un emoji solo no se lee: el nombre de la categoría va en la
                  // etiqueta, y el estado dice si está filtrando por ella.
                  accessibilityRole="button"
                  accessibilityLabel={category}
                  accessibilityState={{ selected: selectedCategory === category }}
                  testID={`filtro-${category}`}
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
      {!isConfiguracionesActive && !isCapturaActive && !isCuentaActive && !esPantallaDeAjuste && (
        <View className="flex-row justify-center items-center w-full mb-sm gap-sm">
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

          {/*
            Cambia entre los movimientos del mes y el mismo mes sumado por
            categoría, sin tocar qué mes se mira: desde un mes pasado se ve su
            desglose igual que el del mes en curso. Vuelve a tocarlo y se
            vuelve al listado, así el chip es el camino de ida y de vuelta.
          */}
          {categoriasVisibles && (
            <Pressable
              accessibilityRole="button"
              testID="chip-categorias"
              className={`rounded-full px-md py-sm active:opacity-80 ${isPorCategoriaActive ? 'bg-secondary' : 'bg-transparent'}`}
              onPress={() =>
                props.navigation.navigate(isPorCategoriaActive ? 'index' : 'por-categoria')
              }
            >
              <Text className={`${isPorCategoriaActive ? 'text-foreground' : 'text-muted-foreground'} text-detail font-normal leading-[14px]`}>
                Categorías
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Main Nav & FAB Row */}
      <View className="flex-row justify-between items-center w-full">
        
        {/* Nav Group (Izquierda) */}
        {esPantallaDeAjuste ? (
          <Pressable
            className="w-4xl h-4xl items-center justify-center rounded-full active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Volver a configuraciones"
            onPress={() => props.navigation.navigate('configuraciones')}
          >
            {/*
              El color va por prop y no por `className` como los otros iconos
              del footer: los demás son `weight="fill"` y NativeWind les llega
              por el color del texto, pero un icono `regular` de phosphor es un
              trazo con `fill="none"`, así que la clase no lo pinta y la flecha
              salía negra sobre el fondo oscuro. Con `bold` además pesa lo mismo
              que los iconos rellenos de al lado.
            */}
            <ArrowLeft size={24} color={colors.textMuted} weight="bold" />
          </Pressable>
        ) : (
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

          {/* Movimientos Item */}
          <Pressable
            className={`w-4xl h-4xl items-center justify-center rounded-full active:opacity-80 ${isMovimientosActive ? 'bg-secondary' : ''}`}
            onPress={() => props.navigation.navigate('index')}
          >
            <CardsThree size={24} className={isMovimientosActive ? "text-foreground" : "text-muted-foreground"} weight="fill" />
          </Pressable>

        </View>
        )}

        {/*
          FAB Item (Derecha). No va en una pantalla de ajuste: ahí la única
          acción es volver, y un `+` que salta a la captura deja a medias lo
          que el usuario estaba configurando.
        */}
        {esPantallaDeAjuste ? null : isCapturaActive ? (
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
    <Animated.View
      onLayout={medirAlto}
      style={estiloSalida}
      className="absolute bottom-0 left-0 right-0 pointer-events-box-none"
    >
      {hasSubmenus ? (
        <LinearGradient
          // El fondo de la app, de transparente a opaco, para que el footer
          // se funda con la pantalla en vez de cortarla.
          colors={[withAlpha(colors.bg, 0), withAlpha(colors.bg, 0.95), colors.bg, colors.bg]}
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
    </Animated.View>
  );
}
