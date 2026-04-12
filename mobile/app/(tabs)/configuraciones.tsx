import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert as RNAlert, ScrollView, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MenuItem } from '../../components/ui/MenuItem';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { Alert } from '../../components/ui/Alert';

export default function ConfigurationsScreen() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = () => {
    RNAlert.alert(
      "Cerrar sesión",
      "¿Estás seguro de que deseas salir?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Salir", 
          style: "destructive", 
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await signOut();
            } catch (e) {
              setError("No se pudo cerrar la sesión.");
              setIsLoggingOut(false);
              setTimeout(() => setError(null), 3000);
            }
          } 
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Alert visible={!!error} message={error || ''} type="error" />
      
      {/* Overlay de carga simple para evitar doble interacción */}
      {isLoggingOut && (
        <View className="absolute inset-0 z-50 flex items-center justify-center bg-background/50">
           <ActivityIndicator size="large" color="#E98B00" />
        </View>
      )}

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
            <MenuItem title="Categorías" onPress={() => RNAlert.alert("Próximamente", "Configuración de categorías")} />
            <MenuItem
              title="Mes contable"
              onPress={() => RNAlert.alert("Próximamente", "Configuración de mes contable")}
            />
          </View>

          {/* Privacidad y seguridad Section */}
          <View className="w-full flex-col">
            <SectionHeader title="Privacidad y seguridad" />
            <MenuItem
              title="Cerrar sesión"
              onPress={handleLogout}
            />
            <MenuItem
              title="Eliminar cuenta de usuario"
              onPress={() => RNAlert.alert("Próximamente", "Esta acción es irreversible.")}
            />
          </View>

        </View>

        {/* Recomendaciones aisladas */}
        <View className="w-full flex-col items-center">
          <MenuItem
            title="Recomendaciones"
            hideChevron
            onPress={() => RNAlert.alert("Próximamente", "Abrir recomendaciones de uso")}
          />
        </View>

        {/* Development Section */}
        {(__DEV__ && process.env.EXPO_PUBLIC_USE_MOCKS === 'true') && (
          <View className="w-full flex-col -mt-4">
            <SectionHeader title="Dev Mode" />
            <Button
              variant="outline"
              className="mt-2"
              onPress={() => router.push('/playground')}
            >
              <Text className="text-muted-foreground font-bold">Playground UI</Text>
            </Button>
          </View>
        )}

        {/* Branding Footer */}
        <Text className="text-muted-foreground text-base font-normal leading-[normal]">
          Saldai v1
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}
