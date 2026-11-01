import React, { forwardRef, useState } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';

/**
 * Las dos formas que tiene un campo de texto en el producto. Son variantes de
 * un mismo componente y no dos componentes porque lo que cambia es el contorno:
 * el comportamiento (el color del texto según haya valor o no, el placeholder,
 * el caret, el foco) es el mismo en las dos y conviene que viva en un solo lado.
 *
 * - `con-fondo`: caja gris, borde que responde al foco y, si hace falta, un
 *   icono a la derecha. Es la de login, la de cuenta y —con las mismas clases,
 *   ver `cajaConFondo`— la del código de 6 dígitos.
 * - `sin-fondo`: solo el texto. Es la de la captura de gastos, donde el campo
 *   va dentro de una fila que ya tiene su propio contorno. **No lleva icono**:
 *   sin caja no hay dónde apoyarlo.
 */
export type VarianteInput = 'con-fondo' | 'sin-fondo';

export interface EstadoCaja {
  /** El campo está en foco, o el que lo usa quiere mostrarlo como activo. */
  activo?: boolean;
  /**
   * Marca el borde en rojo. Hoy el único error diseñado es el del código de 6
   * dígitos incorrecto, así que lo usa `OtpInput` y nadie más: `Input` no
   * expone un prop de error porque no hay ninguna pantalla que lo mostraría.
   */
  error?: boolean;
}

/**
 * El contorno de un campo `con-fondo`, en un solo lugar.
 *
 * Se exporta porque el campo del código de 6 dígitos no es un `TextInput` sino
 * una fila de dígitos sobre un `Pressable`: comparte la caja pero no el input,
 * así que la única forma de que los dos no se separen con el tiempo es que
 * saquen las clases de acá.
 *
 * El borde es siempre de 2px y lo que cambia es el color. Con `border` a 1px en
 * reposo y `border-2` en foco, la caja se movía un pixel al entrar y salir del
 * campo, que es lo que hacía el campo de email antes de esto.
 */
export const cajaConFondo = ({ activo, error }: EstadoCaja = {}) =>
  `h-control px-xl rounded-lg bg-secondary border-2 ${
    error
      ? 'border-destructive'
      : activo
        ? 'border-muted-foreground'
        : 'border-transparent'
  }`;

export interface InputProps extends TextInputProps {
  variante?: VarianteInput;
  /**
   * Muestra el borde activo aunque el campo no esté en foco. Lo usa el campo de
   * email, que queda resaltado mientras lo escrito no coincide con lo confirmado.
   */
  resaltado?: boolean;
  /**
   * Atenúa el texto aunque haya valor. Es un prop y no una clase que el que lo
   * usa manda por `className` porque dos utilidades de color en el mismo
   * `className` dependen del orden, y acá el estado tiene que ser inequívoco.
   */
  atenuado?: boolean;
  /** Icono a la derecha, dentro de la caja. Ignorado en la variante sin fondo. */
  iconoDerecha?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    variante = 'con-fondo',
    resaltado,
    atenuado,
    iconoDerecha,
    className,
    onFocus,
    onBlur,
    ...props
  },
  ref
) {
  // El foco se lleva acá adentro porque es lo que pinta el borde. El que usa el
  // componente igual recibe sus `onFocus`/`onBlur`, por si le hacen falta para
  // otra cosa (el campo de email decide con eso qué icono mostrar).
  const [enFoco, setEnFoco] = useState(false);

  // Con valor el texto es blanco, vacío es gris. Estaba repetido en el campo de
  // email y en los dos de la captura, con la misma expresión escrita tres veces.
  const colorTexto = props.value && !atenuado ? 'text-foreground' : 'text-muted-foreground';

  // Sin tamaño ni peso: los pone cada variante, porque la captura usa
  // `text-display font-light` y dos utilidades del mismo tipo en un className
  // se resuelven por orden.
  const base = `font-['Inter'] placeholder:text-muted-foreground caret-foreground ${colorTexto}`;

  const campo = (
    <TextInput
      ref={ref}
      {...props}
      onFocus={(e) => {
        setEnFoco(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setEnFoco(false);
        onBlur?.(e);
      }}
      className={
        variante === 'sin-fondo'
          ? `p-0 m-0 ${base} ${className || ''}`
          : `w-full ${cajaConFondo({ activo: enFoco || resaltado })} text-body font-normal ${iconoDerecha ? 'pr-4xl' : ''} ${base} ${className || ''}`
      }
    />
  );

  // La variante sin fondo no lleva icono, así que tampoco necesita la capa que
  // lo posiciona: devuelve el campo pelado y la fila que lo contiene lo sigue
  // midiendo igual que antes.
  if (variante === 'sin-fondo') return campo;

  return (
    <View className="w-full relative justify-center">
      {campo}
      {/*
        `box-none`: la capa no recibe taps pero sus hijos sí. Con
        `pointer-events-none` un icono tocable no llega a recibir el tap, y sin
        nada la capa se come los taps sobre el borde derecho del campo.
      */}
      {iconoDerecha && (
        <View className="absolute right-lg" pointerEvents="box-none">
          {iconoDerecha}
        </View>
      )}
    </View>
  );
});
