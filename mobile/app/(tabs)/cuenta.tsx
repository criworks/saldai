import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert } from '../../components/ui/Alert';
import { EmailVerificationInput } from '../../components/ui/EmailVerificationInput';
import { Notification } from '../../components/ui/Notification';
import { OtpVerification } from '../../components/ui/OtpVerification';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { isValidEmail } from '../../lib/utils';

export default function CuentaScreen() {
  // --- STATES ---
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const [otpError, setOtpError] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [alertConfig, setAlertConfig] = useState<{ visible: boolean; message: string; type: 'warning' | 'error' | 'info' }>({ visible: false, message: '', type: 'info' });
  const [notificationConfig, setNotificationConfig] = useState<{ visible: boolean; message: string; type: 'success' | 'warning' | 'error' | 'info' }>({ visible: false, message: '', type: 'success' });

  const insets = useSafeAreaInsets();

  const isEditing = email !== originalEmail && isValidEmail(email) && email !== pendingEmail;
  const isVerifying = email === pendingEmail && pendingEmail !== originalEmail && pendingEmail.length > 0;

  // --- EFFECTS ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cooldownSeconds > 0) {
      interval = setInterval(() => {
        setCooldownSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (session?.user?.email && !pendingEmail) {
      if (email === '' || email === originalEmail) {
        setEmail(session.user.email);
      }
      setOriginalEmail(session.user.email);
    }
  }, [session, pendingEmail]);

  useEffect(() => {
    if (otp.length === 6 && isVerifying && !loading && !otpError) {
      handleVerifyOtp();
    }
  }, [otp, isVerifying, loading, otpError]);

  // --- HANDLERS ---
  const showAlert = (message: string, type: 'warning' | 'error' | 'info') => {
    setAlertConfig({ visible: true, message, type });
    setTimeout(() => {
      setAlertConfig(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const showNotification = (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'success') => {
    setNotificationConfig({ visible: true, message, type });
    setTimeout(() => {
      setNotificationConfig(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const handleModifyEmail = async () => {
    if (!email || email === originalEmail) return;

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ email });
    setLoading(false);

    if (error) {
      const match = error.message.match(/after (\d+) second/i);
      if (match) {
        setCooldownSeconds(parseInt(match[1], 10));
      } else {
        showAlert(error.message, 'error');
      }
    } else {
      setPendingEmail(email);
      setOtp('');
      setOtpError(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: pendingEmail,
      token: otp,
      type: 'email_change',
    });
    setLoading(false);

    if (error) {
      setOtpError(true);
    } else {
      showNotification('Email actualizado correctamente.', 'success');
      setOriginalEmail(pendingEmail);

      // En modo mock (Dev/QA), actualizamos el email localmente para visualizar el cambio
      // ya que el AuthContext mockeado no muta su estado interno (test@mock.com) automáticamente.
      // Esta condición es ignorada en producción.
      if (process.env.EXPO_PUBLIC_USE_MOCKS === 'true') {
        setEmail(pendingEmail);
      }

      setPendingEmail('');
      setOtp('');
    }
    };
  const handleOtpChange = (val: string) => {
    setOtp(val.replace(/[^0-9]/g, '').slice(0, 6));
    if (otpError) setOtpError(false);
  };

  const handleResendCode = async () => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ email: pendingEmail });
    setLoading(false);

    if (error) {
      const match = error.message.match(/after (\d+) second/i);
      if (match) {
        setCooldownSeconds(parseInt(match[1], 10));
      } else {
        showAlert(error.message, 'error');
      }
    } else {
      showNotification('Código reenviado. Revisá tu nuevo email.', 'info');
    }
  };

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
              <Text className="text-muted-foreground font-['Inter'] text-title font-normal leading-[normal]">
                Cuenta
              </Text>
            </View>

            <View className="w-full flex-col items-center gap-xl">

              {/* EMAIL INPUT */}
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

              {/* ACTION BUTTON (Modify Email) */}
              {isEditing && (
                <View className="w-full flex-col items-center gap-lg">
                  <Pressable
                    onPress={handleModifyEmail}
                    disabled={loading}
                    className={`w-full h-[56px] px-xl justify-center items-center rounded-[16px] bg-primary active:opacity-80 ${loading ? 'opacity-50' : ''}`}
                  >
                    <Text className="text-primary-foreground font-['Inter'] text-body font-semibold leading-[normal]">
                      {loading ? 'Procesando...' : 'Modificar email'}
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* VERIFY OTP SECTION */}
              {isVerifying && (
                <OtpVerification
                  message="Ingresa el código de 6 dígitos que enviamos a tu nuevo email para confirmar el cambio."
                  otp={otp}
                  onOtpChange={handleOtpChange}
                  error={otpError}
                  onResend={handleResendCode}
                  loading={loading}
                  cooldownSeconds={cooldownSeconds}
                />
              )}

              {/* ALERTS INLINE */}
              <Alert
                visible={cooldownSeconds > 0 && !isVerifying}
                message={`Por seguridad debes esperar ${cooldownSeconds} segundos para volver a hacer un cambio.`}
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
      </SafeAreaView>  );
}
