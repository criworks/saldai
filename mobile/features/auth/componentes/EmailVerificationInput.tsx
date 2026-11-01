import React, { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
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

  return (
    <View className="w-full relative justify-center">
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
        className={`w-full pr-4xl ${(isEditing || isFocused) ? 'border-2 border-muted-foreground' : 'border border-transparent'} ${(isVerifying && !isFocused) ? 'text-muted-foreground' : ''}`}
      />
      {/*
        `pointer-events-none` solo mientras el icono es decorativo: si queda
        puesto, la capa se come el tap sobre la "x", y si se saca siempre, se
        come los taps sobre el borde derecho del input.
      */}
      <View className={`absolute right-lg ${icono === 'limpiar' ? '' : 'pointer-events-none'}`}>
        {icono === 'reloj' && <Clock size={18} color={colors.text} weight="fill" />}
        {icono === 'lapiz' && <PencilSimple size={18} className="text-muted-foreground" weight="fill" />}
        {icono === 'limpiar' && <BotonLimpiar onPress={limpiar} accessibilityLabel="Borrar el email" />}
      </View>
    </View>
  );
}
