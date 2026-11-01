import { Check, Clock, Info, Mailbox, Warning, XCircle } from 'phosphor-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, withAlpha } from '@/constants/theme';

/**
 * `pending` y `mailbox` dicen lo mismo (estamos esperando algo tuyo) con
 * distinto icono: el reloj es "esperá", el buzón es "andá a ver tu email".
 * Son dos variantes y no una porque el flujo decide cuál cuenta mejor.
 */
export type AlertType = 'success' | 'warning' | 'error' | 'info' | 'pending' | 'mailbox';

export interface AlertProps {
  visible: boolean;
  message: string;
  type?: AlertType;
  inline?: boolean;
}

export function Alert({ visible, message, type = 'info', inline = false }: AlertProps) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check size={18} color={colors.text} weight="bold" />;
      case 'warning':
        return <Warning size={18} color={colors.text} weight="fill" />;
      case 'error':
        return <XCircle size={18} color={colors.text} weight="fill" />;
      case 'pending':
        return <Clock size={18} color={colors.text} weight="fill" />;
      // El único icono a 24: el resto va a 18 y acá se pidió más presencia.
      case 'mailbox':
        return <Mailbox size={24} color={colors.text} weight="fill" />;
      default:
        return <Info size={18} color={colors.text} weight="fill" />;
    }
  };

  const containerClasses = inline
    ? "w-full items-center"
    : "absolute top-0 left-0 right-0 z-50 items-center px-xl";

  const containerStyle = inline
    ? undefined
    : { paddingTop: insets.top > 0 ? insets.top + 16 : 40 };

  return (
    <View
      className={containerClasses}
      style={containerStyle}
      pointerEvents="none"
    >
      <View
        className="w-full max-w-[364px] p-xl flex-col justify-center items-start gap-lg rounded-lg border-2 border-border-active"
        style={{ backgroundColor: withAlpha(colors.bgElevated, 0.4) }}
      >
        {/* El testID lleva el tipo para poder afirmar en un test qué icono
            le toca a cada flujo, que es lo que se pidió y no se ve en el svg. */}
        <View className="flex-row justify-start items-start rounded-lg" testID={`alerta-icono-${type}`}>
          {getIcon()}
        </View>
        <Text className="text-white font-['Inter'] text-detail font-normal leading-[normal]">
          {message}
        </Text>
      </View>
    </View>
  );
}
