import React, { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { BotonLimpiar } from '@/components/ui/BotonLimpiar';
import { Input } from '@/components/ui/Input';
import { soloElPrimerEmoji } from '@/lib/emoji';

export interface CampoDeCategoriaProps {
  /** El icono. Vacío mientras no se elija: el campo muestra un marcador. */
  emoji: string;
  onEmoji: (emoji: string) => void;
  nombre: string;
  onNombre: (nombre: string) => void;
  /** El "check" del teclado: es así como se confirma, no con un botón aparte. */
  onConfirmar: () => void;
  /** La "x": saca la burbuja y cancela la creación. */
  onCancelar: () => void;
  /** Al aparecer, el teclado ya abierto sobre el nombre. */
  autoFocus?: boolean;
  testID?: string;
}

/**
 * La burbuja de una categoría mientras se crea o se renombra: el emoji, el
 * nombre y la "x" que cancela.
 *
 * Ocupa el lugar de la burbuja que va a ser, con su misma forma, así que la
 * lista no se reacomoda al confirmar. Por eso el nombre usa la variante `chip`
 * de `Input` y no la de formulario.
 *
 * Vive en `features/movimientos` y no en `components/ui` porque sabe de categorías,
 * que es dominio: en `components/ui` quedan los primitivos, y los dos que usa
 * (`Input` y `BotonLimpiar`) salen de ahí.
 *
 * **El teclado de emojis no se puede abrir desde el código.** React Native no
 * expone ningún `keyboardType` que lo pida y ni iOS ni Android tienen API
 * pública para eso: al tocar el emoji se abre el teclado normal y el usuario
 * cambia al de emojis con la tecla del sistema. Lo que sí se controla es qué
 * entra: todo lo que no sea emoji se descarta en silencio, y de lo que quede se
 * guarda el primero, porque el icono es uno. Se descarta en vez de rechazar
 * para que escribir una letra deje el campo quieto en lugar de mostrar un
 * error. La alternativa, que sí daría la interacción completa, es un selector
 * de emojis propio en vez del teclado del sistema.
 */
export function CampoDeCategoria({
  emoji,
  onEmoji,
  nombre,
  onNombre,
  onConfirmar,
  onCancelar,
  autoFocus = false,
  testID = 'campo-de-categoria',
}: CampoDeCategoriaProps) {
  const campoDeEmoji = useRef<TextInput>(null);

  return (
    <View className="flex-row items-center gap-sm" testID={testID}>
      {/*
        El emoji es un campo y no un botón que abre un selector: así el teclado
        del sistema ya sirve, y el día que haya selector propio se cambia acá
        sin tocar al resto.
      */}
      <Pressable
        onPress={() => campoDeEmoji.current?.focus()}
        accessibilityLabel="Icono de la categoría"
        testID={`${testID}-emoji-area`}
        className="w-xxl h-xxl rounded-full bg-secondary items-center justify-center active:opacity-80"
      >
        <Input
          ref={campoDeEmoji}
          variante="sin-fondo"
          value={emoji}
          onChangeText={(texto) => onEmoji(soloElPrimerEmoji(texto))}
          placeholder="🙂"
          // El teclado de emojis no se puede pedir; lo que se evita es que el
          // sistema autocomplete o capitalice lo que se escriba en el medio.
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={onConfirmar}
          accessibilityLabel="Icono de la categoría"
          testID={`${testID}-emoji`}
          className="text-body text-center w-full"
        />
      </Pressable>

      <Input
        variante="chip"
        value={nombre}
        onChangeText={onNombre}
        placeholder="Nueva categoría"
        autoFocus={autoFocus}
        autoCorrect={false}
        // Las categorías se muestran capitalizadas ("Mercado", "Básicos"), así
        // que el teclado arranca en mayúscula en vez de pedir el shift.
        autoCapitalize="sentences"
        returnKeyType="done"
        onSubmitEditing={onConfirmar}
        accessibilityLabel="Nombre de la categoría"
        testID={`${testID}-nombre`}
        iconoDerecha={
          <BotonLimpiar onPress={onCancelar} accessibilityLabel="Cancelar la categoría nueva" />
        }
      />
    </View>
  );
}
