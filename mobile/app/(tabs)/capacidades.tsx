import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert } from '@/components/ui/Alert';
import { MenuItem } from '@/components/ui/MenuItem';
import { usePreferencias } from '@/features/perfil';

/**
 * General > Capacidades: lo que la app puede hacer y el usuario prende o apaga.
 *
 * Cada fila prende y apaga la capacidad con su switch, y **entra a
 * configurarla** tocando el resto de la fila, con el chevron al lado del título
 * para decirlo. Los ajustes de una capacidad no están en esta pantalla, porque
 * una que fuera a la vez el interruptor y el panel obligaría a entrar para
 * apagar algo; pero es de acá de donde se entra.
 *
 * Hoy solo Recurrencias tiene a dónde ir: su lista de planes. Las otras dos
 * siguen sin chevron, que es lo que distingue una fila que lleva a algún lado
 * de una que solo se prende.
 *
 * Y con la capacidad apagada tampoco se entra: apagarla esconde la función en
 * toda la app, así que un chevron que lleva a configurar lo que está apagado
 * promete algo que no se cumple. Prendiéndola vuelve.
 */
export default function CapacidadesScreen() {
  const router = useRouter();

  // Mientras carga los switches se ven apagados, que es el estado de la v1: al
  // revés aparecerían prendidos y se apagarían solos al llegar la respuesta.
  const {
    preferencias,
    categoriasVisibles,
    metodosVisibles,
    recurrenciasVisibles,
    guardar,
    guardando,
    error,
  } = usePreferencias();

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
          {preferencias.recurrencias.habilitado && (
            <MenuItem
              title="Recurrencias"
              descripcion="Programa la repetición de tus movimientos recurrentes."
              switchValue={recurrenciasVisibles}
              onSwitchChange={(activo) => guardar({ recurrenciasActivo: activo })}
              switchDisabled={guardando}
              {...(recurrenciasVisibles
                ? { onPress: () => router.push('/recurrencias') }
                : { hideChevron: true })}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
