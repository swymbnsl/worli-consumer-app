import { create } from "zustand"
import {
  createTransaction,
  fetchTransactions as fetchTransactionsSvc,
  fetchWallet as fetchWalletSvc,
  updateWalletBalance,
  updateWalletSettings as updateWalletSettingsSvc,
  upsertWallet,
} from "@/lib/supabase-service"
import { Transaction, Wallet } from "@/types/database.types"
import {
  cancelAutoPayMandate,
  initiateWalletRecharge,
  openRazorpayCheckout,
  RazorpayPaymentResult,
  setupAutoPayMandate,
  verifyAutoPayMandate,
} from "@/lib/razorpay-service"
import { useAuthStore } from "./auth-store"

interface WalletState {
  wallet: Wallet | null
  transactions: Transaction[]
  loading: boolean
  
  // Actions
  initWallet: (userId: string, isDevMode?: boolean) => Promise<void>
  clearWallet: () => void
  fetchWallet: () => Promise<void>
  fetchTransactions: () => Promise<void>
  refreshWallet: () => Promise<void>
  rechargeWallet: (amount: number) => Promise<boolean>
  rechargeWithRazorpay: (amount: number) => Promise<RazorpayPaymentResult>
  deductFromWallet: (amount: number, description: string) => Promise<boolean>
  updateWalletSettings: (settings: Partial<Wallet>) => Promise<boolean>
  setupAutoPay: (rechargeAmount: number, triggerAmount: number) => Promise<boolean>
  cancelAutoPay: () => Promise<boolean>
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallet: null,
  transactions: [],
  loading: false,

  initWallet: async (userId: string, isDevMode = false) => {
    if (isDevMode) {
      const mockWallet: Wallet = {
        id: `dev_wallet_${userId}`,
        user_id: userId,
        balance: 500,
        low_balance_threshold: 100,
        auto_recharge_enabled: false,
        auto_recharge_amount: null,
        auto_recharge_trigger_amount: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        razorpay_customer_id: null,
        razorpay_subscription_id: null,
      }
      set({ wallet: mockWallet })
      return
    }

    try {
      set({ loading: true })
      let walletData = await fetchWalletSvc(userId)
      if (!walletData) {
        walletData = await upsertWallet({
          user_id: userId,
          balance: 0,
          low_balance_threshold: 100,
          auto_recharge_enabled: false,
        })
      }
      set({ wallet: walletData })
      await get().fetchTransactions()
    } catch (e) {
      console.error("Error init wallet:", e)
    } finally {
      set({ loading: false })
    }
  },

  clearWallet: () => set({ wallet: null, transactions: [], loading: false }),

  fetchWallet: async () => {
    const { user } = useAuthStore.getState()
    if (!user) return
    try {
      const data = await fetchWalletSvc(user.id)
      set({ wallet: data })
    } catch (e) {
      console.error("Error fetching wallet", e)
    }
  },

  fetchTransactions: async () => {
    const { user } = useAuthStore.getState()
    if (!user) return
    try {
      const data = await fetchTransactionsSvc(user.id)
      set({ transactions: data })
    } catch (e) {
      console.error("Error fetching transactions", e)
    }
  },

  refreshWallet: async () => {
    await get().fetchWallet()
    await get().fetchTransactions()
  },

  rechargeWallet: async (amount: number) => {
    const { user } = useAuthStore.getState()
    const { wallet } = get()
    if (!user || !wallet) return false

    try {
      const newBalance = Number(wallet.balance) + amount
      await updateWalletBalance(user.id, newBalance)
      await createTransaction({
        transaction_id: `TXN${Date.now()}`,
        user_id: user.id,
        wallet_id: wallet.id,
        type: "credit",
        amount: amount,
        status: "success",
        description: "Wallet recharge",
        balance_before: wallet.balance,
        balance_after: newBalance,
      })
      await get().refreshWallet()
      return true
    } catch (e) {
      console.error("Recharge error:", e)
      return false
    }
  },

  rechargeWithRazorpay: async (amount: number) => {
    const { user } = useAuthStore.getState()
    if (!user) throw new Error("User not logged in")

    const paymentResult = await initiateWalletRecharge(amount, user.id, {
      name: user.full_name || undefined,
      email: user.email || undefined,
      phone: user.phone_number || undefined,
    })

    await get().refreshWallet()
    return paymentResult
  },

  deductFromWallet: async (amount: number, description: string) => {
    const { user } = useAuthStore.getState()
    const { wallet } = get()
    if (!user || !wallet) return false

    try {
      const newBalance = Number(wallet.balance) - amount
      if (newBalance < 0) return false

      await updateWalletBalance(user.id, newBalance)

      await createTransaction({
        transaction_id: `TXN${Date.now()}`,
        user_id: user.id,
        wallet_id: wallet.id,
        type: "debit",
        amount: amount,
        status: "success",
        description: description,
        balance_before: wallet.balance,
        balance_after: newBalance,
      })
      await get().refreshWallet()
      return true
    } catch (e) {
      console.error("Deduct Error:", e)
      return false
    }
  },

  updateWalletSettings: async (settings: Partial<Wallet>) => {
    const { user } = useAuthStore.getState()
    if (!user) return false
    try {
      await updateWalletSettingsSvc(user.id, settings)
      await get().fetchWallet()
      return true
    } catch (e) {
      console.error("Update settings error:", e)
      return false
    }
  },

  setupAutoPay: async (rechargeAmount: number, triggerAmount: number) => {
    const { user } = useAuthStore.getState()
    if (!user) return false
    try {
      const mandateResponse = await setupAutoPayMandate(rechargeAmount, triggerAmount)
      const paymentResult = await openRazorpayCheckout({
        subscriptionId: mandateResponse.subscription_id,
        name: "Worli Dairy App",
        description: `Auto-recharge ₹${rechargeAmount} setup`,
        prefill: {
          name: user.full_name || user.email?.split("@")[0] || "",
          email: user.email || "",
          contact: user.phone_number || "",
        },
      }) as unknown as {
        razorpay_payment_id: string
        razorpay_subscription_id: string
        razorpay_signature: string
      }

      const verified = await verifyAutoPayMandate(paymentResult)
      if (!verified) throw new Error("AutoPay verification failed")

      await get().fetchWallet()
      return true
    } catch (e) {
      console.error("Setup AutoPay Error:", e)
      return false
    }
  },

  cancelAutoPay: async () => {
    const { user } = useAuthStore.getState()
    if (!user) return false
    try {
      const cancelled = await cancelAutoPayMandate()
      if (!cancelled) throw new Error("Failed to cancel autopay")
      await get().fetchWallet()
      return true
    } catch (e) {
      console.error("Cancel AutoPay Error:", e)
      return false
    }
  }
}))
