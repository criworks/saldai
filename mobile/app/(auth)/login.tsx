import React, { useState, useEffect } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View, Text, Pressable } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../services/supabase'
import { Input } from '../../components/ui/Input'
import { Alert } from '../../components/ui/Alert'
import { Notification } from '../../components/ui/Notification'
import { useRouter } from 'expo-router'
import { Clock } from 'phosphor-react-native'
import { OtpInput } from '../../components/ui/OtpInput'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginScreen() {
  // --- STATES ---
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  
  const [isEmailFocused, setIsEmailFocused] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [otpError, setOtpError] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  
  const [alertConfig, setAlertConfig] = useState<{ visible: boolean; message: string; type: 'warning' | 'error' | 'info' }>({ visible: false, message: '', type: 'info' })
  const [showSuccess, setShowSuccess] = useState(false)

  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { triggerMockSession } = useAuth()

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
        showAlert('Demasiados intentos. Esperá unos minutos y volvé a intentar.', 'error')
      } else {
        showAlert(error.message, 'error')
      }
      return
    }

    setIsVerifying(true)
    setToken('')
    setOtpError(false)
  }

  const handleVerifyOtp = async () => {
    if (token.length !== 6 || !email) return

    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: 'email',
    })
    setLoading(false)

    if (error) {
      setOtpError(true)
    } else {
      setShowSuccess(true)
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
    if (!email) return
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
      } else {
        showAlert(error.message, 'error')
      }
    } else {
      showAlert('Código reenviado', 'info')
    }
  }

  const handleUseAnotherEmail = () => {
    setIsVerifying(false)
    setToken('')
    setOtpError(false)
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
                
                <View className="w-full relative justify-center">
                  <Input 
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setIsEmailFocused(true)}
                    onBlur={() => setIsEmailFocused(false)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="tu@email.com"
                    editable={!isVerifying && !loading}
                    className={`w-full ${isVerifying ? 'pr-4xl border border-transparent text-muted-foreground' : isEmailFocused ? 'border-2 border-muted-foreground' : 'border border-transparent'}`}
                  />
                  {isVerifying && (
                    <View className="absolute right-lg pointer-events-none">
                      <Clock size={18} color="#E98B00" weight="fill" />
                    </View>
                  )}
                </View>
              </View>

              {/* ACTION BUTTON (Send OTP) */}
              {!isVerifying && email.trim().length > 0 && (
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
                <>
                  <View className="w-full p-xl flex-col justify-center items-start gap-lg rounded-[16px] border border-warning-border">
                    <View className="justify-center items-start gap-lg rounded-[16px]">
                      <Clock size={18} color="#E98B00" weight="fill" />
                    </View>
                    <Text className="text-warning font-['Inter'] text-detail font-normal leading-[normal]">
                      Ingresa el código de 6 dígitos para iniciar sesión.
                    </Text>
                  </View>

                  <View className="w-full flex-col items-start gap-sm">
                    <Text 
                      className="text-muted-foreground font-['Inter'] text-body font-normal leading-[normal]"
                      numberOfLines={1}
                    >
                      Ingresa el código de verificación
                    </Text>
                    
                    <OtpInput 
                      value={token} 
                      onChangeText={handleOtpChange} 
                      error={otpError} 
                    />
                    
                    {otpError && (
                      <Text className="text-destructive font-['Inter'] text-detail font-normal leading-[normal] mt-sm">
                        Código incorrecto o ha expirado. Intenta nuevamente.
                      </Text>
                    )}
                  </View>

                  <View className="w-full flex-col items-center gap-sm mt-lg">
                    <Pressable
                      onPress={handleResend}
                      disabled={loading || cooldownSeconds > 0}
                      className="w-full py-md px-xl justify-center items-center rounded-[16px] active:opacity-80"
                    >
                      <Text className="text-muted-foreground font-['Inter'] text-body font-medium leading-[normal]">
                        {cooldownSeconds > 0 ? `Reenviar en ${cooldownSeconds}s` : 'Reenviar código'}
                      </Text>
                    </Pressable>
                    
                    <Pressable
                      onPress={handleUseAnotherEmail}
                      disabled={loading}
                      className="w-full py-md px-xl justify-center items-center rounded-[16px] active:opacity-80"
                    >
                      <Text className="text-muted-foreground font-['Inter'] text-body font-medium leading-[normal]">
                        Usar otro email
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
              
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Notification 
        visible={showSuccess} 
        message="Verificación exitosa." 
        type="success"
      />
      <Alert 
        visible={cooldownSeconds > 0 && !isVerifying} 
        message={`Por seguridad debes esperar ${cooldownSeconds} segundos para pedir otro código.`}
        type="warning"
      />
      <Alert 
        visible={alertConfig.visible} 
        message={alertConfig.message} 
        type={alertConfig.type}
      />
    </SafeAreaView>
  )
}