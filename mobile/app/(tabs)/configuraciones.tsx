import React from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MenuItem } from '../../components/ui/MenuItem';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useAuth } from '../../contexts/AuthContext';

export default function ConfigurationsScreen() {
  const { signOut } = useAuth();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ 
          paddingBottom: 160, // Suficiente espacio para el footer
          paddingTop: 40, // 3xl
          paddingHorizontal: 24, // xl
          alignItems: 'center',
          gap: 32 // xxl
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Card Contenedor */}
        <View className="w-full flex-col items-start bg-transparent">
          
          {/* General Section */}
          <View className="w-full flex-col">
            <SectionHeader title="General" />
            <MenuItem
              title="Cuenta de usuario"
              onPress={() => router.push('/cuenta')}
            />
          </View>

          {/* Funcionamiento Section */}
          <View className="w-full flex-col">
            <SectionHeader title="Funcionamiento" />
            <MenuItem title="Categorías" onPress={() => Alert.alert("Próximamente", "Configuración de categorías")} />
            <MenuItem
              title="Mes contable"
              onPress={() => Alert.alert("Próximamente", "Configuración de mes contable")}
            />
          </View>

          {/* Privacidad y seguridad Section */}
          <View className="w-full flex-col">
            <SectionHeader title="Privacidad y seguridad" />
            <MenuItem
              title="Cerrar sesión"
              onPress={async () => {
                 Alert.alert(
                  "Cerrar sesión",
                  "¿Estás seguro de que deseas salir?",
                  [
                    { text: "Cancelar", style: "cancel" },
                    { text: "Salir", style: "destructive", onPress: signOut }
                  ]
                );
              }}
            />
            <MenuItem
              title="Eliminar cuenta de usuario"
              onPress={() => Alert.alert("Próximamente", "Esta acción es irreversible.")}
            />
          </View>

        </View>

        {/* Recomendaciones aisladas */}
        <View className="w-full flex-col items-center">
          <MenuItem 
            title="Recomendaciones" 
            hideChevron 
            onPress={() => Alert.alert("Próximamente", "Abrir recomendaciones de uso")}
          />
        </View>

        {/* Branding Footer */}
        <Text className="text-muted-foreground text-base font-normal leading-[normal]">
          Gast OS v1
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}
