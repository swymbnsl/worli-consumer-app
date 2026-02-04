import { AuthContext } from "@/context/AuthContext"
import { useUserStore } from "@/stores/user-store"
import { useContext } from "react"

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  // Get user, wallet, and preferences from Zustand store
  const { user, wallet, userPreference, deliveryPreference } = useUserStore()

  return {
    ...context,
    user,
    wallet,
    userPreference,
    deliveryPreference,
  }
}
