# MOBILE_UI.md — Convenciones de UI Mobile

## Stack

- **React Native** con **Expo** (SDK más reciente)
- **TypeScript** — todos los archivos son `.tsx` o `.ts`
- **NativeWind v4** — Tailwind CSS para React Native
- **React Native Reusables** — componentes primitivos copy-paste
- **@expo/vector-icons (Feather)** — iconografía

## Estructura de carpetas

```
mobile/
├── App.tsx                    ← Navegación raíz + PortalHost + import global.css
├── global.css                 ← Variables CSS de RN Reusables + @tailwind directives
├── metro.config.js            ← withNativeWind, inlineRem: 16
├── tailwind.config.js         ← Colores CSS variables + nativewind/preset
├── babel.config.js            ← babel-preset-expo + nativewind/babel
├── constants/
│   └── theme.ts               ← Re-exports de @expenses/ui/tokens + tipos locales
├── screens/
│   ├── CapturaScreen.tsx      ← create-movement, pantalla principal
│   └── DashboardScreen.tsx    ← listado y resumen de gastos
├── components/
│   └── ui/                    ← Componentes de RN Reusables (copy-paste)
│       ├── button.tsx
│       ├── text.tsx
│       └── ...
├── hooks/
│   ├── useGastoMutation.ts    ← lógica de crear gasto
│   └── useGastos.ts           ← lógica de leer gastos
└── lib/
    └── utils.ts               ← cn() helper para merge de clases
```

## Convenciones de escritura

### Clases NativeWind

Usar clases de Tailwind con valores arbitrarios que coincidan con los tokens:

```tsx
// ✅ Correcto — valor arbitrario alineado al token
<View className="bg-[#111217]" />
<Text className="text-[#60677D] text-[14px]" />

// ❌ Evitar — color hardcodeado que no está en tokens
<View style={{ backgroundColor: "#1c1c1e" }} />
```

### Cuándo usar `StyleSheet` vs NativeWind

- **NativeWind** para estilos estáticos y la mayoría de los casos
- **StyleSheet / style prop inline** solo para valores dinámicos que no se pueden expresar como clase:

```tsx
// Dinámico → style prop
<View style={{ backgroundColor: categoryColor(gasto.categoria) }} />

// Estático → NativeWind
<View className="bg-[#262A35] rounded-full" />
```

### Componentes

- Un componente por archivo
- Nombre del archivo en `PascalCase` para componentes, `camelCase` para hooks y utils
- Props tipadas con `interface`, no `type` (convención del proyecto)
- Exportar como named export, no default (excepto screens)

```tsx
// ✅ Componente
interface ButtonProps {
  label: string
  onPress: () => void
  disabled?: boolean
}

export function PrimaryButton({ label, onPress, disabled }: ButtonProps) { ... }

// ✅ Screen
export default function CapturaScreen() { ... }
```

### Pressable vs TouchableOpacity

Usar `Pressable` — es el primitivo recomendado actualmente. Agregar `active:opacity-80` via NativeWind para feedback visual.

```tsx
<Pressable
  className="bg-[#262A35] rounded-full active:opacity-80"
  onPress={handlePress}
>
```

## React Native Reusables

### Cómo agregar un componente nuevo

```bash
cd mobile
npx @react-native-reusables/cli@latest add [nombre]
```

El componente se copia a `mobile/components/ui/[nombre].tsx`. Es código tuyo — podés modificarlo libremente.

### Componentes instalados

| Componente | Archivo | Uso |
|---|---|---|
| Button | `components/ui/button.tsx` | Acciones primarias |
| Text | `components/ui/text.tsx` | Tipografía con variantes |
| Separator | `components/ui/separator.tsx` | Divisores visuales |
| Progress | `components/ui/progress.tsx` | Barras de progreso |

### `cn()` helper

Usar para merge condicional de clases:

```tsx
import { cn } from '../../lib/utils'

<View className={cn(
  "rounded-full items-center justify-center w-[32px] h-[32px]",
  isSelected ? "bg-white" : "bg-[#262A35]"
)} />
```

## Navegación

- **React Navigation** con `createMaterialTopTabNavigator`
- Tabs en la parte superior
- `useFocusEffect` para recargar datos al volver a un tab

```tsx
import { useFocusEffect } from '@react-navigation/native'
import { useCallback } from 'react'

useFocusEffect(
  useCallback(() => {
    fetchGastos()
  }, [mes])
)
```

## KeyboardAvoidingView

En Android usar `behavior={undefined}`. El valor `"height"` deja espacio blanco al cerrar el teclado.

```tsx
<KeyboardAvoidingView
  className="flex-1 bg-[#111217]"
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
>
```

## PortalHost

Debe estar en `App.tsx` después del `NavigationContainer` para que componentes como modales y popovers funcionen correctamente.

```tsx
import { PortalHost } from '@rn-primitives/portal'

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>...</Tab.Navigator>
      <PortalHost />
    </NavigationContainer>
  )
}
```
