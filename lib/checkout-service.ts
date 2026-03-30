// ============================================================================
// FILE: lib/checkout-service.ts
// Client-side service for secure atomic checkout
// All amount calculations are done server-side
// ============================================================================

import { supabase } from "@/lib/supabase"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InitiateCheckoutRequest {
  action: "initiate"
  use_wallet: boolean
  address_id_override?: string
}

export interface InitiateCheckoutResponse {
  session_id: string
  total_amount: number
  wallet_amount: number
  razorpay_amount: number
  razorpay_order_id: string | null
  razorpay_key_id: string | null
  expires_at: string
}

export interface CompleteCheckoutRequest {
  action: "complete"
  session_id: string
  razorpay_payment_id?: string
  razorpay_signature?: string
}

export interface CompleteCheckoutResponse {
  success: true
  subscriptions: Array<{
    id: string
    product_id: string
    total_bottles: number
    amount_paid: number
  }>
  new_wallet_balance: number
}

export interface CheckoutError {
  error: string
}

// ─── Wallet Recharge Types ───────────────────────────────────────────────────

export interface InitiateRechargeRequest {
  action: "initiate"
  amount: number
}

export interface InitiateRechargeResponse {
  order_id: string
  amount: number
  currency: string
  key_id: string
}

export interface VerifyRechargeRequest {
  action: "verify"
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

export interface VerifyRechargeResponse {
  verified: true
  amount: number
  new_balance: number
  payment_id: string
  referral?: any
  duplicate?: boolean
}

// ─── Checkout Service ────────────────────────────────────────────────────────

/**
 * Initiates checkout by calculating amounts server-side and creating a session.
 * 
 * @param useWallet - Whether to use wallet balance for payment
 * @param addressIdOverride - Optional address to use for all cart items
 * @returns Session details including payment requirements
 */
export async function initiateCheckout(
  useWallet: boolean,
  addressIdOverride?: string
): Promise<InitiateCheckoutResponse> {
  const { data, error } = await supabase.functions.invoke("checkout", {
    body: {
      action: "initiate",
      use_wallet: useWallet,
      address_id_override: addressIdOverride || null,
    },
  })

  if (error) {
    console.error("Checkout initiation failed:", error)
    throw new Error(error.message || "Failed to initiate checkout")
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data as InitiateCheckoutResponse
}

/**
 * Completes checkout by verifying payment and creating subscriptions atomically.
 * 
 * @param sessionId - Checkout session ID from initiate
 * @param paymentDetails - Razorpay payment details (if payment was required)
 * @returns Success response with created subscriptions
 */
export async function completeCheckout(
  sessionId: string,
  paymentDetails?: {
    razorpay_payment_id: string
    razorpay_signature: string
  }
): Promise<CompleteCheckoutResponse> {
  const { data, error } = await supabase.functions.invoke("checkout", {
    body: {
      action: "complete",
      session_id: sessionId,
      razorpay_payment_id: paymentDetails?.razorpay_payment_id || null,
      razorpay_signature: paymentDetails?.razorpay_signature || null,
    },
  })

  if (error) {
    console.error("Checkout completion failed:", error)
    throw new Error(error.message || "Failed to complete checkout")
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data as CompleteCheckoutResponse
}

// ─── Wallet Recharge Service ─────────────────────────────────────────────────

/**
 * Initiates wallet recharge by creating a Razorpay order.
 * 
 * @param amount - Recharge amount in rupees
 * @returns Razorpay order details
 */
export async function initiateWalletRecharge(
  amount: number
): Promise<InitiateRechargeResponse> {
  const { data, error } = await supabase.functions.invoke("wallet-recharge", {
    body: {
      action: "initiate",
      amount,
    },
  })

  if (error) {
    console.error("Wallet recharge initiation failed:", error)
    throw new Error(error.message || "Failed to initiate wallet recharge")
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data as InitiateRechargeResponse
}

/**
 * Verifies wallet recharge payment and credits the wallet.
 * 
 * @param paymentDetails - Razorpay payment verification details
 * @returns Verification result with new wallet balance
 */
export async function verifyWalletRecharge(paymentDetails: {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}): Promise<VerifyRechargeResponse> {
  const { data, error } = await supabase.functions.invoke("wallet-recharge", {
    body: {
      action: "verify",
      razorpay_payment_id: paymentDetails.razorpay_payment_id,
      razorpay_order_id: paymentDetails.razorpay_order_id,
      razorpay_signature: paymentDetails.razorpay_signature,
    },
  })

  if (error) {
    console.error("Wallet recharge verification failed:", error)
    throw new Error(error.message || "Failed to verify wallet recharge")
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  if (!data?.verified) {
    throw new Error("Payment verification failed")
  }

  return data as VerifyRechargeResponse
}
