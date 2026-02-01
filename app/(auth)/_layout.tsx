import { useAuth } from "@/hooks/useAuth"
import { Redirect, Stack } from "expo-router"
import { ActivityIndicator, View } from "react-native"

export default function AuthLayout() {
  const { isLoggedIn, loading } = useAuth()

  // Show loading state while checking auth
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#101B53",
        }}
      >
        <ActivityIndicator size="large" color="#E4941C" />
      </View>
    )
  }

  // Redirect to home if already logged in
  if (isLoggedIn) {
    return <Redirect href="/(tabs)/home" />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
    </Stack>
  )
}
