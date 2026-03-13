import {
    AutoPayMandateResponse,
    cancelAutoPayMandate,
    CheckoutOptions,
    initiateWalletRecharge,
    RazorpayPaymentResult,
    openRazorpayCheckout,
    setupAutoPayMandate,
    verifyAutoPayMandate,
} from "@/lib/razorpay-service"
import {
    createTransaction,
    fetchTransactions as fetchTransactionsSvc,
    fetchWallet as fetchWalletSvc,
    updateWalletBalance,
    updateWalletSettings as updateWalletSettingsSvc,
} from "@/lib/supabase-service"
import { useUserStore } from "@/stores/user-store"
import { Transaction, Wallet } from "@/types/database.types"
import React, { createContext, useContext, useEffect, useState } from "react"
import { AuthContext } from "./AuthContext"

export interface PaymentDetails {
  payment_id: string
  order_id: string
  signature: string
  method?: string
}

interface WalletContextType {
  wallet: Wallet | null
  transactions: Transaction[]
  loading: boolean
  rechargeWallet: (amount: number) => Promise<boolean>
  rechargeWithRazorpay: (amount: number) => Promise<RazorpayPaymentResult>
  deductFromWallet: (amount: number, description: string) => Promise<boolean>
  updateWalletSettings: (settings: Partial<Wallet>) => Promise<boolean>
  setupAutoPay: (
    rechargeAmount: number,
    triggerAmount: number,
  ) => Promise<boolean>
  cancelAutoPay: () => Promise<boolean>
  refreshWallet: () => Promise<void>
}

export const WalletContext = createContext<WalletContextType>({
  wallet: null,
  transactions: [],
  loading: true,
  rechargeWallet: async () => false,
  rechargeWithRazorpay: async () => {
    throw new Error("Not initialized")
  },
  deductFromWallet: async () => false,
  updateWalletSettings: async () => false,
  setupAutoPay: async () => false,
  cancelAutoPay: async () => false,
  refreshWallet: async () => {},
})

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isLoggedIn } = useContext(AuthContext)
  const user = useUserStore((state) => state.user)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoggedIn && user) {
      fetchWallet()
      fetchTransactions()
    } else {
      setWallet(null)
      setTransactions([])
      setLoading(false)
    }
  }, [isLoggedIn, user])

  const fetchWallet = async () => {
    if (!user) return

    try {
      const data = await fetchWalletSvc(user.id)
      setWallet(data)
    } catch (error) {
      console.error("Error fetching wallet:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async () => {
    if (!user) return

    try {
      const data = await fetchTransactionsSvc(user.id)
      setTransactions(data)
    } catch (error) {
      console.error("Error fetching transactions:", error)
    }
  }

  const rechargeWallet = async (amount: number): Promise<boolean> => {
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

      await fetchWallet()
      await fetchTransactions()
      return true
    } catch (error) {
      console.error("Recharge Error:", error)
      return false
    }
  }

  const deductFromWallet = async (
    amount: number,
    description: string,
  ): Promise<boolean> => {
    if (!user || !wallet) return false

    try {
      const newBalance = Number(wallet.balance) - amount

      if (newBalance < 0) {
        console.error("Insufficient balance")
        return false
      }

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

      await fetchWallet()
      await fetchTransactions()
      return true
    } catch (error) {
      console.error("Deduct Error:", error)
      return false
    }
  }

  const updateWalletSettings = async (
    settings: Partial<Wallet>,
  ): Promise<boolean> => {
    if (!user) return false

    try {
      await updateWalletSettingsSvc(user.id, settings)
      await fetchWallet()
      return true
    } catch (error) {
      console.error("Update Settings Error:", error)
      return false
    }
  }

  const refreshWallet = async () => {
    await fetchWallet()
    await fetchTransactions()
  }

  // ─────────────────────────────────────────
  // Razorpay Recharge Flow
  // ─────────────────────────────────────────
  const rechargeWithRazorpay = async (
    amount: number,
  ): Promise<RazorpayPaymentResult> => {
    if (!user) throw new Error("User not logged in")

    const paymentResult = await initiateWalletRecharge(amount, user.id, {
      name: user.full_name || undefined,
      email: user.email || undefined,
      phone: user.phone_number || undefined,
    })

    // Refresh wallet and transactions after successful payment
    // (Edge function already updated the balance server-side)
    await fetchWallet()
    await fetchTransactions()

    return paymentResult
  }

  // ─────────────────────────────────────────
  // AutoPay Setup (via Edge Function → Razorpay)
  // ─────────────────────────────────────────
  const setupAutoPay = async (
    rechargeAmount: number,
    triggerAmount: number,
  ): Promise<boolean> => {
    if (!user) return false

    try {
      // Call edge function which creates Razorpay customer, plan & subscription
      const mandateResponse = await setupAutoPayMandate(rechargeAmount, triggerAmount)

      // Open Razorpay Checkout for the user to authorize the mandate
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

      // Verify the signature to activate it
      const verified = await verifyAutoPayMandate(paymentResult)

      if (!verified) {
        throw new Error("AutoPay verification failed.")
      }

      // Edge function already updates the wallet DB, just refresh local state
      await fetchWallet()
      return true
    } catch (error) {
      console.error("Setup AutoPay Error:", error)
      return false
    }
  }

  // ─────────────────────────────────────────
  // Cancel AutoPay (via Edge Function → Razorpay)
  // ─────────────────────────────────────────
  const cancelAutoPay = async (): Promise<boolean> => {
    if (!user) return false

    try {
      // Call edge function which cancels Razorpay subscription and clears DB
      const cancelled = await cancelAutoPayMandate()

      if (!cancelled) {
        throw new Error("Failed to cancel autopay")
      }

      // Edge function already clears wallet DB, just refresh local state
      await fetchWallet()
      return true
    } catch (error) {
      console.error("Cancel AutoPay Error:", error)
      return false
    }
  }

  return (
    <WalletContext.Provider
      value={{
        wallet,
        transactions,
        loading,
        rechargeWallet,
        rechargeWithRazorpay,
        deductFromWallet,
        updateWalletSettings,
        setupAutoPay,
        cancelAutoPay,
        refreshWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}
