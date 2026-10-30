import { Bell } from 'phosphor-react-native';
import React from 'react';
import { Pressable, ScrollView, Text, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Path, Mask, LinearGradient, Stop, G, Defs } from 'react-native-svg';
import { colors } from '../../constants/theme';

// Custom Illustration Component based on provided SVG
function CategoriasIllustration() {
  return (
    <View className="w-full aspect-[316/134] max-h-[134px]">
      <Svg width="100%" height="100%" viewBox="0 0 316 134" fill="none">
        <Mask id="mask0_2041_2684" maskUnits="userSpaceOnUse" x="0" y="0" width="316" height="134">
          <Rect width="316" height="134" fill="url(#paint0_linear_2041_2684)" />
        </Mask>
        <G mask="url(#mask0_2041_2684)">
          <Rect y="6.92773" width="43.4945" height="43.4945" rx="21.7473" fill={colors.bgElevated} />
          <Path d="M33.4658 28.6758C33.4658 29.0487 33.3177 29.4064 33.0539 29.6701C32.7902 29.9339 32.4325 30.082 32.0596 30.082H23.1533V38.9883C23.1533 39.3612 23.0052 39.7189 22.7414 39.9826C22.4777 40.2464 22.12 40.3945 21.7471 40.3945C21.3741 40.3945 21.0164 40.2464 20.7527 39.9826C20.489 39.7189 20.3408 39.3612 20.3408 38.9883V30.082H11.4346C11.0616 30.082 10.7039 29.9339 10.4402 29.6701C10.1765 29.4064 10.0283 29.0487 10.0283 28.6758C10.0283 28.3028 10.1765 27.9451 10.4402 27.6814C10.7039 27.4177 11.0616 27.2695 11.4346 27.2695H20.3408V18.3633C20.3408 17.9903 20.489 17.6326 20.7527 17.3689C21.0164 17.1052 21.3741 16.957 21.7471 16.957C22.12 16.957 22.4777 17.1052 22.7414 17.3689C23.0052 17.6326 23.1533 17.9903 23.1533 18.3633V27.2695H32.0596C32.4325 27.2695 32.7902 27.4177 33.0539 27.6814C33.3177 27.9451 33.4658 28.3028 33.4658 28.6758Z" fill={colors.textMuted} />
          <Rect x="55.4941" width="57.989" height="57.3517" rx="28.6758" fill={colors.bgElevated} />
          <Path d="M69.6256 42.3012H99.9883V11.9385H69.6256V42.3012Z" fill="white" />
          <Path d="M139.615 43.8012H169.978V13.4385H139.615V43.8012Z" fill="white" />
          <Path d="M209.604 43.8012H239.967V13.4385H209.604V43.8012Z" fill="white" />
          <Path d="M279.593 43.8012H309.956V13.4385H279.593V43.8012Z" fill="white" />
          <Rect x="34" y="90.5" width="65" height="33" rx="16.5" fill={colors.bgElevated} />
          {/* Omitted the extremely long complex vector letters (words like Categories) for stability, replaced with a simplified representation line */}
          <Rect x="44" y="103" width="45" height="8" rx="4" fill={colors.textMuted} />
          <Rect x="107" y="90" width="34" height="34" rx="17" fill={colors.bgElevated} />
          <Path d="M115 115.26H133V97.26H115V115.26Z" fill="white" />
          <Rect x="150" y="103" width="105" height="8" rx="4" fill={colors.textMuted} />
        </G>
        <Defs>
          <LinearGradient id="paint0_linear_2041_2684" x1="0" y1="67" x2="316" y2="67" gradientUnits="userSpaceOnUse">
            <Stop stopColor="white" />
            <Stop offset="0.462701" stopColor="white" stopOpacity="0.7" />
            <Stop offset="0.990385" stopColor="white" stopOpacity="0" />
          </LinearGradient>
        </Defs>
      </Svg>
    </View>
  );
}

export default function FakeDoorCategoriasScreen() {
  const handleAvisenme = () => {
    Alert.alert(
      "¡Gracias por tu interés!",
      "Te avisaremos cuando esta funcionalidad esté disponible."
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center', // Centrado vertical en el layout restante
          alignItems: 'center',
          paddingBottom: 160, // Padding para el footer (GradientFooter) que está en _layout
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-col items-center w-full">
          
          <View className="flex-col items-center gap-xxl w-full px-xl">
            <View className="flex-col items-start gap-xxl w-full p-xl bg-transparent rounded-lg overflow-hidden">
              
              {/* SVG Graphic (Centered) */}
              <CategoriasIllustration />

              {/* Text & Button Block */}
              <View className="flex-col items-start gap-lg w-full rounded-md">
                
                <View className="flex-col items-center gap-sm w-full">
                  <Text className="text-muted-foreground text-center font-['Inter'] text-body font-normal leading-[19.6px]">
                    Organiza tus gastos en diferentes categorías.
                  </Text>
                </View>

                <View className="flex-col items-start gap-sm w-full">
                  <Pressable 
                    onPress={handleAvisenme}
                    className="flex-row items-center justify-center gap-sm w-full px-xl py-lg rounded-lg bg-card border border-muted active:opacity-80"
                  >
                    <Bell size={18} color={colors.text} weight="fill" />
                    <Text className="text-foreground font-['Inter'] text-body font-medium leading-normal">
                      Avísenme
                    </Text>
                  </Pressable>
                </View>

              </View>

            </View>
          </View>
          
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
