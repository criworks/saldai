import { useRouter } from 'expo-router';
import { SignOut, Trash } from 'phosphor-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert as RNAlert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert } from '@/components/ui/Alert';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { MenuItem } from '@/components/ui/MenuItem';
import { Notification } from '@/components/ui/Notification';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth';
import { supabase } from '@/services/supabase';
import { colors } from '@/constants/theme';

export default function ConfigurationsScreen() {
  const { signOut, session } = useAuth();
  const router = useRouter();

  // Loading States
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success Notification State
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Modals Visibility
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleLogoutConfirm = async () => {
    setShowLogoutModal(false);
    setIsProcessing(true);
    
    try {
      // Mock flow if enabled
      if (__DEV__ && process.env.EXPO_PUBLIC_USE_MOCKS === 'true') {
        console.log('[MOCK] Cerrando sesión...');
        await new Promise(res => setTimeout(res, 800));
        await signOut();
      } else {
        // Real logic
        await signOut();
      }
      // La navegación usualmente ocurre en el _layout por el listener de Auth,
      // pero seteamos el success visual justo antes de que se desmonte el usuario.
      setNotificationMsg("Sesión cerrada");
    } catch (e) {
      setError("No se pudo cerrar la sesión.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteModal(false);
    setIsProcessing(true);
    
    try {
      if (__DEV__ && process.env.EXPO_PUBLIC_USE_MOCKS === 'true') {
        console.log('[MOCK] Eliminando cuenta de usuario...');
        await new Promise(res => setTimeout(res, 1500));
        await signOut(); // Simulamos que se borra y cerramos sesión
      } else {
        // Borrar un usuario de auth.users no es algo que el rol de la sesión
        // pueda hacer, así que va por la función delete_user() de Supabase
        // (ver supabase/migrations/), que borra los gastos y la cuenta.
        const { error: rpcError } = await supabase.rpc('delete_user');

        // Si falla, la cuenta sigue viva: no se puede cerrar sesión y decir
        // que se eliminó.
        if (rpcError) throw new Error(rpcError.message);

        await signOut();
      }
      setNotificationMsg("Cuenta eliminada correctamente");
    } catch (e) {
      setError("No se pudo eliminar la cuenta. Intenta de nuevo.");
      setTimeout(() => setError(null), 4000);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Alert visible={!!error} message={error || ''} type="error" />
      <Notification visible={!!notificationMsg} message={notificationMsg || ''} type="success" />
      
      {/* Overlay de carga simple para evitar doble interacción */}
      {isProcessing && (
        <View className="absolute inset-0 z-50 flex items-center justify-center bg-background/50">
           <ActivityIndicator size="large" color={colors.text} />
        </View>
      )}

      {/* Logout Modal */}
      <ConfirmationModal
        visible={showLogoutModal}
        title="Confirma que vas a cerrar tu sesión"
        icon={<SignOut size={24} color={colors.text} weight="regular" />}
        buttonText="Cerrar sesión"
        buttonVariant="default"
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutModal(false)}
      />

      {/* Delete Account Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        title={
          <Text className="text-card-foreground text-center font-['Inter'] text-body font-normal leading-[19.6px]">
            Confirma que vas a eliminar tu cuenta.{"\n"}Se eliminará toda tu información.
          </Text>
        }
        icon={<Trash size={24} color={colors.errorStrong} weight="regular" />}
        buttonText="Eliminar cuenta"
        buttonVariant="destructive"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteModal(false)}
      />

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
            <MenuItem 
              title="Categorías" 
              onPress={() => router.push('/categorias')} 
            />
            <MenuItem
              title="Mes contable"
              onPress={() => router.push('/mes-contable')}
            />
          </View>

          {/* Privacidad y seguridad Section */}
          <View className="w-full flex-col">
            <SectionHeader title="Privacidad y seguridad" />
            <MenuItem
              title="Cerrar sesión"
              onPress={() => setShowLogoutModal(true)}
            />
            <MenuItem
              title="Eliminar cuenta de usuario"
              onPress={() => setShowDeleteModal(true)}
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
