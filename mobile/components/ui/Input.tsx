import React, { forwardRef } from 'react';
import { TextInput, TextInputProps } from 'react-native';

export const Input = forwardRef<TextInput, TextInputProps>((props, ref) => {
  return (
    <TextInput
      ref={ref}
      {...props}
      className={`h-[56px] px-xl rounded-[16px] bg-secondary text-body font-normal font-['Inter'] placeholder:text-muted-foreground caret-foreground ${props.value ? 'text-foreground' : 'text-muted-foreground'} ${props.className || ''}`}
    />
  );
});

Input.displayName = 'Input';
