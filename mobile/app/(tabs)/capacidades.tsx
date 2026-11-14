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
 * Estaba como sección "Funcionamiento" dentro de configuraciones, mezclada con
 * la zona horaria, que no es una capacidad conmutable sino un dato del perfil.
 * Separarlas deja configuraciones con una sola lista corta y las capacidades
 * juntas en su propia pantalla, que es donde van a entrar las que vengan.
 */
export default function CapacidadesScreen() {
  const router = useRouter();

  // Mientras carga los switches se ven apagados, que es el estado de la v1: al
  // revés aparecerían prendidos y se apagarían solos al llegar la respuesta.
  const { preferencias, categoriasVisibles, metodosVisibles, guardar, guardando, error } =
    usePreferencias();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Alert
        visible={!!error}
        message="No se pudieron leer tus capacidades."
        type="error"
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24, // xl
          paddingTop: 40, // 3xl
          paddingBottom: 160, // Suficiente espacio para el footer
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full flex-col">
          <Text className="text-foreground text-subtitle font-medium">Capacidades</Text>
          <Text className="text-muted-foreground text-base font-normal pt-sm">
            Lo que Saldai hace por ti. Prende lo que uses y deja apagado el resto.
          </Text>

          <View className="w-full flex-col pt-xl">
            {/*
              El switch prende la función y el chevron entra a configurarla. La
              fila se muestra siempre que el perfil tenga la función habilitada,
              aunque el usuario la tenga apagada: si desapareciera al apagarla
              no habría forma de volver a prenderla.

              `habilitado` es del plan y `activo` del usuario, así que una fila
              que no está habilitada no se muestra: no es algo que el usuario
              pueda prender.
            */}
            {preferencias.categorias.habilitado && (
              <MenuItem
                title="Categorías"
                switchValue={categoriasVisibles}
                onSwitchChange={(activo) => guardar({ categoriasActivo: activo })}
                switchDisabled={guardando}
                onPress={() => router.push('/categorias')}
              />
            )}
            {/*
              Métodos de pago va sin chevron: el diseño de esa pantalla es para
              crear y editar métodos propios, y hoy los métodos son los dos del
              catálogo de `@saldai/core` (EF y TC), iguales para todos. El
              switch prende el selector de la captura, que es lo que ya existe;
              la pantalla entra cuando exista el modelo de métodos por usuario.
            */}
            {preferencias.metodos.habilitado && (
              <MenuItem
                title="Métodos de pago"
                switchValue={metodosVisibles}
                onSwitchChange={(activo) => guardar({ metodosActivo: activo })}
                switchDisabled={guardando}
                hideChevron
              />
            )}
            {/*
              Recurrencias va sin switch: no es una función conmutable del plan
              sino una pantalla donde se crean y se editan los planes. Lo que el
              usuario tiene que confirmar aparece arriba del listado del mes, no
              acá.
            */}
            <MenuItem title="Recurrencias" onPress={() => router.push('/recurrencias')} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
