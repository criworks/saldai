import { cssInterop } from 'nativewind';
import { 
  BellSimple, 
  CardsThree, 
  Nut, 
  Plus, 
  Check, 
  CaretRight, 
  WarningCircle, 
  PencilSimple,
  Clock,
  Calendar,
  CaretDown
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
cssInterop(Calendar, iconConfig as any);
cssInterop(CaretDown, iconConfig as any);
