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
        router.replace("/onboarding")
        return
      }

      // User is logged in, check if profile is complete
      if (user) {
        // Check if profile is incomplete (full_name is null/empty)
        if (!user.full_name || user.full_name.trim() === "") {
          router.replace("/complete-profile")
        } else {
          router.replace("/(tabs)/home")
        }
      } else {
        // If user data is not available yet, wait for it
        // This shouldn't happen as fetchUserAndWallet is called after login
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
      <ActivityIndicator size="large" color={COLORS.primary.navy} />
    </View>
  )
}
