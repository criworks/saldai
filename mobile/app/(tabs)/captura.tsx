import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Keyboard,
  DeviceEventEmitter,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useGastoMutation } from '../../hooks/useGastoMutation'
import { useGastos } from '../../hooks/useGastos'
import { CategorySelector } from '../../components/ui/CategorySelector'
import { PaymentMethodSelector } from '../../components/ui/PaymentMethodSelector'
import { SuccessNotification } from '../../components/ui/SuccessNotification'

export default function CapturaScreen() {
  const { fetchGastos } = useGastos()
  const {
    valores,
    metodo,
    setMetodo,
    estado,
    mensaje,
    handleChange,
    guardarGasto,
    listo,
    lastSaved
  } = useGastoMutation()

  const montoRef = useRef<TextInput>(null)
  const descripcionRef = useRef<TextInput>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [date, setDate] = useState(new Date())
  const [isKeyboardVisible, setKeyboardVisible] = useState(false)
  const insets = useSafeAreaInsets()
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleAmountChange = (text: string) => {
    // Solo permitimos números
    const numericValue = text.replace(/[^0-9]/g, '')
    handleChange('monto', numericValue)
  }

  const handleGuardar = () => {
    guardarGasto(() => {
      fetchGastos(true)
      setTimeout(() => montoRef.current?.focus(), 100)
    })
  }

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('submitCaptura', handleGuardar)
    return () => {
      subscription.remove()
    }
  }, [handleGuardar])

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const keyboardDidShowListener = Keyboard.addListener(showEvent, () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
      setKeyboardVisible(true)
    })
    const keyboardDidHideListener = Keyboard.addListener(hideEvent, () => {
      hideTimeoutRef.current = setTimeout(() => {
        setKeyboardVisible(false)
      }, 100)
    })

    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
      keyboardDidShowListener.remove()
      keyboardDidHideListener.remove()
    }
  }, [])

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
  const formattedAmount = valores.monto 
    ? parseInt(valores.monto, 10).toLocaleString('es-CL') 
    : ''

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SuccessNotification 
        visible={estado === 'ok' && lastSaved !== null}
        monto={lastSaved?.monto || ''}
        descripcion={lastSaved?.descripcion || ''}
      />
      
      <View 
        className="flex-1 w-full justify-end items-center px-[24px] pt-[40px]"
        style={{ paddingBottom: isKeyboardVisible ? 24 : 100 + 24 + insets.bottom }}
      >
        <View className="flex-col items-start gap-[16px] w-full">
          <View className="flex-row justify-end items-center w-full mb-[8px]">
            <Text className="text-muted-foreground text-[40px] font-light mr-[4px]">$</Text>
            <TextInput
              ref={montoRef}
              value={formattedAmount}
              onChangeText={handleAmountChange}
              placeholder="0"
              placeholderTextColor="hsl(var(--muted-foreground))"
              keyboardType="numeric"
              returnKeyType="next"
              onSubmitEditing={() => descripcionRef.current?.focus()}
              cursorColor="hsl(var(--foreground))"
              autoFocus={true}
              className={`text-[40px] font-light p-0 m-0 min-w-[30px] text-right ${valores.monto ? 'text-foreground' : 'text-muted-foreground'}`}
            />
          </View>

          <View className="flex-row py-[16px] justify-between items-center w-full">
            <TextInput
              ref={descripcionRef}
              value={valores.item}
              onChangeText={(val) => handleChange('item', val)}
              placeholder="Descripción..."
              placeholderTextColor="hsl(var(--muted-foreground))"
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              cursorColor="hsl(var(--foreground))"
              className={`flex-1 text-[14px] text-right p-0 m-0 w-full ${valores.item ? 'text-foreground' : 'text-muted-foreground'}`}
            />
          </View>

          <View className="flex-row justify-end items-center gap-[8px] w-full">
            <Pressable 
              className="flex-row px-[12px] py-[8px] justify-center items-center gap-[8px] rounded-full bg-secondary"
              onPress={() => setShowDatePicker(true)}
            >
              <Feather name="calendar" size={16} color="hsl(var(--muted-foreground))" />
              <Text className={`text-[14px] font-medium ${valores.fecha ? 'text-foreground' : 'text-muted-foreground'}`}>
                {valores.fecha || 'Hoy'}
              </Text>
              <Feather name="chevron-down" size={16} color="hsl(var(--muted-foreground))" />
            </Pressable>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}
      </View>
      
      {/* Elementos Ocultos */}
      <View className="hidden">
        <CategorySelector 
          selectedCategory={valores.categoria}
          onSelectCategory={(cat) => handleChange('categoria', cat)}
        />
        <PaymentMethodSelector 
          method={metodo}
          onSelectMethod={setMetodo}
        />
      </View>
    </KeyboardAvoidingView>
  )
}