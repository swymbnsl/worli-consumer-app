import { Tables } from "@/types/supabase.types"
import { create } from "zustand"

// User type from supabase.types.ts
export type User = Tables<"users">
export type Wallet = Tables<"wallets">
export type UserPreference = Tables<"user_preferences">
export type DeliveryPreference = Tables<"delivery_preferences">

interface UserState {
  user: User | null
  wallet: Wallet | null
  userPreference: UserPreference | null
  deliveryPreference: DeliveryPreference | null
  isLoading: boolean
  error: string | null
  setUser: (user: User | null) => void
  setWallet: (wallet: Wallet | null) => void
  setUserPreference: (pref: UserPreference | null) => void
  setDeliveryPreference: (pref: DeliveryPreference | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearUser: () => void
  updateWalletBalance: (newBalance: number) => void
  getWalletBalance: () => number
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  wallet: null,
  userPreference: null,
  deliveryPreference: null,
  isLoading: false,
  error: null,
  setUser: (user) => set({ user, error: null }),
  setWallet: (wallet) => set({ wallet }),
  setUserPreference: (pref) => set({ userPreference: pref }),
  setDeliveryPreference: (pref) => set({ deliveryPreference: pref }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  clearUser: () =>
    set({
      user: null,
      wallet: null,
      userPreference: null,
      deliveryPreference: null,
      error: null,
      isLoading: false,
    }),
  updateWalletBalance: (newBalance: number) => {
    const { wallet } = get()
    if (wallet) {
      set({
        wallet: {
          ...wallet,
          balance: newBalance,
          updated_at: new Date().toISOString(),
        },
      })
    }
  },
  getWalletBalance: () => {
    const { wallet } = get()
    return wallet?.balance || 0
  },
}))
