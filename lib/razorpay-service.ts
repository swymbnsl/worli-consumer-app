// ========================================
// FILE: lib/razorpay-service.ts
// Razorpay Payment Gateway Service
// ========================================

import RazorpayCheckout from "react-native-razorpay"
import { supabase } from "./supabase"

// Razorpay key from environment variables
const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID!

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
  amount: number // in rupees (will be converted to paise)
  currency?: string
  name?: string
  description?: string
  orderId: string
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
// Create Razorpay Order via Supabase Edge Function
// ─────────────────────────────────────────
export const createRazorpayOrder = async (
  amount: number,
  userId: string,
): Promise<CreateOrderResponse> => {
  const { data, error } = await supabase.functions.invoke(
    "create-razorpay-order",
    {
      body: {
        amount, // in rupees – edge function handles paise conversion
      },
    },
  )

  if (error) {
    throw new Error(`Failed to create order: ${error.message}`)
  }

  return data
}

// ─────────────────────────────────────────
// Open Razorpay Checkout
// ─────────────────────────────────────────
export const openRazorpayCheckout = async (
  options: CheckoutOptions,
): Promise<RazorpayPaymentResult> => {
  const razorpayOptions = {
    key: RAZORPAY_KEY_ID,
    amount: Math.round(options.amount * 100).toString(), // Amount in paise
    currency: options.currency || "INR",
    name: options.name || "Worli Dairy App",
    description: options.description || "Wallet Recharge",
    order_id: options.orderId,
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

  try {
    const result = await RazorpayCheckout.open(razorpayOptions)
    return result as RazorpayPaymentResult
  } catch (error) {
    throw error as RazorpayError
  }
}

// ─────────────────────────────────────────
// Verify Payment via Supabase Edge Function
// ─────────────────────────────────────────
export const verifyPayment = async (
  paymentResult: RazorpayPaymentResult,
): Promise<boolean> => {
  const { data, error } = await supabase.functions.invoke(
    "verify-razorpay-payment",
    {
      body: {
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_signature: paymentResult.razorpay_signature,
      },
    },
  )

  if (error) {
    throw new Error(`Payment verification failed: ${error.message}`)
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

// ─────────────────────────────────────────
// Full Recharge Flow (convenience method)
// ─────────────────────────────────────────
export const initiateWalletRecharge = async (
  amount: number,
  userId: string,
  userDetails: {
    name?: string
    email?: string
    phone?: string
  },
): Promise<RazorpayPaymentResult> => {
  // Step 1: Create order on server
  const order = await createRazorpayOrder(amount, userId)

  // Step 2: Open Razorpay checkout
  const paymentResult = await openRazorpayCheckout({
    amount,
    orderId: order.order_id,
    description: `Wallet Recharge - ₹${amount}`,
    prefill: {
      name: userDetails.name || "",
      email: userDetails.email || "",
      contact: userDetails.phone || "",
    },
    notes: {
      user_id: userId,
      purpose: "wallet_recharge",
    },
  })

  // Step 3: Verify payment on server
  const verified = await verifyPayment(paymentResult)

  if (!verified) {
    throw new Error("Payment verification failed. Please contact support.")
  }

  return paymentResult
}
