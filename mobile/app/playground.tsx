import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '../components/ui/text';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/Input';
import { Notification } from '../components/ui/Notification';
import { Alert } from '../components/ui/Alert';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Separator } from '../components/ui/separator';
import { ExpenseItem } from '../components/ui/ExpenseItem';
import { CategorySelector } from '../components/ui/CategorySelector';
import { PaymentMethodSelector } from '../components/ui/PaymentMethodSelector';
import { OtpInput } from '../components/ui/OtpInput';
import { router } from 'expo-router';
import { mockFeedConfig } from '../services/mockConfig';

export default function UIPlayground() {
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [alert, setAlert] = useState<{ message: string, type: 'success' | 'warning' | 'error' | 'info' } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('tc');

  if (!__DEV__) return null;

  return (
    <View className="flex-1 bg-background">
      {/* Absolute overlays */}
      <Alert 
        visible={!!alert} 
        message={alert?.message || ''} 
        type={alert?.type} 
      />
      
      {notification && (
        <Notification
          visible={!!notification}
          message={notification.message}
          type={notification.type}
        />
      )}

      <ScrollView className="flex-1" contentContainerClassName="p-4 pb-20">
        <View className="flex-row items-center justify-between mb-6 mt-10">
          <Text className="text-3xl font-bold text-foreground">🎨 UI Playground</Text>
          <Button variant="outline" onPress={() => router.push('/')}>
            <Text>Ir a Inicio</Text>
          </Button>
        </View>

        {/* DOMAIN COMPONENTS */}
        <View className="mb-8">
          <SectionHeader title="Componentes de Dominio" />
          
          <Text className="mb-2 text-foreground font-semibold mt-4">Expense Item:</Text>
          <View className="gap-2">
            <ExpenseItem 
              id="1"
              monto="$15,000.00"
              titulo="Uber Al Aeropuerto"
            />
            <ExpenseItem 
              id="2"
              monto="$4,500.00"
              titulo="Café Starbucks"
            />
          </View>

          <Text className="mb-2 text-foreground font-semibold mt-6">Category Selector:</Text>
          <CategorySelector 
            selectedCategory={selectedCategory || ''} 
            onSelectCategory={setSelectedCategory} 
          />

          <Text className="mb-2 text-foreground font-semibold mt-6">Payment Method Selector:</Text>
          <PaymentMethodSelector 
            method={selectedMethod} 
            onSelectMethod={setSelectedMethod} 
          />
        </View>

        <Separator className="mb-8" />

        {/* TYPOGRAPHY */}
        <View className="mb-8">
          <SectionHeader title="Tipografía" />
          <View className="mt-4 gap-2">
            <Text className="text-4xl font-bold text-foreground">H1 - Título Principal</Text>
            <Text className="text-3xl font-semibold text-foreground">H2 - Subtítulo</Text>
            <Text className="text-2xl font-medium text-foreground">H3 - Sección</Text>
            <Text className="text-xl text-foreground">H4 - Subsección</Text>
            <Text className="text-base text-foreground">Cuerpo - Párrafo normal con un poco más de texto para ver cómo se comporta en múltiples líneas.</Text>
            <Text className="text-sm text-muted-foreground">Texto secundario o mutado</Text>
          </View>
        </View>

        <Separator className="mb-8" />

        {/* BUTTONS */}
        <View className="mb-8">
          <SectionHeader title="Botones" />
          <View className="mt-4 gap-4">
            <Button variant="default">
              <Text>Primary Button</Text>
            </Button>
            <Button variant="secondary">
              <Text>Secondary Button</Text>
            </Button>
            <Button variant="destructive">
              <Text>Destructive Button</Text>
            </Button>
            <Button variant="outline">
              <Text>Outline Button</Text>
            </Button>
            <Button variant="ghost">
              <Text>Ghost Button</Text>
            </Button>
            <Button variant="link">
              <Text>Link Button</Text>
            </Button>
            <Button disabled>
              <Text>Disabled Button</Text>
            </Button>
          </View>
        </View>

        <Separator className="mb-8" />

        {/* INPUTS */}
        <View className="mb-8">
          <SectionHeader title="Inputs & Form" />
          <View className="mt-4 gap-4">
            <Input placeholder="Input default" />
            <Input placeholder="Input con valor" defaultValue="Valor ingresado" />
            <Input placeholder="Input deshabilitado" editable={false} className="opacity-50" />
          </View>
        </View>

        <Separator className="mb-8" />

        {/* OTP INPUT */}
        <View className="mb-8">
          <SectionHeader title="OTP Input (Auth)" />
          <View className="mt-4 gap-6">
            <View>
               <Text className="mb-2 text-foreground font-semibold">Estado Normal:</Text>
               <OtpInput value="12" onChangeText={() => {}} />
            </View>
            <View>
               <Text className="mb-2 text-foreground font-semibold">Estado de Error:</Text>
               <OtpInput value="123456" onChangeText={() => {}} error={true} />
            </View>
          </View>
        </View>

        <Separator className="mb-8" />

        {/* NOTIFICATIONS & ALERTS */}
        <View className="mb-8">
          <SectionHeader title="Notificaciones & Alertas" />
          
          <Text className="mb-2 text-foreground font-semibold mt-4">Notifications (auto-hide):</Text>
          <View className="gap-4 flex-row flex-wrap">
            <Button 
              className="flex-1"
              onPress={() => setNotification({ message: 'Operación exitosa!', type: 'success' })}
            >
              <Text>Notif Success</Text>
            </Button>
            <Button 
              variant="destructive"
              className="flex-1"
              onPress={() => setNotification({ message: 'Ocurrió un error grave.', type: 'error' })}
            >
              <Text>Notif Error</Text>
            </Button>
          </View>

          <Text className="mb-2 text-foreground font-semibold mt-6">Alerts (Overlay):</Text>
          <View className="gap-4 flex-row flex-wrap">
            <Button 
              className="flex-1"
              variant="outline"
              onPress={() => {
                setAlert({ message: 'Alert Informativa', type: 'info' });
                setTimeout(() => setAlert(null), 3000);
              }}
            >
              <Text>Alert Info</Text>
            </Button>
            <Button 
              className="flex-1"
              variant="outline"
              onPress={() => {
                setAlert({ message: 'Alert Warning', type: 'warning' });
                setTimeout(() => setAlert(null), 3000);
              }}
            >
              <Text>Alert Warning</Text>
            </Button>
          </View>
        </View>

        <Separator className="mb-8" />

        {/* FEED MOCK CONTROLS */}
        <View className="mb-8">
          <SectionHeader title="Controladores Mock (Feed)" />
          <Text className="text-muted-foreground text-sm mb-4">
            Usa estos botones para cambiar el estado global de la data falsa. Luego ve al tab "Inicio" (o haz pull to refresh) para ver el resultado.
          </Text>
          <View className="mt-4 gap-4">
            <Button variant="outline" onPress={() => { mockFeedConfig.state = 'normal'; setNotification({ message: 'Feed configurado: Normal', type: 'success' }) }}>
              <Text>Mock: Normal (4 items)</Text>
            </Button>
            <Button variant="outline" onPress={() => { mockFeedConfig.state = 'empty'; setNotification({ message: 'Feed configurado: Vacío', type: 'success' }) }}>
              <Text>Mock: Lista Vacía (0 items)</Text>
            </Button>
            <Button variant="outline" onPress={() => { mockFeedConfig.state = 'huge'; setNotification({ message: 'Feed configurado: Lista Gigante', type: 'success' }) }}>
              <Text>Mock: Lista Gigante (150 items)</Text>
            </Button>
            <Button variant="outline" onPress={() => { mockFeedConfig.state = 'loading'; setNotification({ message: 'Feed configurado: Cargando', type: 'success' }) }}>
              <Text>Mock: Carga Infinita</Text>
            </Button>
            <Button variant="outline" onPress={() => { mockFeedConfig.state = 'error'; setNotification({ message: 'Feed configurado: Error', type: 'success' }) }}>
              <Text>Mock: Forzar Error de Red</Text>
            </Button>
          </View>
        </View>

        <Separator className="mb-8" />

        {/* UI EDGE CASES */}
        <View className="mb-8">
          <SectionHeader title="Casos Borde de UI (Limites)" />
          <Text className="text-muted-foreground text-sm mb-4">
            Verifica cómo los componentes se comportan ante textos o valores extremos.
          </Text>
          
          <Text className="mb-2 text-foreground font-semibold mt-4">Expense Item (Texto muy largo):</Text>
          <View className="gap-2">
            <ExpenseItem 
              id="edge-1"
              monto="$1,500.00"
              titulo="Compra en supermercado que tiene un nombre de item ridículamente largo para probar si el texto hace wrap a multiples líneas o si rompe el layout y se sale de la pantalla"
            />
          </View>

          <Text className="mb-2 text-foreground font-semibold mt-6">Expense Item (Monto extremo):</Text>
          <View className="gap-2">
            <ExpenseItem 
              id="edge-2"
              monto="$999,999,999,999.00"
              titulo="Café"
            />
          </View>
          
          <Text className="mb-2 text-foreground font-semibold mt-6">Expense Item (Todo extremo):</Text>
          <View className="gap-2">
            <ExpenseItem 
              id="edge-3"
              monto="$99,999,999.00"
              titulo="Transferencia interbancaria internacional para compra de maquinaria pesada"
            />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
