import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter'
import { PortalHost } from "@rn-primitives/portal"
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { LogBox } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import '../global.css'

// Ignore third-party deprecation warnings for React Native 0.81
LogBox.ignoreLogs([
  "SafeAreaView has been deprecated and will be removed in a future release.",
])

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync()

function InitialLayout() {
  const { session, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!session && !inAuthGroup) {
      // Redirigir al login si no hay sesión y no estamos en auth
      router.replace('/(auth)/login')
    } else if (session && inAuthGroup) {
      // Redirigir a tabs si hay sesión y estamos en auth
      router.replace('/(tabs)')
    }
  }, [session, loading, segments])

  if (loading) {
    return null // O un spinner si prefieres
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  )
}

export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  })

  useEffect(() => {
    if (fontsLoaded || error) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, error])

  if (!fontsLoaded && !error) {
    return null
  }

  if (!fontsLoaded && error) {
    console.warn('Font loading failed, using system fonts:', error)
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <InitialLayout />
      </AuthProvider>
      <PortalHost />
    </SafeAreaProvider>
  )
}
