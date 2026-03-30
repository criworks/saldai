import React, { useEffect, useState, useRef } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { Input } from '../../components/ui/Input';
import { Clock, PencilSimple, Check } from 'phosphor-react-native';

export default function CuentaScreen() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  
  // New states for redesign
  const [isOtpFocused, setIsOtpFocused] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  const insets = useSafeAreaInsets();
  const otpInputRef = useRef<TextInput>(null);

  // Blinking cursor effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOtpFocused) {
      setCursorVisible(true);
      interval = setInterval(() => {
        setCursorVisible((v) => !v);
      }, 500);
    } else {
      setCursorVisible(false);
    }
    return () => clearInterval(interval);
  }, [isOtpFocused]);

  useEffect(() => {
    if (session?.user?.email && !pendingEmail) {
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
      setOtpError(true);
    } else {
      setShowSuccess(true);
    }
  };

  // Auto-submit OTP
  useEffect(() => {
    if (otp.length === 6 && isVerifying && !loading && !otpError) {
      handleVerifyOtp();
    }
  }, [otp, isVerifying, loading, otpError]);

  const handleOtpChange = (val: string) => {
    setOtp(val.replace(/[^0-9]/g, '').slice(0, 6));
    if (otpError) setOtpError(false);
  };

  const handleResendCode = async () => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ email: pendingEmail });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Código reenviado', 'Revisá tu nuevo email.');
    }
  };

  const renderOtpDots = () => {
    const dots = [];
    for (let i = 0; i < 6; i++) {
      const char = otp[i];
      const isCurrent = i === otp.length;
      
      let displayChar = '•';
      let colorClass = 'text-muted-foreground';
      
      if (char) {
        displayChar = char;
        colorClass = 'text-foreground';
      } else if (isCurrent && isOtpFocused) {
        displayChar = '|';
        colorClass = cursorVisible ? 'text-foreground' : 'text-transparent';
      }

      dots.push(
        <Text key={i} className={`text-subtitle font-normal font-['Inter'] leading-[normal] ${colorClass}`}>
          {displayChar}
        </Text>
      );
    }
    return dots;
  };

  const otpBorderClass = otpError 
    ? 'border-destructive' 
    : isOtpFocused 
      ? 'border-muted-foreground' 
      : 'border-transparent';

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
                
                <View className="w-full relative justify-center">
                  <Input 
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="tu@email.com"
                    editable={!isVerifying}
                    className={`w-full pr-4xl ${isEditing ? 'border-2 border-muted-foreground' : 'border border-transparent'} ${isVerifying ? 'opacity-80' : ''}`}
                  />
                  <View className="absolute right-lg pointer-events-none">
                    {isVerifying ? (
                      <Clock size={18} color="#E98B00" weight="fill" />
                    ) : (
                      <PencilSimple size={18} className="text-muted-foreground" weight="fill" />
                    )}
                  </View>
                </View>
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
                <View className="w-full flex-col items-center gap-xl">
                  <View className="w-full p-xl flex-col justify-center items-start gap-lg rounded-[16px] border border-warning-border">
                    <View className="justify-center items-start gap-lg rounded-[16px]">
                      <Clock size={18} color="#E98B00" weight="fill" />
                    </View>
                    <Text className="text-warning font-['Inter'] text-detail font-normal leading-[normal]">
                      Ingresa el código de 6 dígitos que enviamos a tu nuevo email para confirmar el cambio.
                    </Text>
                  </View>

                  <View className="w-full flex-col items-start gap-sm">
                    <Text 
                      className="text-muted-foreground font-['Inter'] text-body font-normal leading-[normal]"
                      numberOfLines={1}
                    >
                      Ingresa el código de verificación
                    </Text>
                    
                    {/* Visual OTP Input mimicking the design */}
                    <Pressable 
                      className={`w-full h-[56px] px-xl flex-row justify-center items-center gap-lg rounded-[16px] bg-secondary border-2 ${otpBorderClass}`}
                      onPress={() => otpInputRef.current?.focus()}
                    >
                      {renderOtpDots()}
                    </Pressable>

                    {/* Hidden Input for OTP */}
                    <TextInput
                      ref={otpInputRef}
                      value={otp}
                      onChangeText={handleOtpChange}
                      keyboardType="numeric"
                      maxLength={6}
                      className="absolute w-[1px] h-[1px] opacity-0"
                      autoFocus={true}
                      onFocus={() => setIsOtpFocused(true)}
                      onBlur={() => setIsOtpFocused(false)}
                    />
                    
                    {otpError && (
                      <Text className="text-destructive font-['Inter'] text-detail font-normal leading-[normal] mt-sm">
                        Código incorrecto o ha expirado. Intenta nuevamente.
                      </Text>
                    )}
                  </View>

                  <View className="w-full flex-col items-center gap-sm">
                    <Pressable
                      onPress={handleResendCode}
                      disabled={loading}
                      className="w-full py-lg px-xl justify-center items-center rounded-[16px] active:opacity-80"
                    >
                      <Text className="text-muted-foreground font-['Inter'] text-body font-medium leading-[normal]">
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

      {/* SUCCESS MODAL */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-end items-center">
          <View className="w-full pt-[30px] px-[30px] pb-3xl flex-col items-center gap-xxl rounded-t-[30px] bg-card">
            <View className="flex-col items-center gap-lg w-full">
              <View className="h-4xl w-4xl items-center justify-center rounded-full bg-secondary">
                <Check size={24} color="white" weight="regular" />
              </View>
              <Text className="text-white text-center font-['Inter'] text-body font-normal leading-[19.6px]">
                Tu email ha sido actualizado correctamente.
              </Text>
            </View>
            <Pressable 
              onPress={() => {
                 setShowSuccess(false);
                 setOriginalEmail(pendingEmail);
                 setPendingEmail('');
                 setOtp('');
              }}
              className="w-full h-[56px] px-xl justify-center items-center rounded-[16px] bg-white active:opacity-80"
            >
              <Text className="text-background font-['Inter'] text-body font-semibold leading-[normal]">
                Ok
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
