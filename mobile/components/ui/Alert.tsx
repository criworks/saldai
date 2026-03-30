import React from 'react';
import { View, Text } from 'react-native';
import { Warning, Check, Info, XCircle } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type AlertType = 'success' | 'warning' | 'error' | 'info';

export interface AlertProps {
  visible: boolean;
  message: string;
  type?: AlertType;
}

export function Alert({ visible, message, type = 'info' }: AlertProps) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check size={18} color="#ffffff" weight="bold" />;
      case 'warning':
        return <Warning size={18} color="#ffffff" weight="fill" />;
      case 'error':
        return <XCircle size={18} color="#ffffff" weight="fill" />;
      default:
        return <Info size={18} color="#ffffff" weight="fill" />;
    }
  };

  return (
    <View 
      className="absolute top-0 left-0 right-0 z-50 items-center px-xl"
      style={{ paddingTop: insets.top > 0 ? insets.top + 16 : 40 }}
      pointerEvents="none"
    >
      <View 
        className="w-full max-w-[364px] p-[24px] flex-col justify-center items-start gap-[16px] rounded-[16px] border-2 border-[#353A47]"
        style={{ backgroundColor: 'rgba(38, 42, 53, 0.40)' }}
      >
        <View className="flex-row justify-start items-start rounded-[16px]">
          {getIcon()}
        </View>
        <Text className="text-white font-['Inter'] text-[12px] font-normal leading-[normal]">
          {message}
        </Text>
      </View>
    </View>
  );
}
