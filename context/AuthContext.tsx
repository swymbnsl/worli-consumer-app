import { supabase } from "@/lib/supabase"
import { useUserStore } from "@/stores/user-store"
import {
    DeliveryPreference,
    User,
    UserPreference,
    Wallet,
} from "@/types/database.types"
import { AuthChangeEvent, Session } from "@supabase/supabase-js"
import React, { createContext, useEffect, useState } from "react"

// const DEV_MODE = process.env.EXPO_PUBLIC_DEV_MODE === "true"
const DEV_MODE = false

interface AuthContextType {
  session: Session | null
  loading: boolean
  isLoggedIn: boolean
  isProfileComplete: boolean
  sendOTP: (phone: string) => Promise<boolean>
  login: (phone: string, otp: string) => Promise<boolean>
  logout: () => Promise<void>
  updateUser: (updates: Partial<User>) => Promise<boolean>
  updateUserPreference: (updates: Partial<UserPreference>) => Promise<boolean>
  updateDeliveryPreference: (
    updates: Partial<DeliveryPreference>,
  ) => Promise<boolean>
}

export const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  isLoggedIn: false,
  isProfileComplete: false,
  sendOTP: async () => false,
  login: async () => false,
  logout: async () => {},
  updateUser: async () => false,
  updateUserPreference: async () => false,
  updateDeliveryPreference: async () => false,
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Get Zustand store actions and state
  const {
    setUser,
    setWallet,
    setUserPreference,
    setDeliveryPreference,
    clearUser,
    user,
    userPreference,
    deliveryPreference,
  } = useUserStore()

  const isInvalidRefreshTokenError = (error: unknown): boolean => {
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message)
        : String(error)

    return /invalid\s+refresh\s+token/i.test(message)
  }

  const clearAuthState = () => {
    clearUser()
    setSession(null)
    setLoading(false)
  }

  useEffect(() => {
    let isMounted = true

    const initializeSession = async () => {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          if (isInvalidRefreshTokenError(error)) {
            // Ensure stale local auth state is removed when refresh token is no longer valid.
            await supabase.auth.signOut({ scope: "local" })
            if (isMounted) clearAuthState()
            return
          }

          throw error
        }

        if (!isMounted) return

        setSession(currentSession)
        if (currentSession?.user) {
          await fetchUserAndWallet(currentSession.user.id)
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error("Auth init error:", error)
        if (isMounted) clearAuthState()
      }
    }

    // Check active sessions
    initializeSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        if (!isMounted) return

        if (event === "SIGNED_OUT" || !newSession?.user) {
          clearAuthState()
          return
        }

        setSession(newSession)
        if (newSession.user) {
          await fetchUserAndWallet(newSession.user.id)
        } else {
          setLoading(false)
        }
      },
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserAndWallet = async (userId: string) => {
    try {
      // Fetch user
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle()

      if (userError) throw userError
      if (!userData) {
        // User record doesn't exist yet (e.g., just created account before completing profile)
        setLoading(false)
        return
      }
      setUser(userData)

      // Fetch wallet (or create if doesn't exist)
      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle()

      if (walletError) throw walletError

      if (walletData) {
        setWallet(walletData)
      } else {
        // Create default wallet if it doesn't exist
        const { data: newWallet, error: newWalletError } = await supabase
          .from("wallets")
          .upsert(
            {
              user_id: userId,
              balance: 0,
              low_balance_threshold: 100,
              auto_recharge_enabled: false,
            },
            { onConflict: "user_id" },
          )
          .select()
          .maybeSingle()

        if (newWalletError) {
          console.error("Error creating/fetching wallet:", newWalletError)
        }

        if (newWallet) {
          setWallet(newWallet)
        }
      }

      // Fetch user preferences (or create if doesn't exist)
      const { data: prefData, error: prefError } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle()

      if (prefError) throw prefError

      if (prefData) {
        setUserPreference(prefData)
      } else {
        // Create default preferences if they don't exist
        const { data: newPref, error: newPrefError } = await supabase
          .from("user_preferences")
          .upsert(
            {
              user_id: userId,
              language: "en",
              notifications_enabled: true,
              sms_notifications: true,
              push_notifications: true,
            },
            { onConflict: "user_id" },
          )
          .select()
          .maybeSingle()

        if (newPrefError) {
          console.error(
            "Error creating/fetching user preferences:",
            newPrefError,
          )
        }

        if (newPref) {
          setUserPreference(newPref)
        }
      }

      // Fetch delivery preferences (or create if doesn't exist)
      const { data: deliveryPrefData, error: deliveryPrefError } = await supabase
        .from("delivery_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle()

      if (deliveryPrefError) throw deliveryPrefError

      if (deliveryPrefData) {
        setDeliveryPreference(deliveryPrefData)
      } else {
        // Create default delivery preferences if they don't exist
        const { data: newDelPref, error: newDelPrefError } = await supabase
          .from("delivery_preferences")
          .upsert(
            {
              user_id: userId,
              ring_doorbell: true,
            },
            { onConflict: "user_id" },
          )
          .select()
          .maybeSingle()

        if (newDelPrefError) {
          console.error(
            "Error creating/fetching delivery preferences:",
            newDelPrefError,
          )
        }

        if (newDelPref) {
          setDeliveryPreference(newDelPref)
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
    } finally {
      setLoading(false)
    }
  }

  const sendOTP = async (phone: string): Promise<boolean> => {
    try {
      // Development mode bypass
      if (DEV_MODE) {
        console.log("🚀 DEV MODE: Bypassing OTP send for phone:", phone)
        return true
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: phone,
      })

      if (error) {
        console.error("OTP Error:", error)
        return false
      }
      return true
    } catch (error) {
      console.error("Send OTP Error:", error)
      return false
    }
  }

  const login = async (phone: string, otp: string): Promise<boolean> => {
    try {
      // Development mode bypass
      if (DEV_MODE) {
        console.log(
          "🚀 DEV MODE: Bypassing OTP verification for phone:",
          phone,
          "OTP:",
          otp,
        )

        // Create a mock user for development
        const mockUser: User = {
          id: `dev_user_${phone.replace("+", "")}`,
          phone_number: phone,
          full_name: "Dev User",
          email: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        const mockWallet: Wallet = {
          id: `dev_wallet_${phone.replace("+", "")}`,
          user_id: mockUser.id,
          balance: 500,
          low_balance_threshold: 100,
          auto_recharge_enabled: false,
          auto_recharge_amount: null,
          auto_recharge_trigger_amount: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        setUser(mockUser)
        setWallet(mockWallet)
        setSession({ user: { id: mockUser.id } } as any)
        return true
      }

      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: otp,
        type: "sms",
      })

      if (error) {
        console.error("Login Error:", error)
        return false
      }

      if (data.user) {
        // Check if user exists in users table
        const { data: existingUser } = await supabase
          .from("users")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle()

        // If user doesn't exist, create them
        if (!existingUser) {
          const newUser = {
            id: data.user.id,
            phone_number: phone,
            full_name: null,
            email: data.user.email || null,
          }

          const { error: insertError } = await supabase
            .from("users")
            .insert([newUser])

          if (insertError) {
            console.error("Error creating user:", insertError)
            return false
          }

          // Create wallet for new user
          const { error: walletError } = await supabase.from("wallets").insert([
            {
              user_id: data.user.id,
              balance: 0,
              low_balance_threshold: 100,
              auto_recharge_enabled: false,
            },
          ])

          if (walletError) {
            console.error("Error creating wallet:", walletError)
          }
        }

        await fetchUserAndWallet(data.user.id)
        return true
      }

      return false
    } catch (error) {
      console.error("Login Error:", error)
      return false
    }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
      clearUser()
      setSession(null)
    } catch (error) {
      console.error("Logout Error:", error)
    }
  }

  const updateUser = async (updates: Partial<User>): Promise<boolean> => {
    if (!user) return false

    try {
      const { error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", user.id)

      if (error) throw error

      setUser({ ...user, ...updates } as User)
      return true
    } catch (error) {
      console.error("Update User Error:", error)
      return false
    }
  }

  const updateUserPreference = async (
    updates: Partial<UserPreference>,
  ): Promise<boolean> => {
    if (!user) return false

    try {
      // Check if preferences exist
      const { data: existing } = await supabase
        .from("user_preferences")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("user_preferences")
          .update(updates)
          .eq("user_id", user.id)

        if (error) throw error
      } else {
        // Create new
        const { error } = await supabase
          .from("user_preferences")
          .insert({ user_id: user.id, ...updates })

        if (error) throw error
      }

      setUserPreference({ ...userPreference, ...updates } as UserPreference)
      return true
    } catch (error) {
      console.error("Update User Preference Error:", error)
      return false
    }
  }

  const updateDeliveryPreference = async (
    updates: Partial<DeliveryPreference>,
  ): Promise<boolean> => {
    if (!user) return false

    try {
      // Check if preferences exist
      const { data: existing } = await supabase
        .from("delivery_preferences")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("delivery_preferences")
          .update(updates)
          .eq("user_id", user.id)

        if (error) throw error
      } else {
        // Create new
        const { error } = await supabase
          .from("delivery_preferences")
          .insert({ user_id: user.id, ...updates })

        if (error) throw error
      }

      setDeliveryPreference({
        ...deliveryPreference,
        ...updates,
      } as DeliveryPreference)
      return true
    } catch (error) {
      console.error("Update Delivery Preference Error:", error)
      return false
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        isLoggedIn: !!session && !!user,
        isProfileComplete: !!user?.full_name && user.full_name.trim() !== "",
        sendOTP,
        login,
        logout,
        updateUser,
        updateUserPreference,
        updateDeliveryPreference,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
