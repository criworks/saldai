import { cssInterop } from 'nativewind';
import { Feather } from '@expo/vector-icons';
import { 
  BellSimple, 
  CardsThree, 
  Nut, 
  Plus, 
  Check, 
  CaretRight, 
  WarningCircle, 
  PencilSimple,
  Clock
} from 'phosphor-react-native';

declare module 'phosphor-react-native' {
  interface IconProps {
    className?: string;
  }
}

const iconConfig = {
  className: {
    target: "style" as const,
    nativeStyleToProp: {
      color: true as const,
    },
  },
};

// @expo/vector-icons
cssInterop(Feather, iconConfig as any);

// phosphor-react-native
cssInterop(BellSimple, iconConfig as any);
cssInterop(CardsThree, iconConfig as any);
cssInterop(Nut, iconConfig as any);
cssInterop(Plus, iconConfig as any);
cssInterop(Check, iconConfig as any);
cssInterop(CaretRight, iconConfig as any);
cssInterop(WarningCircle, iconConfig as any);
cssInterop(PencilSimple, iconConfig as any);
cssInterop(Clock, iconConfig as any);
