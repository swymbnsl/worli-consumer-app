import { COLORS } from "@/constants/theme"
import { useAuth } from "@/hooks/useAuth"
import { router, usePathname } from "expo-router"
import React, { useEffect } from "react"
import { ActivityIndicator, View } from "react-native"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoggedIn, loading } = useAuth()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return

    // If not logged in and not on auth routes, redirect to onboarding
    const isAuthRoute =
      pathname === "/onboarding" || pathname.startsWith("/(auth)")
    if (!isLoggedIn && !isAuthRoute) {
      router.replace("/onboarding" as any)
    }
  }, [loading, isLoggedIn, pathname])

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

  return <>{children}</>
}
