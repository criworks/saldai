import { useState } from 'react'
import { KeyboardAvoidingView, Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '../../services/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSendOtp = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError(null)

    console.log('Sending OTP to:', email.trim())

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
      },
    })

    setLoading(false)

    if (error) {
      console.error('OTP error:', error)
      if (error.message.includes('rate limit')) {
        setError('Demasiados intentos. Esperá unos minutos y volvé a intentar.')
      } else {
        setError(error.message)
      }
      return
    }

    // Navigate to verify screen with email as parameter
    router.push({
      pathname: '/(auth)/verify',
      params: { email: email.trim() }
    })
  }

  return (
    <SafeAreaView className="flex-1 bg-[#111217]">
      <KeyboardAvoidingView behavior={undefined} className="flex-1 justify-center px-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text className="text-white text-[24px] font-bold">Ingresar</Text>
            <Text className="text-[#60677D] text-[14px]">
              Te enviamos un código de 6 dígitos a tu email.
            </Text>
          </View>

          <TextInput
            className="bg-[#262A35] text-white text-[16px] rounded-xl px-4 h-[52px]"
            placeholder="tu@email.com"
            placeholderTextColor="#60677D"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />

          {error && (
            <Text className="text-[#a65b5b] text-[14px]">{error}</Text>
          )}

          <Pressable
            onPress={handleSendOtp}
            disabled={loading || !email.trim()}
            className={`bg-white rounded-xl h-[52px] items-center justify-center active:opacity-80 ${loading || !email.trim() ? 'opacity-50' : ''}`}
          >
            <Text className="text-[#111217] text-[16px] font-medium">
              {loading ? 'Enviando...' : 'Enviar código'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
