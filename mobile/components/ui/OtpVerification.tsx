import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Alert } from './Alert';
import { OtpInput } from './OtpInput';

export interface OtpVerificationProps {
  message: string;
  otp: string;
  onOtpChange: (val: string) => void;
  error?: boolean;
  onResend: () => void;
  loading?: boolean;
  cooldownSeconds?: number;
}

export function OtpVerification({
  message,
  otp,
  onOtpChange,
  error,
  onResend,
  loading,
  cooldownSeconds = 0,
}: OtpVerificationProps) {
  return (
    <View className="w-full flex-col items-center gap-xl">
      <Alert
        visible={true}
        message={message}
        type="pending"
        inline={true}
      />

      <View className="w-full flex-col items-start gap-sm">
        <Text
          className="text-muted-foreground font-['Inter'] text-body font-normal leading-[normal]"
          numberOfLines={1}
        >
          Ingresa el código de verificación
        </Text>

        <OtpInput
          value={otp}
          onChangeText={onOtpChange}
          error={error}
        />

        {error && (
          <Text className="text-destructive font-['Inter'] text-detail font-normal leading-[normal]">
            Código incorrecto o ha expirado. Intenta nuevamente.
          </Text>
        )}
      </View>

      <View className="w-full flex-col items-center gap-sm mt-lg">
        <Pressable
          onPress={onResend}
          disabled={loading || cooldownSeconds > 0}
          className="w-full py-md px-xl justify-center items-center rounded-[16px] active:opacity-80"
        >
          <Text className="text-muted-foreground font-['Inter'] text-body font-medium leading-[normal]">
            {cooldownSeconds > 0 ? `Reenviar en ${cooldownSeconds}s` : 'Reenviar código'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
