import React, { useEffect, useState, useRef } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable, Alert, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { Input } from '../../components/ui/Input';
import { WarningCircle, PencilSimple } from 'phosphor-react-native';

export default function CuentaScreen() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const otpInputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Only update the email from session if we are not actively in the middle of a change
    if (session?.user?.email && !pendingEmail) {
      // Don't overwrite what the user is typing if they are just editing
      if (email === '' || email === originalEmail) {
        setEmail(session.user.email);
      }
      setOriginalEmail(session.user.email);
    }
  }, [session, pendingEmail]);

  const isEditing = email !== originalEmail && email.trim().length > 0 && email !== pendingEmail;
  const isVerifying = email === pendingEmail && pendingEmail !== originalEmail && pendingEmail.length > 0;

  const handleModifyEmail = async () => {
    if (!email || email === originalEmail) return;
    
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ email });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      // Supabase sends a confirmation link/OTP to BOTH the old and new email addresses.
      // The user must verify the new email address.
      setPendingEmail(email);
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
      Alert.alert('Error de verificación', 'El código es incorrecto o ha expirado. ' + error.message);
    } else {
      Alert.alert('Éxito', 'Tu email ha sido actualizado correctamente.');
      setOriginalEmail(pendingEmail);
      setPendingEmail('');
      setOtp('');
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    // Calling updateUser again resends the email change OTP
    const { error } = await supabase.auth.updateUser({ email: pendingEmail });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Código reenviado', 'Revisá tu nuevo email.');
    }
  };

  // UI Helpers
  const renderOtpDots = () => {
    const dots = [];
    for (let i = 0; i < 6; i++) {
      const char = otp[i] || '•';
      dots.push(
        <Text key={i} className={`text-[18px] font-normal font-['Inter'] leading-[normal] ${otp[i] ? 'text-foreground' : 'text-muted-foreground'}`}>
          {char}
        </Text>
      );
    }
    return dots;
  };

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
          <View className="w-full max-w-[350px] flex-col items-start gap-[24px]">
            <View className="w-full flex-col items-start gap-[8px]">
              <Text className="text-muted-foreground font-['Inter'] text-[24px] font-normal leading-[normal]">
                Cuenta
              </Text>
            </View>
            
            <View className="w-full flex-col items-center gap-[24px]">
              
              {/* EMAIL INPUT (Always visible and editable) */}
              <View className="w-full flex-col items-start gap-[8px]">
                <Text 
                  className="text-muted-foreground font-['Inter'] text-[14px] font-normal leading-[normal]"
                  numberOfLines={1}
                >
                  Tu email
                </Text>
                
                <View className="w-full relative justify-center">
                  <Input 
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="tu@email.com"
                    className={`w-full pr-[48px] ${isEditing || isVerifying ? 'border-2 border-muted-foreground' : 'border border-transparent'}`}
                  />
                  <View className="absolute right-[16px] pointer-events-none">
                    <PencilSimple size={18} color="hsl(var(--muted-foreground))" weight="fill" />
                  </View>
                </View>
              </View>

              {/* ACTION BUTTON (Modify Email) */}
              {isEditing && (
                <View className="w-full flex-col items-center gap-[16px]">
                  <Pressable
                    onPress={handleModifyEmail}
                    disabled={loading}
                    className={`w-full h-[56px] px-[24px] justify-center items-center rounded-[16px] bg-primary active:opacity-80 ${loading ? 'opacity-50' : ''}`}
                  >
                    <Text className="text-primary-foreground font-['Inter'] text-[14px] font-semibold leading-[normal]">
                      {loading ? 'Procesando...' : 'Modificar email'}
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* VERIFY OTP SECTION */}
              {isVerifying && (
                <View className="w-full flex-col items-center gap-[24px]">
                  <View className="w-full p-[24px] flex-col items-start gap-[16px] rounded-[16px] border border-warning-border">
                    <View className="flex-row items-start gap-[16px]">
                      <WarningCircle size={18} color="hsl(var(--warning))" weight="fill" />
                      <Text className="flex-1 text-warning font-['Inter'] text-[12px] font-normal leading-[normal]">
                        Ingresa el código de 6 dígitos que enviamos a tu nuevo email para confirmar el cambio.
                      </Text>
                    </View>
                  </View>

                  <View className="w-full flex-col items-start gap-[8px]">
                    <Text 
                      className="text-muted-foreground font-['Inter'] text-[14px] font-normal leading-[normal]"
                      numberOfLines={1}
                    >
                      Ingresa el código de verificación
                    </Text>
                    
                    {/* Hidden Input for OTP */}
                    <TextInput
                      ref={otpInputRef}
                      value={otp}
                      onChangeText={(val) => setOtp(val.replace(/[^0-9]/g, '').slice(0, 6))}
                      keyboardType="numeric"
                      maxLength={6}
                      className="absolute w-[1px] h-[1px] opacity-0"
                      autoFocus={true}
                    />

                    {/* Visual OTP Input mimicking the design */}
                    <Pressable 
                      className="w-full h-[56px] px-[24px] flex-row justify-center items-center gap-[16px] rounded-[16px] bg-secondary"
                      onPress={() => otpInputRef.current?.focus()}
                    >
                      {renderOtpDots()}
                    </Pressable>
                  </View>

                  <View className="w-full flex-col items-center gap-[16px] mt-[8px]">
                    <Pressable
                      onPress={handleVerifyOtp}
                      disabled={otp.length !== 6 || loading}
                      className={`w-full h-[56px] px-[24px] justify-center items-center rounded-[16px] bg-primary ${otp.length !== 6 || loading ? 'opacity-40' : 'active:opacity-80'}`}
                    >
                      <Text className="text-primary-foreground font-['Inter'] text-[14px] font-semibold leading-[normal]">
                        {loading ? 'Verificando...' : 'Verificar'}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={handleResendCode}
                      disabled={loading}
                      className="w-full py-[16px] px-[24px] justify-center items-center rounded-[16px] active:opacity-80"
                    >
                      <Text className="text-muted-foreground font-['Inter'] text-[14px] font-medium leading-[normal]">
                        Reenviar código
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
