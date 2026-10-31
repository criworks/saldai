import { Check, Info, Warning, XCircle } from 'phosphor-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, withAlpha } from '@/constants/theme';

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface NotificationProps {
  visible: boolean;
  message?: string;
  type?: NotificationType;
  // Legacy props for backward compatibility
  monto?: string;
  descripcion?: string;
}

export function Notification({ visible, message, type = 'success', monto, descripcion }: NotificationProps) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <Warning size={16} color={colors.text} weight="bold" />;
      case 'error':
        return <XCircle size={16} color={colors.text} weight="bold" />;
      case 'info':
        return <Info size={16} color={colors.text} weight="bold" />;
      case 'success':
      default:
        return <Check size={16} color={colors.text} weight="bold" />;
    }
  };

  const displayText = message ? message : `Agregado ${monto || ''}`.trim();

  return (
    <View
      className="absolute top-0 left-0 right-0 z-50 items-center px-xl"
      style={{ paddingTop: insets.top > 0 ? insets.top + 16 : 40 }}
      pointerEvents="none"
    >
      <View
        className="px-lg py-sm flex-row justify-center items-center gap-sm rounded-full border-2 border-border-active"
        style={{ backgroundColor: withAlpha(colors.bgElevated, 0.4) }}
      >
        {getIcon()}
        <Text
          className="text-white font-['Inter'] text-body font-medium leading-[normal]"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {displayText}
        </Text>
      </View>
    </View>
  );
}
