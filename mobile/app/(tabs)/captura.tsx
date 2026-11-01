import { formatearNumero } from '@saldai/core'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  Keyboard,
  DeviceEventEmitter,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Calendar, CaretDown } from 'phosphor-react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CategorySelector, PaymentMethodSelector, useGastoMutation } from '@/features/gastos'
import { Input } from '@/components/ui/Input'
import { Notification } from '@/components/ui/Notification'
import { Alert } from '@/components/ui/Alert'
import { colors } from '@/constants/theme'
import { CATEGORIAS_VISIBLES, METODOS_VISIBLES } from '@/lib/funciones'

export default function CapturaScreen() {
  const {
    valores,
    metodo,
    setMetodo,
    estado,
    mensaje,
    handleChange,
    guardarGasto,
    listo,
    lastSaved,
    categoriaInferida,
  } = useGastoMutation()

  const montoRef = useRef<TextInput>(null)
  const descripcionRef = useRef<TextInput>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [date, setDate] = useState(new Date())
  const insets = useSafeAreaInsets()

  // Altura del teclado como shared value, actualizada en el hilo de UI
  // siguiendo la animación real del sistema cuadro a cuadro. Es lo que hace
  // que el form acompañe al teclado en vez de saltar cuando ya terminó.
  const { height: alturaTeclado } = useReanimatedKeyboardAnimation()
  
  // Custom Alert para manejar los mensajes de error devueltos por la mutation
  const [alertConfig, setAlertConfig] = useState<{ visible: boolean; message: string; type: 'error' | 'warning' | 'info' }>({ visible: false, message: '', type: 'error' })

  useEffect(() => {
    if (estado === 'error') {
      setAlertConfig({ visible: true, message: mensaje || 'Error desconocido', type: 'error' })
      setTimeout(() => setAlertConfig(prev => ({ ...prev, visible: false })), 4000)
    }
  }, [estado, mensaje])

  const handleAmountChange = (text: string) => {
    // Solo permitimos números
    const numericValue = text.replace(/[^0-9]/g, '')
    handleChange('monto', numericValue)
  }

  const handleGuardar = () => {
    // La lista no se recarga desde acá: el gasto entra en la caché del mes al
    // guardarlo y la mutación invalida ese mes sola (ver useGastoMutation).
    guardarGasto(() => {
      setTimeout(() => montoRef.current?.focus(), 100)
    })
  }

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('submitCaptura', handleGuardar)
    return () => {
      subscription.remove()
    }
  }, [handleGuardar])

  useFocusEffect(
    useCallback(() => {
      // Screen is focused
      const focusTimeout = setTimeout(() => {
        montoRef.current?.focus()
      }, 100)

      return () => {
        // Screen is losing focus
        clearTimeout(focusTimeout)
        Keyboard.dismiss()
      }
    }, [])
  )

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false)
    if (selectedDate) {
      setDate(selectedDate)
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const selectedDay = new Date(selectedDate)
      selectedDay.setHours(0, 0, 0, 0)
      
      const diffTime = Math.abs(today.getTime() - selectedDay.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) {
        handleChange('fecha', 'Hoy')
      } else if (diffDays === 1 && selectedDay < today) {
        handleChange('fecha', 'Ayer')
      } else {
        const dd = String(selectedDate.getDate()).padStart(2, '0')
        const mm = String(selectedDate.getMonth() + 1).padStart(2, '0')
        const yyyy = selectedDate.getFullYear()
        handleChange('fecha', `${dd}/${mm}/${yyyy}`)
      }
    }
  }

  // Formato con separadores de miles para Chile
  const formattedAmount = valores.monto ? formatearNumero(parseInt(valores.monto, 10)) : ''

  // El form está anclado abajo en los dos estados del diseño; lo único que
  // cambia es qué ocupa el espacio debajo: el footer, o el teclado. Un solo
  // valor cubre los dos, así que la transición entre ellos es continua y no
  // hay booleano de "teclado visible" del que salgan saltos.
  const espacioFooter = 96 + insets.bottom
  const estiloEspacio = useAnimatedStyle(() => ({
    // `height` llega negativa (el signo sirve para un translateY directo);
    // acá hace falta la magnitud.
    paddingBottom: Math.max(Math.abs(alturaTeclado.value), espacioFooter),
  }))

  return (
    <Pressable
      // Tocar fuera de los campos baja el teclado. Los taps sobre un input o
      // sobre el chip de fecha los atiende ese elemento y no llegan acá.
      accessible={false}
      onPress={() => Keyboard.dismiss()}
      className="flex-1 bg-background justify-end items-center"
    >
      <Alert 
        visible={alertConfig.visible} 
        message={alertConfig.message} 
        type={alertConfig.type} 
      />
      <Notification 
        visible={estado === 'ok' && lastSaved !== null}
        monto={lastSaved?.monto || ''}
        descripcion={lastSaved?.descripcion || ''}
        type="success"
      />

      <Animated.View style={[{ width: '100%' }, estiloEspacio]}>
        <View className="w-full flex-col items-center px-xl pt-3xl pb-lg">
        <View className="flex-col items-start gap-lg w-full">
          <View className="flex-row justify-end items-center w-full mb-sm">
            <Text className="text-muted-foreground text-display font-light mr-xs">$</Text>
            <Input
              variante="sin-fondo"
              ref={montoRef}
              value={formattedAmount}
              onChangeText={handleAmountChange}
              placeholder="0"
              keyboardType="numeric"
              returnKeyType="next"
              onSubmitEditing={() => descripcionRef.current?.focus()}
              editable={estado !== 'loading'}
              className={`text-display font-light min-w-[30px] text-right ${estado === 'loading' ? 'opacity-50' : ''}`}
            />
          </View>

          <View className="flex-row py-lg justify-between items-center w-full">
            <Input
              variante="sin-fondo"
              ref={descripcionRef}
              value={valores.item}
              onChangeText={(val) => handleChange('item', val)}
              placeholder="Descripción..."
              maxLength={40}
              returnKeyType="next"
              onSubmitEditing={() => {
                // La tecla de acción del teclado pasa al siguiente campo, que
                // es la fecha. Abrir el picker baja el teclado solo, así que
                // el footer con el check vuelve justo cuando toca guardar.
                Keyboard.dismiss()
                setShowDatePicker(true)
              }}
              editable={estado !== 'loading'}
              className={`flex-1 text-body text-right w-full ${estado === 'loading' ? 'opacity-50' : ''}`}
            />
          </View>

          <View className="flex-row justify-end items-center gap-sm w-full">
            {estado === 'loading' && <ActivityIndicator size="small" color={colors.warning} className="mr-2" />}
            <Pressable 
              className={`flex-row px-md py-sm justify-center items-center gap-sm rounded-full bg-secondary ${estado === 'loading' ? 'opacity-50' : ''}`}
              disabled={estado === 'loading'}
              onPress={() => {
                Keyboard.dismiss();
                setShowDatePicker(true);
              }}
            >
              <Calendar size={16} className="text-muted-foreground" />
              <Text className={`text-body font-medium ${valores.fecha ? 'text-foreground' : 'text-muted-foreground'}`}>
                {valores.fecha || 'Hoy'}
              </Text>
              <CaretDown size={16} className="text-muted-foreground" />
            </Pressable>
          </View>

          {/* La categoría se va deduciendo de la descripción mientras se escribe:
              aparece atenuada hasta que un tap la confirma. Apagado en la v1,
              ver CATEGORIAS_VISIBLES. */}
          <View className={`w-full ${estado === 'loading' ? 'opacity-50' : ''}`} pointerEvents={estado === 'loading' ? 'none' : 'auto'}>
            {CATEGORIAS_VISIBLES && (
              <CategorySelector
                selectedCategory={valores.categoria}
                inferredCategory={categoriaInferida}
                onSelectCategory={(cat) => handleChange('categoria', cat)}
              />
            )}
            {METODOS_VISIBLES && (
              <PaymentMethodSelector
                method={metodo}
                onSelectMethod={setMetodo}
              />
            )}
          </View>
        </View>
        </View>
      </Animated.View>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
    </Pressable>
  )
}