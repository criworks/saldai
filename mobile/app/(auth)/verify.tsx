import { useState, useRef } from 'react'
import { KeyboardAvoidingView, Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../services/supabase'

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>()
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleVerifyOtp = async () => {
    if (!token.trim() || token.length !== 6 || !email) return

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })

    setLoading(false)

    if (error) {
      console.error('Verify OTP error:', error)
      setError(error.message)
      return
    }

    // El AuthContext detectará la sesión y redirigirá a (tabs)
  }

  const handleResend = async () => {
    if (!email) return
    setError(null)
    setLoading(true)
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    })
    
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setError('Código reenviado') // Usando esto temporalmente como feedback de éxito
      setTimeout(() => setError(null), 3000)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#111217]">
      <KeyboardAvoidingView behavior={undefined} className="flex-1 justify-center px-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text className="text-white text-[24px] font-bold">Verificar email</Text>
            <Text className="text-[#60677D] text-[14px]">
              Ingresa el código de 6 dígitos que enviamos a{' '}
              <Text className="text-white">{email}</Text>.
            </Text>
          </View>

          <TextInput
            className="bg-[#262A35] text-white text-[20px] tracking-[10px] text-center rounded-xl px-4 h-[52px]"
            placeholder="000000"
            placeholderTextColor="#60677D"
            keyboardType="number-pad"
            maxLength={6}
            value={token}
            onChangeText={(text) => {
              setToken(text)
            }}
          />

          {error && (
            <Text className={`text-[14px] ${error === 'Código reenviado' ? 'text-green-500' : 'text-[#a65b5b]'}`}>
              {error}
            </Text>
          )}

          <Pressable
            onPress={handleVerifyOtp}
            disabled={loading || token.length !== 6}
            className={`bg-white rounded-xl h-[52px] items-center justify-center active:opacity-80 ${loading || token.length !== 6 ? 'opacity-50' : ''}`}
          >
            <Text className="text-[#111217] text-[16px] font-medium">
              {loading ? 'Verificando...' : 'Verificar'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleResend}
            disabled={loading}
            className="mt-2 py-2"
          >
            <Text className="text-[#60677D] text-[14px] text-center underline">
              Reenviar código
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            disabled={loading}
            className="py-2"
          >
            <Text className="text-[#60677D] text-[14px] text-center">
              Usar otro email
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
