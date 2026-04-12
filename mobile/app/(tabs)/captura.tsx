import { useEffect, useRef, useState, useCallback } from 'react'
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
import { useFocusEffect } from 'expo-router'
import { Calendar, CaretDown } from 'phosphor-react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useGastoMutation } from '../../hooks/useGastoMutation'
import { useGastos } from '../../hooks/useGastos'
import { CategorySelector } from '../../components/ui/CategorySelector'
import { PaymentMethodSelector } from '../../components/ui/PaymentMethodSelector'
import { Notification } from '../../components/ui/Notification'
import { Alert } from '../../components/ui/Alert'

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
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [date, setDate] = useState(new Date())
  const [isKeyboardVisible, setKeyboardVisible] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const insets = useSafeAreaInsets()
  
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
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      setKeyboardHeight(e.endCoordinates.height);
      setKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      hideTimeoutRef.current = setTimeout(() => {
        setKeyboardHeight(0);
        setKeyboardVisible(false);
      }, 50);
    });

    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
  const formattedAmount = valores.monto 
    ? parseInt(valores.monto, 10).toLocaleString('es-CL') 
    : ''

  const outerPaddingBottom = isKeyboardVisible ? 0 : 96 + insets.bottom;
  const innerPaddingBottom = isKeyboardVisible 
    ? (Platform.OS === 'ios' ? keyboardHeight + 24 : 24) 
    : 24;

  return (
    <View 
      className="flex-1 bg-background justify-end items-center"
      style={{ paddingBottom: outerPaddingBottom }}
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

      <View 
        className="w-full flex-col items-center px-xl pt-3xl"
        style={{ paddingBottom: innerPaddingBottom }}
      >
        <View className="flex-col items-start gap-lg w-full">
          <View className="flex-row justify-end items-center w-full mb-sm">
            <Text className="text-muted-foreground text-[40px] font-light mr-xs">$</Text>
            <TextInput
              ref={montoRef}
              value={formattedAmount}
              onChangeText={handleAmountChange}
              placeholder="0"
              keyboardType="numeric"
              returnKeyType="next"
              onSubmitEditing={() => descripcionRef.current?.focus()}
              editable={estado !== 'loading'}
              className={`text-[40px] font-light p-0 m-0 min-w-[30px] text-right placeholder:text-muted-foreground caret-foreground ${valores.monto ? 'text-foreground' : 'text-muted-foreground'} ${estado === 'loading' ? 'opacity-50' : ''}`}
            />
          </View>

          <View className="flex-row py-lg justify-between items-center w-full">
            <TextInput
              ref={descripcionRef}
              value={valores.item}
              onChangeText={(val) => handleChange('item', val)}
              placeholder="Descripción..."
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              editable={estado !== 'loading'}
              className={`flex-1 text-body text-right p-0 m-0 w-full placeholder:text-muted-foreground caret-foreground ${valores.item ? 'text-foreground' : 'text-muted-foreground'} ${estado === 'loading' ? 'opacity-50' : ''}`}
            />
          </View>

          <View className="flex-row justify-end items-center gap-sm w-full">
            {estado === 'loading' && <ActivityIndicator size="small" color="#E98B00" className="mr-2" />}
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
    </View>
  )
}