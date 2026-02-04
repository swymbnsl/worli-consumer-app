import { COLORS } from "@/constants/theme"
import { useAuth } from "@/hooks/useAuth"
import { useUserStore } from "@/stores/user-store"
import { router } from "expo-router"
import { useEffect } from "react"
import { ActivityIndicator, View } from "react-native"

export default function Index() {
  const { isLoggedIn, loading } = useAuth()
  const user = useUserStore((s) => s.user)

  useEffect(() => {
    const route = async () => {
      if (loading) return

      if (!isLoggedIn) {
        router.replace("/onboarding" as any)
        return
      }

      // User is logged in, check if profile is complete
      if (user) {
        router.replace("/(tabs)/home")
      } else {
        // If user data is not available yet, wait for it
        router.replace("/(tabs)/home")
      }
    }

    route()
  }, [loading, isLoggedIn, user])

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
