import { Check, Info, Warning, XCircle } from 'phosphor-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
        return <Warning size={16} color="#ffffff" weight="bold" />;
      case 'error':
        return <XCircle size={16} color="#ffffff" weight="bold" />;
      case 'info':
        return <Info size={16} color="#ffffff" weight="bold" />;
      case 'success':
      default:
        return <Check size={16} color="#ffffff" weight="bold" />;
    }
  };

  const displayText = message ? message : `Agregado ${monto} ${descripcion}`;

  return (
    <View
      className="absolute top-0 left-0 right-0 z-50 items-center px-xl"
      style={{ paddingTop: insets.top > 0 ? insets.top + 16 : 40 }}
      pointerEvents="none"
    >
      <View
        className="px-[16px] py-[8px] flex-row justify-center items-center gap-[8px] rounded-full border-2 border-[#353A47]"
        style={{ backgroundColor: 'rgba(38, 42, 53, 0.40)' }}
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
