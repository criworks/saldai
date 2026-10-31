import { Portal } from '@rn-primitives/portal';
import React, { ReactNode } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';

interface ConfirmationModalProps {
  visible: boolean;
  title: string | ReactNode;
  icon: ReactNode;
  buttonText: string;
  buttonVariant?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  visible,
  title,
  icon,
  buttonText,
  buttonVariant = 'default',
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  if (!visible) return null;

  return (
    <Portal name="confirmation-modal">
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onCancel}
        statusBarTranslucent
      >
        <View className="flex-1 justify-end bg-background/60">
          <Pressable 
            className="absolute inset-0" 
            onPress={onCancel}
          />
          <View className="w-full px-[30px] pt-[30px] pb-10 flex-col items-center gap-xxl rounded-t-[30px] bg-card">
            
            <View className="flex-col items-center gap-lg w-full">
              <View className="h-4xl px-3 items-center justify-center rounded-full bg-muted">
                <View className="w-xl h-xl overflow-hidden items-center justify-center">
                  {icon}
                </View>
              </View>
              
              <Text className="text-card-foreground text-center font-['Inter'] text-body font-normal leading-[19.6px]">
                {title}
              </Text>
            </View>

            <Pressable
              onPress={onConfirm}
              className={`flex h-[56px] px-xl py-lg justify-center items-center rounded-lg w-full active:opacity-80 ${
                buttonVariant === 'destructive' ? 'bg-destructive' : 'bg-foreground'
              }`}
            >
              <Text 
                className={`font-['Inter'] text-body font-semibold leading-normal ${
                  buttonVariant === 'destructive' ? 'text-destructive-foreground' : 'text-background'
                }`}
              >
                {buttonText}
              </Text>
            </Pressable>
            
          </View>
        </View>
      </Modal>
    </Portal>
  );
}
