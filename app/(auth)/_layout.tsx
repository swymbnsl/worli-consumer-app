import { COLORS } from "@/constants/theme"
import { useAuth } from "@/hooks/useAuth"
import { useUserStore } from "@/stores/user-store"
import { Redirect, Stack } from "expo-router"
import { ActivityIndicator, View } from "react-native"

export default function AuthLayout() {
  const { isLoggedIn, loading, isProfileComplete } = useAuth()
  const user = useUserStore((s) => s.user)

  // Show loading state while checking auth
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.background,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  // Redirect based on auth and profile completion status
  if (isLoggedIn) {
    if (!isProfileComplete) {
      return <Redirect href="/complete-profile" />
    }
    return <Redirect href="/(tabs)/home" />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
    </Stack>
  )
}
