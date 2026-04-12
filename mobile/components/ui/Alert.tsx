import { Check, Clock, Info, Warning, XCircle } from 'phosphor-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type AlertType = 'success' | 'warning' | 'error' | 'info' | 'pending';

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
        return <Check size={18} color="#ffffff" weight="bold" />;
      case 'warning':
        return <Warning size={18} color="#ffffff" weight="fill" />;
      case 'error':
        return <XCircle size={18} color="#ffffff" weight="fill" />;
      case 'pending':
        return <Clock size={18} color="#ffffff" weight="fill" />;
      default:
        return <Info size={18} color="#ffffff" weight="fill" />;
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
