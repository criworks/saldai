import { MESES } from '@/constants/theme';
import React from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MenuItem } from '../../components/ui/MenuItem';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useGastos } from '../../contexts/GastosContext';

export default function ConfigurationsScreen() {
  // Conectamos con el contexto de la app para extraer el mes contable y total de gastos
  const { mes, totalMes } = useGastos();

  return (
    <SafeAreaView className="flex-1 bg-[#111217]">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title="General" />
        <MenuItem
          title="Cuenta de usuario"
          value="themacbook"
          onPress={() => Alert.alert("Cuenta", "Sesión iniciada como themacbook")}
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

        <Text className="text-[#60677D] text-[12px] text-center mt-[40px]">
          Gast OS v1
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
