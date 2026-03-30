// ========================================
// FILE: lib/razorpay-service.ts
// Razorpay Payment Gateway Service
// ========================================

import RazorpayCheckout from "react-native-razorpay"
import { supabase } from "./supabase"

// Razorpay key from environment variables
const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID

if (!RAZORPAY_KEY_ID) {
  console.error('RAZORPAY_KEY_ID is not configured in environment variables')
}

// Types
export interface RazorpayPaymentResult {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

export interface RazorpayError {
  code: number
  description: string
  source: string
  step: string
  reason: string
  metadata: {
    order_id?: string
    payment_id?: string
  }
}

export interface CreateOrderResponse {
  order_id: string
  amount: number
  currency: string
}

export interface AutoPayMandateResponse {
  subscription_id: string
  short_url: string
  status: string
}

export interface CheckoutOptions {
  amount?: number // in rupees (will be converted to paise)
  currency?: string
  name?: string
  description?: string
  orderId?: string
  subscriptionId?: string
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
  theme?: {
    color?: string
  }
  notes?: Record<string, string>
}

// ─────────────────────────────────────────
// Open Razorpay Checkout
// ─────────────────────────────────────────
export const openRazorpayCheckout = async (
  options: CheckoutOptions,
): Promise<RazorpayPaymentResult> => {
  if (!RAZORPAY_KEY_ID) {
    throw new Error("Razorpay is not configured. Please contact support.")
  }

  const razorpayOptions: any = {
    key: RAZORPAY_KEY_ID,
    currency: options.currency || "INR",
    name: options.name || "Worli Dairy App",
    description: options.description || "Wallet Recharge",
    prefill: {
      name: options.prefill?.name || "",
      email: options.prefill?.email || "",
      contact: options.prefill?.contact || "",
    },
    theme: {
      color: options.theme?.color || "#101B53", // primary-navy
    },
    notes: options.notes || {},
  }

  if (options.amount !== undefined) {
    razorpayOptions.amount = Math.round(options.amount * 100).toString() // Amount in paise
  }

  if (options.subscriptionId) {
    razorpayOptions.subscription_id = options.subscriptionId
  } else if (options.orderId) {
    razorpayOptions.order_id = options.orderId
  }

  try {
    const result = await RazorpayCheckout.open(razorpayOptions)
    return result as RazorpayPaymentResult
  } catch (error) {
    throw error as RazorpayError
  }
}

// ─────────────────────────────────────────
// Verify AutoPay Mandate via Supabase Edge Function
// ─────────────────────────────────────────
export const verifyAutoPayMandate = async (
  paymentResult: {
    razorpay_payment_id: string
    razorpay_subscription_id: string
    razorpay_signature: string
  },
): Promise<boolean> => {
  const { data, error } = await supabase.functions.invoke(
    "verify-razorpay-autopay",
    {
      body: {
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_subscription_id: paymentResult.razorpay_subscription_id,
        razorpay_signature: paymentResult.razorpay_signature,
      },
    },
  )

  if (error) {
    throw new Error(`AutoPay verification failed: ${error.message}`)
  }

  return data?.verified === true
}

// ─────────────────────────────────────────
// Setup AutoPay Mandate via Supabase Edge Function
// ─────────────────────────────────────────
export const setupAutoPayMandate = async (
  rechargeAmount: number,
  triggerAmount: number,
): Promise<AutoPayMandateResponse> => {
  const { data, error } = await supabase.functions.invoke(
    "setup-razorpay-autopay",
    {
      body: {
        recharge_amount: rechargeAmount, // in rupees
        trigger_amount: triggerAmount, // in rupees
      },
    },
  )

  if (error) {
    throw new Error(`Failed to setup autopay: ${error.message}`)
  }

  if (!data?.success) {
    throw new Error(data?.error || "Failed to setup autopay")
  }

  return data
}

// ─────────────────────────────────────────
// Cancel AutoPay Mandate
// ─────────────────────────────────────────
export const cancelAutoPayMandate = async (): Promise<boolean> => {
  const { data, error } = await supabase.functions.invoke(
    "cancel-razorpay-autopay",
    {
      body: {},
    },
  )

  if (error) {
    throw new Error(`Failed to cancel autopay: ${error.message}`)
  }

  return data?.cancelled === true
}
