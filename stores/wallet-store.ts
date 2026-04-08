import {
    cancelAutoPayMandate,
    openRazorpayCheckout,
    RazorpayPaymentResult,
    setupAutoPayMandate,
    verifyAutoPayMandate,
} from "@/lib/razorpay-service"
import {
    initiateWalletRecharge,
    verifyWalletRecharge,
} from "@/lib/checkout-service"
import {
    deductWalletBalanceRpc,
    fetchTransactions as fetchTransactionsSvc,
    fetchWallet as fetchWalletSvc,
    updateWalletSettings as updateWalletSettingsSvc,
    upsertWallet,
    fetchActiveProduct,
    fetchActiveSubscriptions,
} from "@/lib/supabase-service"
import {
    amountToBottles,
    bottlesToAmount,
    calculateDaysLeft,
} from "@/lib/bottle-utils"
import { Transaction, Wallet, Subscription, Product } from "@/types/database.types"
import { create } from "zustand"
import { useAuthStore } from "./auth-store"

interface WalletState {
  wallet: Wallet | null
  transactions: Transaction[]
  loading: boolean
  
  // Bottle-related state
  bottlePrice: number
  bottleBalance: number
  subscriptions: Subscription[]
  estimatedDaysLeft: number
  
  // Actions
  initWallet: (userId: string, isDevMode?: boolean) => Promise<void>
  clearWallet: () => void
  fetchWallet: () => Promise<void>
  fetchTransactions: () => Promise<void>
  fetchBottlePrice: () => Promise<void>
  fetchSubscriptions: () => Promise<void>
  refreshWallet: () => Promise<void>
  
  // Bottle purchase (replaces recharge)
  purchaseBottles: (bottles: number) => Promise<RazorpayPaymentResult>
  purchaseBottlesWithAmount: (amount: number) => Promise<RazorpayPaymentResult>
  purchaseBottlesForCheckout: (minBottles: number) => Promise<RazorpayPaymentResult>
  
  // Legacy methods (kept for compatibility)
  rechargeWithRazorpay: (amount: number) => Promise<RazorpayPaymentResult>
  deductFromWallet: (amount: number, description: string) => Promise<boolean>
  updateWalletSettings: (settings: Partial<Wallet>) => Promise<boolean>
  setupAutoPay: (rechargeAmount: number, triggerAmount: number) => Promise<boolean>
  cancelAutoPay: () => Promise<boolean>
}

// Default bottle price (will be fetched from products)
const DEFAULT_BOTTLE_PRICE = 30

export const useWalletStore = create<WalletState>((set, get) => ({
  wallet: null,
  transactions: [],
  loading: false,
  
  // Bottle-related state
  bottlePrice: DEFAULT_BOTTLE_PRICE,
  bottleBalance: 0,
  subscriptions: [],
  estimatedDaysLeft: 0,

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
      set({ 
        wallet: mockWallet,
        bottleBalance: amountToBottles(500, DEFAULT_BOTTLE_PRICE),
      })
      return
    }

    try {
      set({ loading: true })
      
      // Fetch bottle price first
      await get().fetchBottlePrice()
      
      let walletData = await fetchWalletSvc(userId)
      if (!walletData) {
        walletData = await upsertWallet({
          user_id: userId,
          balance: 0,
          low_balance_threshold: 100,
          auto_recharge_enabled: false,
        })
      }
      
      const { bottlePrice } = get()
      const bottleBalance = amountToBottles(walletData?.balance || 0, bottlePrice)
      
      set({ wallet: walletData, bottleBalance })
      
      // Fetch transactions and subscriptions in parallel
      await Promise.all([
        get().fetchTransactions(),
        get().fetchSubscriptions(),
      ])
      
      // Update days left estimate
      const { subscriptions } = get()
      const daysLeft = calculateDaysLeft(bottleBalance, subscriptions)
      set({ estimatedDaysLeft: daysLeft })
      
    } catch (e) {
      console.error("Error init wallet:", e)
    } finally {
      set({ loading: false })
    }
  },

  clearWallet: () => set({ 
    wallet: null, 
    transactions: [], 
    loading: false,
    bottleBalance: 0,
    subscriptions: [],
    estimatedDaysLeft: 0,
  }),

  fetchWallet: async () => {
    const { user } = useAuthStore.getState()
    if (!user) return
    try {
      const data = await fetchWalletSvc(user.id)
      const { bottlePrice } = get()
      const bottleBalance = amountToBottles(data?.balance || 0, bottlePrice)
      set({ wallet: data, bottleBalance })
      
      // Update days left
      const { subscriptions } = get()
      const daysLeft = calculateDaysLeft(bottleBalance, subscriptions)
      set({ estimatedDaysLeft: daysLeft })
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
  
  fetchBottlePrice: async () => {
    try {
      const product = await fetchActiveProduct()
      if (product && product.price) {
        set({ bottlePrice: product.price })
      }
    } catch (e) {
      console.error("Error fetching bottle price:", e)
      // Keep default price
    }
  },
  
  fetchSubscriptions: async () => {
    const { user } = useAuthStore.getState()
    if (!user) return
    try {
      const subs = await fetchActiveSubscriptions(user.id)
      set({ subscriptions: subs || [] })
      
      // Update days left
      const { bottleBalance } = get()
      const daysLeft = calculateDaysLeft(bottleBalance, subs || [])
      set({ estimatedDaysLeft: daysLeft })
    } catch (e) {
      console.error("Error fetching subscriptions:", e)
    }
  },

  refreshWallet: async () => {
    await Promise.all([
      get().fetchWallet(),
      get().fetchTransactions(),
      get().fetchSubscriptions(),
    ])
  },

  // Purchase bottles by count
  purchaseBottles: async (bottles: number) => {
    const { bottlePrice } = get()
    const amount = bottlesToAmount(bottles, bottlePrice)
    return get().purchaseBottlesWithAmount(amount)
  },
  
  // Purchase bottles by amount (validates it's a multiple)
  purchaseBottlesWithAmount: async (amount: number) => {
    const { user } = useAuthStore.getState()
    if (!user) throw new Error("User not logged in")
    
    const { bottlePrice } = get()
    const bottles = amountToBottles(amount, bottlePrice)

    // Step 1: Initiate recharge (creates Razorpay order)
    // The edge function validates amount is multiple of bottle price
    const initResult = await initiateWalletRecharge(amount)
    
    // Step 2: Open Razorpay checkout
    const paymentResult = await openRazorpayCheckout({
      amount,
      orderId: initResult.order_id,
      description: `Purchase ${bottles} bottles`,
      prefill: {
        name: user.full_name || undefined,
        email: user.email || undefined,
        contact: user.phone_number || undefined,
      },
      notes: {
        user_id: user.id,
        purpose: "bottle_purchase",
        bottles: bottles.toString(),
      },
    })

    // Step 3: Verify payment and credit wallet
    await verifyWalletRecharge({
      razorpay_payment_id: paymentResult.razorpay_payment_id,
      razorpay_order_id: paymentResult.razorpay_order_id,
      razorpay_signature: paymentResult.razorpay_signature,
    })

    await get().refreshWallet()
    return paymentResult
  },
  
  // Purchase minimum bottles needed for checkout
  purchaseBottlesForCheckout: async (minBottles: number) => {
    const { user } = useAuthStore.getState()
    if (!user) throw new Error("User not logged in")
    
    const { bottlePrice } = get()
    const amount = bottlesToAmount(minBottles, bottlePrice)

    // Step 1: Initiate recharge with min_bottles_required flag
    const initResult = await initiateWalletRecharge(amount, minBottles)
    
    // Step 2: Open Razorpay checkout
    const paymentResult = await openRazorpayCheckout({
      amount,
      orderId: initResult.order_id,
      description: `Purchase ${minBottles} bottles`,
      prefill: {
        name: user.full_name || undefined,
        email: user.email || undefined,
        contact: user.phone_number || undefined,
      },
      notes: {
        user_id: user.id,
        purpose: "bottle_purchase_checkout",
        bottles: minBottles.toString(),
      },
    })

    // Step 3: Verify payment and credit wallet
    await verifyWalletRecharge({
      razorpay_payment_id: paymentResult.razorpay_payment_id,
      razorpay_order_id: paymentResult.razorpay_order_id,
      razorpay_signature: paymentResult.razorpay_signature,
    })

    await get().refreshWallet()
    return paymentResult
  },

  // Legacy method - now calls purchaseBottlesWithAmount
  rechargeWithRazorpay: async (amount: number) => {
    return get().purchaseBottlesWithAmount(amount)
  },

  deductFromWallet: async (amount: number, description: string) => {
    const { user } = useAuthStore.getState()
    const { wallet } = get()
    if (!user || !wallet) return false

    try {
      const result = await deductWalletBalanceRpc(user.id, amount, description)
      if (result.success) {
        await get().refreshWallet()
        return true
      }
      return false
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
