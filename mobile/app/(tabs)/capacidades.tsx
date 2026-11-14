import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert } from '@/components/ui/Alert';
import { MenuItem } from '@/components/ui/MenuItem';
import { usePreferencias } from '@/features/perfil';

/**
 * General > Capacidades: lo que la app puede hacer y el usuario prende o apaga.
 *
 * Las filas no navegan: acá se prende y se apaga, nada más. La configuración de
 * cada capacidad vive en otro lado, porque una pantalla que es a la vez el
 * interruptor y el panel de ajustes obliga a entrar para apagar algo.
 */
export default function CapacidadesScreen() {
  // Mientras carga los switches se ven apagados, que es el estado de la v1: al
  // revés aparecerían prendidos y se apagarían solos al llegar la respuesta.
  const { preferencias, categoriasVisibles, metodosVisibles, guardar, guardando, error } =
    usePreferencias();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Alert visible={!!error} message="No se pudieron leer tus capacidades." type="error" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24, // xl
          paddingTop: 40, // 3xl
          paddingBottom: 160, // Suficiente espacio para el footer
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-muted-foreground text-xxl font-normal leading-[normal]">
          Capacidades
        </Text>

        <View className="w-full flex-col gap-xl pt-xl">
          {/*
            La fila se muestra siempre que el perfil tenga la capacidad
            habilitada, aunque el usuario la tenga apagada: si desapareciera al
            apagarla no habría forma de volver a prenderla.

            `habilitado` es del plan y `activo` del usuario, así que una fila
            que no está habilitada no se muestra: no es algo que el usuario
            pueda prender.
          */}
          {preferencias.categorias.habilitado && (
            <MenuItem
              title="Categorías"
              descripcion="Organiza tus gastos en diferentes categorías."
              switchValue={categoriasVisibles}
              onSwitchChange={(activo) => guardar({ categoriasActivo: activo })}
              switchDisabled={guardando}
              hideChevron
            />
          )}
          {preferencias.metodos.habilitado && (
            <MenuItem
              title="Métodos de pago"
              switchValue={metodosVisibles}
              onSwitchChange={(activo) => guardar({ metodosActivo: activo })}
              switchDisabled={guardando}
              hideChevron
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
