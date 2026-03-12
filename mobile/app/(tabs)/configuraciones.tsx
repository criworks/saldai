import { MESES } from '@/constants/theme';
import React from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MenuItem } from '../../components/ui/MenuItem';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useGastos } from '../../contexts/GastosContext';

export default function ConfigurationsScreen() {
  // Conectamos con el contexto de la app para extraer el mes contable y total de gastos
  const { mes, totalMes } = useGastos();
  const { signOut } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 w-full max-w-md mx-auto">
        <ScrollView
          contentContainerStyle={{ paddingTop: 40, paddingBottom: 160 }}
          showsVerticalScrollIndicator={false}
        >
          <SectionHeader title="General" />
          <MenuItem
            title="Cuenta de usuario"
            value="themacbook"
            onPress={() => Alert.alert("Cuenta", "Sesión iniciada como themacbook")}
          />
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

          <SectionHeader title="Funcionamiento" />
          <MenuItem title="Categorías" />
          <MenuItem
            title="Mes contable"
            value={MESES[mes - 1] || mes.toString()}
          />
          <MenuItem
            title="Total del mes"
            value={`$${totalMes.toLocaleString()}`}
          />
          <MenuItem title="Métodos de pago" />

          <SectionHeader title="Privacidad y seguridad" />
          <MenuItem
            title="Eliminar cuenta de usuario"
            onPress={() => Alert.alert("Eliminar cuenta", "Esta acción es irreversible.")}
          />

          <Text className="text-muted-foreground text-detail text-center mt-[40px]">
            Gast OS v1
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}