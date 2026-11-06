import React, { useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { Input } from '@/components/ui/Input';
import { BotonLimpiar } from '@/components/ui/BotonLimpiar';
import { Clock, PencilSimple } from 'phosphor-react-native';
import { colors } from '@/constants/theme';

export interface EmailVerificationInputProps {
  value: string;
  onChangeText: (text: string) => void;
  isVerifying: boolean;
  isEditing?: boolean;
}

export type IconoDelInput = 'reloj' | 'limpiar' | 'lapiz';

/**
 * Qué icono va a la derecha del input.
 *
 * Es una función aparte para poder probar la regla sin renderizar: los tres
 * estados dependen de dos booleanos y es justo donde se cuela un caso que no
 * se mira nunca, como la "x" sobre un input vacío.
 */
export function iconoDelInput({
  isVerifying,
  isFocused,
  tieneTexto,
}: {
  isVerifying: boolean;
  isFocused: boolean;
  tieneTexto: boolean;
}): IconoDelInput {
  // Esperando el código: el reloj gana, el email ya quedó enviado.
  if (isVerifying && !isFocused) return 'reloj';
  // Escribiendo y con algo escrito es el único caso donde hay qué borrar.
  if (isFocused && tieneTexto) return 'limpiar';
  return 'lapiz';
}

export function EmailVerificationInput({ value, onChangeText, isVerifying, isEditing }: EmailVerificationInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const icono = iconoDelInput({ isVerifying, isFocused, tieneTexto: value.length > 0 });

  const limpiar = () => {
    onChangeText('');
    // Borrar deja el input listo para escribir de nuevo. Sin esto el tap sobre
    // la "x" puede sacarle el foco y el teclado, y volver a escribir pide otro
    // tap, que es lo contrario de resetear el input en foco.
    inputRef.current?.focus();
  };

  const iconos = {
    reloj: <Clock size={18} color={colors.text} weight="fill" />,
    lapiz: <PencilSimple size={18} className="text-muted-foreground" weight="fill" />,
    limpiar: <BotonLimpiar onPress={limpiar} accessibilityLabel="Borrar el email" />,
  };

  return (
    <Input
      ref={inputRef}
      value={value}
      onChangeText={onChangeText}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      keyboardType="email-address"
      autoCapitalize="none"
      autoCorrect={false}
      placeholder="tu@email.com"
      editable={true}
      // El borde queda activo mientras se edita, aunque el foco se haya ido:
      // es lo que indica que lo escrito todavía no se confirmó.
      resaltado={isEditing}
      // Una vez enviado el código el email confirmado se muestra apagado.
      atenuado={isVerifying && !isFocused}
      iconoDerecha={iconos[icono]}
    />
  );
}
