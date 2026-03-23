import { create } from "zustand"
import { supabase } from "@/lib/supabase"
import {
  createUser,
  fetchDeliveryPreferences,
  fetchUserById,
  fetchUserPreferences,
  insertDeliveryPreferencesDb,
  insertUserPreferencesDb,
  updateDeliveryPreferencesDb,
  updateUserDb,
  updateUserPreferencesDb,
} from "@/lib/supabase-service"
import { Session } from "@supabase/supabase-js"
import { DeliveryPreference, User, UserPreference } from "@/types/database.types"
import { useWalletStore } from "./wallet-store"

const DEV_MODE = false

interface AuthState {
  user: User | null
  userPreference: UserPreference | null
  deliveryPreference: DeliveryPreference | null
  session: Session | null
  loading: boolean
  isLoggedIn: boolean
  isProfileComplete: boolean
  error: string | null

  // Actions
  initializeSession: () => Promise<void>
  sendOTP: (phone: string) => Promise<boolean>
  login: (phone: string, otp: string) => Promise<boolean>
  logout: () => Promise<void>
  updateUser: (updates: Partial<User>) => Promise<boolean>
  updateUserPreference: (updates: Partial<UserPreference>) => Promise<boolean>
  updateDeliveryPreference: (updates: Partial<DeliveryPreference>) => Promise<boolean>
  clearUser: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

const isInvalidRefreshTokenError = (error: unknown): boolean => {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message)
      : String(error)
  return /invalid\s+refresh\s+token/i.test(message)
}

export const useAuthStore = create<AuthState>((set, get) => {
  const fetchUserPreferencesData = async (userId: string) => {
    try {
      const prefData = await fetchUserPreferences(userId)
      if (prefData) {
        set({ userPreference: prefData })
      } else {
        const newPref = await insertUserPreferencesDb({
          user_id: userId,
          language: "en",
          notifications_enabled: true,
          sms_notifications: true,
          push_notifications: true,
        })
        // Fetch it back or assume default
        const newPrefData = await fetchUserPreferences(userId)
        if (newPrefData) set({ userPreference: newPrefData })
      }
    } catch (e) {
      console.error("Error fetching/creating user preferences", e)
    }

    try {
      const deliveryData = await fetchDeliveryPreferences(userId)
      if (deliveryData) {
        set({ deliveryPreference: deliveryData })
      }
    } catch (e) {
      console.error("Error fetching delivery preferences", e)
    }
  }

  const fetchUserData = async (userId: string) => {
    try {
      const userData = await fetchUserById(userId)
      if (!userData) {
        // User record doesn't exist yet
        return false
      }
      set({ 
        user: userData,
        isLoggedIn: true,
        isProfileComplete: !!userData.full_name && userData.full_name.trim() !== ""
      })
      
      // Also init wallet using wallet store
      await useWalletStore.getState().initWallet(userId)
      
      // Preferences
      await fetchUserPreferencesData(userId)
      
      return true
    } catch (error) {
      console.error("Error fetching user data:", error)
      return false
    }
  }

  return {
    user: null,
    userPreference: null,
    deliveryPreference: null,
    session: null,
    loading: true,
    isLoggedIn: false,
    isProfileComplete: false,
    error: null,

    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error, loading: false }),
    
    clearUser: () => set({
      user: null,
      userPreference: null,
      deliveryPreference: null,
      session: null,
      isLoggedIn: false,
      isProfileComplete: false,
      error: null,
      loading: false,
    }),

    initializeSession: async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession()

        if (error) {
          if (isInvalidRefreshTokenError(error)) {
            await supabase.auth.signOut({ scope: "local" })
            get().clearUser()
            return
          }
          throw error
        }

        if (currentSession?.user) {
          set({ session: currentSession })
          await fetchUserData(currentSession.user.id)
        }
        
        set({ loading: false })
      } catch (error) {
        console.error("Auth init error:", error)
        get().clearUser()
      }
      
      // Setup subscription to auth state changes
      supabase.auth.onAuthStateChange(async (event: any, newSession: any) => {
        if (event === "SIGNED_OUT" || !newSession?.user) {
          get().clearUser()
          useWalletStore.getState().clearWallet()
          return
        }

        set({ session: newSession })
        if (newSession.user) {
          await fetchUserData(newSession.user.id)
        } else {
          set({ loading: false })
        }
      })
    },

    sendOTP: async (phone: string) => {
      try {
        if (DEV_MODE) return true

        const { error } = await supabase.auth.signInWithOtp({ phone })
        if (error) {
          console.error("OTP Error:", error)
          return false
        }
        return true
      } catch (error) {
        console.error("Send OTP Error:", error)
        return false
      }
    },

    login: async (phone: string, otp: string) => {
      try {
        if (DEV_MODE) {
          // Dev mode simulated login
          const mockUser: User = {
            id: `dev_user_${phone.replace("+", "")}`,
            phone_number: phone,
            full_name: "Dev User",
            email: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            referral_code: "DEVUSER123",
            claimed_free_sample: false,
            referred_by: null,
          }
          
          set({ 
            user: mockUser, 
            session: { user: { id: mockUser.id } } as any,
            isLoggedIn: true,
            isProfileComplete: true
          })
          await useWalletStore.getState().initWallet(mockUser.id, true)
          return true
        }

        const { data, error } = await supabase.auth.verifyOtp({
          phone,
          token: otp,
          type: "sms",
        })

        if (error) return false

        if (data.user) {
          const existingUser = await fetchUserById(data.user.id)

          if (!existingUser) {
            await createUser({
              id: data.user.id,
              phone_number: phone,
              full_name: null,
              email: data.user.email || null,
            })
            // Wallet initialized via wallet store
            await useWalletStore.getState().initWallet(data.user.id)
          }

          set({ session: data.session })
          await fetchUserData(data.user.id)
          return true
        }
        return false
      } catch (error) {
        console.error("Login Error:", error)
        return false
      }
    },

    logout: async () => {
      try {
        await supabase.auth.signOut()
        get().clearUser()
        useWalletStore.getState().clearWallet()
      } catch (error) {
        console.error("Logout Error:", error)
      }
    },

    updateUser: async (updates) => {
      const { user } = get()
      if (!user) return false
      try {
        await updateUserDb(user.id, updates)
        const updatedUser = { ...user, ...updates } as User
        set({ 
          user: updatedUser,
          isProfileComplete: !!updatedUser.full_name && updatedUser.full_name.trim() !== ""
        })
        return true
      } catch (error) {
        console.error("Update User Error:", error)
        return false
      }
    },

    updateUserPreference: async (updates) => {
      const { user, userPreference } = get()
      if (!user) return false
      try {
        const existing = await fetchUserPreferences(user.id)
        if (existing) {
          await updateUserPreferencesDb(user.id, updates)
        } else {
          await insertUserPreferencesDb({ user_id: user.id, ...updates })
        }
        set({ userPreference: { ...userPreference, ...updates } as UserPreference })
        return true
      } catch (error) {
        console.error("Update User Preference Error:", error)
        return false
      }
    },

    updateDeliveryPreference: async (updates) => {
      const { user, deliveryPreference } = get()
      if (!user) return false
      try {
        const existing = await fetchDeliveryPreferences(user.id)
        if (existing) {
          await updateDeliveryPreferencesDb(user.id, updates)
        } else {
          await insertDeliveryPreferencesDb({ user_id: user.id, ...updates })
        }
        set({ deliveryPreference: { ...deliveryPreference, ...updates } as DeliveryPreference })
        return true
      } catch (error) {
        console.error("Update Delivery Preference Error:", error)
        return false
      }
    },
  }
})
