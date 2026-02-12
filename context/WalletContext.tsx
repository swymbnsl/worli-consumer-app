import {
  initiateWalletRecharge,
  RazorpayPaymentResult,
} from "@/lib/razorpay-service"
import { supabase } from "@/lib/supabase"
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
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (error) throw error
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
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error("Error fetching transactions:", error)
    }
  }

  const rechargeWallet = async (amount: number): Promise<boolean> => {
    if (!user || !wallet) return false

    try {
      const newBalance = Number(wallet.balance) + amount

      // Update wallet balance
      const { error: walletError } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("user_id", user.id)

      if (walletError) throw walletError

      // Create transaction record
      const { error: txnError } = await supabase.from("transactions").insert([
        {
          transaction_id: `TXN${Date.now()}`,
          user_id: user.id,
          wallet_id: wallet.id,
          type: "credit",
          amount: amount,
          status: "success",
          description: "Wallet recharge",
          balance_before: wallet.balance,
          balance_after: newBalance,
        },
      ])

      if (txnError) throw txnError

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

      // Update wallet balance
      const { error: walletError } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("user_id", user.id)

      if (walletError) throw walletError

      // Create transaction record
      const { error: txnError } = await supabase.from("transactions").insert([
        {
          transaction_id: `TXN${Date.now()}`,
          user_id: user.id,
          wallet_id: wallet.id,
          type: "debit",
          amount: amount,
          status: "success",
          description: description,
          balance_before: wallet.balance,
          balance_after: newBalance,
        },
      ])

      if (txnError) throw txnError

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
      const { error } = await supabase
        .from("wallets")
        .update(settings)
        .eq("user_id", user.id)

      if (error) throw error

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
  // AutoPay Setup
  // ─────────────────────────────────────────
  const setupAutoPay = async (
    rechargeAmount: number,
    triggerAmount: number,
  ): Promise<boolean> => {
    if (!user) return false

    try {
      // Save autopay settings to wallet
      const { error } = await supabase
        .from("wallets")
        .update({
          auto_recharge_enabled: true,
          auto_recharge_amount: rechargeAmount,
          auto_recharge_trigger_amount: triggerAmount,
        })
        .eq("user_id", user.id)

      if (error) throw error

      await fetchWallet()
      return true
    } catch (error) {
      console.error("Setup AutoPay Error:", error)
      return false
    }
  }

  // ─────────────────────────────────────────
  // Cancel AutoPay
  // ─────────────────────────────────────────
  const cancelAutoPay = async (): Promise<boolean> => {
    if (!user) return false

    try {
      const { error } = await supabase
        .from("wallets")
        .update({
          auto_recharge_enabled: false,
          auto_recharge_amount: null,
          auto_recharge_trigger_amount: null,
        })
        .eq("user_id", user.id)

      if (error) throw error

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
