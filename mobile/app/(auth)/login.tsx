import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Alert } from '../../components/ui/Alert'
import { EmailVerificationInput } from '../../components/ui/EmailVerificationInput'
import { Notification } from '../../components/ui/Notification'
import { OtpVerification } from '../../components/ui/OtpVerification'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabase'
import { isValidEmail } from '../../lib/utils'

export default function LoginScreen() {
  // --- STATES ---
  const [email, setEmail] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)

  const [otpError, setOtpError] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  const [alertConfig, setAlertConfig] = useState<{ visible: boolean; message: string; type: 'warning' | 'error' | 'info' }>({ visible: false, message: '', type: 'info' })
  const [notificationConfig, setNotificationConfig] = useState<{ visible: boolean; message: string; type: 'success' | 'warning' | 'error' | 'info' }>({ visible: false, message: '', type: 'success' })

  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { triggerMockSession } = useAuth()

  // --- DERIVED STATES ---
  const isEditing = email !== pendingEmail && isValidEmail(email)
  const isVerifying = email === pendingEmail && pendingEmail.length > 0

  // --- EFFECTS ---
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (cooldownSeconds > 0) {
      interval = setInterval(() => {
        setCooldownSeconds((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [cooldownSeconds])

  useEffect(() => {
    if (token.length === 6 && isVerifying && !loading && !otpError) {
      handleVerifyOtp()
    }
  }, [token, isVerifying, loading, otpError])

  // --- HANDLERS ---
  const showAlert = (message: string, type: 'warning' | 'error' | 'info') => {
    setAlertConfig({ visible: true, message, type })
    setTimeout(() => {
      setAlertConfig(prev => ({ ...prev, visible: false }))
    }, 3000)
  }

  const showNotification = (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'success') => {
    setNotificationConfig({ visible: true, message, type })
    setTimeout(() => {
      setNotificationConfig(prev => ({ ...prev, visible: false }))
    }, 3000)
  }

  const handleSendOtp = async () => {
    if (!email.trim()) return
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
      },
    })

    setLoading(false)

    if (error) {
      const match = error.message.match(/after (\d+) second/i)
      if (match) {
        setCooldownSeconds(parseInt(match[1], 10))
      } else if (error.message.includes('rate limit')) {
        showAlert('Demasiados intentos. Espera unos minutos para volver a intentar.', 'error')
      } else {
        showAlert(error.message, 'error')
      }
      return
    }

    setPendingEmail(email.trim())
    setToken('')
    setOtpError(false)
  }

  const handleVerifyOtp = async () => {
    if (token.length !== 6 || !email) return

    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email: pendingEmail,
      token,
      type: 'email',
    })
    setLoading(false)

    if (error) {
      setOtpError(true)
    } else {
      showNotification('Verificación exitosa.', 'success')
      // En modo mock, AuthContext no intercepta el evento de auth (porque el SDK mockeado no despacha onAuthStateChange igual),
      // así que disparamos la sesión mockeada manualmente para QA.
      // ¡Esto no afectará producción ya que EXPO_PUBLIC_USE_MOCKS es falso en build!
      if (process.env.EXPO_PUBLIC_USE_MOCKS === 'true' && triggerMockSession) {
        setTimeout(() => triggerMockSession(), 1000)
      }
    }
  }

  const handleOtpChange = (val: string) => {
    setToken(val.replace(/[^0-9]/g, '').slice(0, 6))
    if (otpError) setOtpError(false)
  }

  const handleResend = async () => {
    if (!pendingEmail) return
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email: pendingEmail,
      options: {
        shouldCreateUser: true,
      },
    })

    setLoading(false)
    if (error) {
      const match = error.message.match(/after (\d+) second/i)
      if (match) {
        setCooldownSeconds(parseInt(match[1], 10))
      } else {
        showAlert(error.message, 'error')
      }
    } else {
      showNotification('Código reenviado', 'info')
    }
  }

  // --- RENDER ---
  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 40,
            paddingBottom: 220 + insets.bottom,
            alignItems: 'center'
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full max-w-[350px] flex-col items-start gap-xl">
            <View className="w-full flex-col items-start gap-sm">
              <Text className="text-foreground font-['Inter'] text-title font-semibold leading-[normal]">
                {isVerifying ? 'Verificar email' : 'Ingresar'}
              </Text>
            </View>

            <View className="w-full flex-col items-center gap-xl">

              {/* EMAIL INPUT SHOWCASE */}
              <View className="w-full flex-col items-start gap-sm">
                <Text
                  className="text-muted-foreground font-['Inter'] text-body font-normal leading-[normal]"
                  numberOfLines={1}
                >
                  Tu email
                </Text>

                <EmailVerificationInput
                  value={email}
                  onChangeText={setEmail}
                  isVerifying={isVerifying}
                  isEditing={isEditing}
                />
              </View>

              {/* ACTION BUTTON (Send OTP) */}
              {!isVerifying && isValidEmail(email) && (
                <View className="w-full flex-col items-center gap-lg">
                  <Pressable
                    onPress={handleSendOtp}
                    disabled={loading}
                    className={`w-full h-[56px] px-xl justify-center items-center rounded-[16px] bg-primary active:opacity-80 ${loading ? 'opacity-50' : ''}`}
                  >
                    <Text className="text-primary-foreground font-['Inter'] text-body font-semibold leading-[normal]">
                      {loading ? 'Enviando...' : 'Enviar código de 6 dígitos'}
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* VERIFY OTP SECTION */}
              {isVerifying && (
                <OtpVerification
                  message="Ingresa el código de 6 dígitos que enviamos a tu email para iniciar sesión."
                  otp={token}
                  onOtpChange={handleOtpChange}
                  error={otpError}
                  onResend={handleResend}
                  loading={loading}
                  cooldownSeconds={cooldownSeconds}
                />
              )}

              {/* ALERTS INLINE */}
              <Alert
                visible={cooldownSeconds > 0 && !isVerifying}
                message={`Por seguridad debes esperar ${cooldownSeconds} segundos para pedir otro código.`}
                type="warning"
                inline={true}
              />
              <Alert
                visible={alertConfig.visible}
                message={alertConfig.message}
                type={alertConfig.type}
                inline={true}
              />

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Notification 
        visible={notificationConfig.visible} 
        message={notificationConfig.message} 
        type={notificationConfig.type}
      />
      </SafeAreaView>  )
}
