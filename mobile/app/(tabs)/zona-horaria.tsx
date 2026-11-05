import { buscarZonas, catalogoDeZonas, etiquetaDeDesplazamiento, type ZonaDelCatalogo } from '@saldai/core';
import { Check } from 'phosphor-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert } from '@/components/ui/Alert';
import { Buscador } from '@/components/ui/Buscador';
import { colors } from '@/constants/theme';
import { usePreferencias } from '@/features/perfil';
import { zonaDelDispositivo } from '@/lib/zona';

/** La fila de arriba: no guarda zona y deja que se use la del aparato. */
const AUTOMATICA = '__automatica__';

type Fila = { clave: string; zona: string | null; nombre: string; detalle: string };

export default function ZonaHorariaScreen() {
  const { zonaElegida, guardar, guardando, cargando, error, errorAlGuardar } = usePreferencias();
  const [texto, setTexto] = useState('');

  const delAparato = zonaDelDispositivo();

  // El catálogo se calcula una vez: son cien zonas y cada una pide un
  // `Intl.DateTimeFormat`, que es lo caro. Recalcularlo en cada tecla del
  // buscador hacía que la lista se sintiera pegajosa.
  const catalogo = useMemo(() => catalogoDeZonas(), []);

  const filaAutomatica: Fila = useMemo(() => {
    const encontrada = delAparato ? catalogo.find((z) => z.zona === delAparato) : undefined;
    return {
      clave: AUTOMATICA,
      zona: null,
      nombre: 'Automática',
      // Se muestra qué zona implica "automática" hoy: si no, el usuario no
      // tiene forma de saber qué eligió.
      detalle: encontrada
        ? `${encontrada.nombre} ${encontrada.desplazamiento}`
        : (delAparato ?? 'la del dispositivo'),
    };
  }, [catalogo, delAparato]);

  const secciones = useMemo(() => {
    const filtradas = buscarZonas(texto, catalogo);

    const grupos: { title: string; data: Fila[] }[] = [];
    for (const z of filtradas as ZonaDelCatalogo[]) {
      const titulo = etiquetaDeDesplazamiento(z.minutos);
      const ultimo = grupos[grupos.length - 1];
      const fila: Fila = { clave: z.zona, zona: z.zona, nombre: z.nombre, detalle: z.zona };
      if (ultimo && ultimo.title === titulo) ultimo.data.push(fila);
      else grupos.push({ title: titulo, data: [fila] });
    }

    // "Automática" solo encabeza la lista sin filtrar: con el buscador abierto
    // estorba, porque lo que el usuario quiere ver es lo que coincide.
    return texto.trim() ? grupos : [{ title: '', data: [filaAutomatica] }, ...grupos];
  }, [texto, catalogo, filaAutomatica]);

  const elegir = (fila: Fila) => {
    // Lo mismo dos veces es un viaje al servidor que no cambia nada.
    if ((zonaElegida ?? null) === fila.zona) return;
    guardar({ zona: fila.zona });
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Alert
        visible={!!error || !!errorAlGuardar}
        message={error ? 'No se pudo leer tu zona horaria.' : 'No se pudo guardar la zona horaria.'}
        type="error"
      />

      <Buscador
        titulo="Zona horaria"
        texto={texto}
        onTexto={setTexto}
        placeholder="Busca una ciudad o un país"
        accessibilityLabel="Busca una zona horaria"
        testID="buscador-de-zonas"
      />

      {cargando ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.text} />
        </View>
      ) : (
        <SectionList
          sections={secciones}
          keyExtractor={(fila) => fila.clave}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 160 }}
          ListEmptyComponent={
            <Text className="text-muted-foreground text-body font-normal pt-xl">
              No hay ninguna zona que coincida.
            </Text>
          }
          renderSectionHeader={({ section }) =>
            section.title ? (
              <Text className="text-muted-foreground text-base font-normal pt-lg pb-sm w-full">
                {section.title}
              </Text>
            ) : null
          }
          renderItem={({ item }) => {
            const elegida = (zonaElegida ?? null) === item.zona;
            return (
              <Pressable
                onPress={() => elegir(item)}
                disabled={guardando}
                accessibilityRole="radio"
                accessibilityState={{ selected: elegida }}
                testID={`zona-${item.clave}`}
                className="flex-row items-center justify-between py-md w-full active:opacity-80"
              >
                <View className="flex-1 pr-md">
                  <Text
                    className={`${elegida ? 'text-foreground font-medium' : 'text-muted-foreground font-normal'} text-md leading-[normal]`}
                  >
                    {item.nombre}
                  </Text>
                  <Text className="text-muted-foreground text-detail font-normal leading-[14px] pt-xs">
                    {item.detalle}
                  </Text>
                </View>
                {elegida && <Check size={18} color={colors.text} weight="bold" />}
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
