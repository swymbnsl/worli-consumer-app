// ============================================================================
// FILE: lib/checkout-service.ts
// Client-side service for bottle-based checkout
// Checkout only checks bottle balance - no payment during subscription creation
// Payment only happens during bottle purchase (wallet recharge)
// ============================================================================

import { supabase } from "@/lib/supabase"

async function extractFunctionErrorMessage(error: any): Promise<string | null> {
  const response = error?.context
  if (!response || typeof response?.json !== "function") {
    return null
  }

  try {
    const body = await response.json()
    if (body && typeof body.error === "string" && body.error.length > 0) {
      return body.error
    }
  } catch {
    // Ignore JSON parse issues and fall back to default error message.
  }

  return null
}

// ─── Types ───────────────────────────────────────────────────────────────────

// Bottle check request/response
export interface CheckBottleBalanceRequest {
  action: "check"
  address_id_override?: string
}

export interface CheckBottleBalanceResponse {
  success: true
  bottles_required: number
  bottles_available: number
  bottle_price: number
  cart_items: number
}

export interface InsufficientBottlesResponse {
  success: false
  error: "INSUFFICIENT_BOTTLES"
  message: string
  bottles_required: number
  bottles_available: number
  bottles_short: number
  bottle_price: number
  amount_to_recharge: number
  wallet_balance: number
}

// Complete checkout request/response (no payment)
export interface CompleteCheckoutRequest {
  action: "complete"
  address_id_override?: string
}

export interface CompleteCheckoutResponse {
  success: true
  subscriptions: Array<{
    id: string
    product_id: string
    total_bottles: number
    start_date: string
    frequency: string
    duration_months: number
  }>
  total_bottles: number
  bottle_balance: number
}

export interface CheckoutError {
  error: string
}

// Legacy types (kept for compatibility)
export interface InitiateCheckoutResponse {
  session_id: string
  total_amount: number
  wallet_amount: number
  razorpay_amount: number
  razorpay_order_id: string | null
  razorpay_key_id: string | null
  expires_at: string
}

// ─── Wallet Recharge (Bottle Purchase) Types ─────────────────────────────────

export interface InitiateRechargeRequest {
  action: "initiate"
  amount?: number
  bottles?: number
  min_bottles_required?: number
}

export interface InitiateRechargeResponse {
  order_id: string
  amount: number
  currency: string
  key_id: string
  bottles: number
  bottle_price: number
  amount_rupees: number
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
  bottles_purchased: number
  bottle_price: number
  new_balance: number
  new_bottle_balance: number
  payment_id: string
  referral?: any
  duplicate?: boolean
}

// ─── Checkout Service (Bottle-Based) ─────────────────────────────────────────

/**
 * Checks if user has enough bottle balance for cart checkout.
 * 
 * @param addressIdOverride - Optional address to use for all cart items
 * @returns Success if enough bottles, or error with shortage details
 */
export async function checkBottleBalance(
  addressIdOverride?: string
): Promise<CheckBottleBalanceResponse | InsufficientBottlesResponse> {
  const { data, error } = await supabase.functions.invoke("checkout", {
    body: {
      action: "check",
      address_id_override: addressIdOverride || null,
    },
  })

  if (error) {
    console.error("Checkout check failed:", error)
    const functionError = await extractFunctionErrorMessage(error)
    throw new Error(functionError || error.message || "Failed to check bottle balance")
  }

  // Server returns 200 for both success and insufficient bottles
  // Client checks data.success to determine which case
  return data
}

/**
 * Completes checkout by creating subscriptions.
 * NO payment processing - just checks bottle balance and creates subscriptions.
 * Bottles are deducted daily during order creation, not upfront.
 * 
 * @param addressIdOverride - Optional address to use for all cart items
 * @returns Success response with created subscriptions
 */
export async function completeCheckout(
  addressIdOverride?: string
): Promise<CompleteCheckoutResponse> {
  const { data, error } = await supabase.functions.invoke("checkout", {
    body: {
      action: "complete",
      address_id_override: addressIdOverride || null,
    },
  })

  if (error) {
    console.error("Checkout completion failed:", error)
    const functionError = await extractFunctionErrorMessage(error)
    throw new Error(functionError || error.message || "Failed to complete checkout")
  }

  if (data?.error) {
    // Handle INSUFFICIENT_BOTTLES error specifically
    if (data.error === "INSUFFICIENT_BOTTLES") {
      throw new Error(data.message || "You need more bottles to subscribe")
    }
    throw new Error(data.error)
  }

  if (!data?.success) {
    throw new Error(data?.message || "Checkout failed")
  }

  return data as CompleteCheckoutResponse
}

// Legacy function - redirects to checkBottleBalance
export async function initiateCheckout(
  useWallet: boolean,
  addressIdOverride?: string
): Promise<any> {
  // For backward compatibility, call the new check function
  return checkBottleBalance(addressIdOverride)
}

// ─── Wallet Recharge (Bottle Purchase) Service ───────────────────────────────

/**
 * Initiates bottle purchase by creating a Razorpay order.
 * Amount must be integral multiple of bottle price.
 * 
 * @param amount - Amount in rupees
 * @param minBottlesRequired - Minimum bottles needed (for checkout shortfall)
 * @returns Razorpay order details with bottle info
 */
export async function initiateWalletRecharge(
  amount: number,
  minBottlesRequired?: number
): Promise<InitiateRechargeResponse> {
  const { data, error } = await supabase.functions.invoke("wallet-recharge", {
    body: {
      action: "initiate",
      amount,
      min_bottles_required: minBottlesRequired || null,
    },
  })

  if (error) {
    console.error("Bottle purchase initiation failed:", error)
    const functionError = await extractFunctionErrorMessage(error)
    throw new Error(functionError || error.message || "Failed to initiate bottle purchase")
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data as InitiateRechargeResponse
}

/**
 * Initiates bottle purchase by bottle count.
 * 
 * @param bottles - Number of bottles to purchase
 * @param minBottlesRequired - Minimum bottles needed (for checkout shortfall)
 * @returns Razorpay order details
 */
export async function initiateBottlePurchase(
  bottles: number,
  minBottlesRequired?: number
): Promise<InitiateRechargeResponse> {
  const { data, error } = await supabase.functions.invoke("wallet-recharge", {
    body: {
      action: "initiate",
      bottles,
      min_bottles_required: minBottlesRequired || null,
    },
  })

  if (error) {
    console.error("Bottle purchase initiation failed:", error)
    const functionError = await extractFunctionErrorMessage(error)
    throw new Error(functionError || error.message || "Failed to initiate bottle purchase")
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data as InitiateRechargeResponse
}

/**
 * Verifies bottle purchase payment and credits the wallet.
 * 
 * @param paymentDetails - Razorpay payment verification details
 * @returns Verification result with new bottle balance
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
    console.error("Bottle purchase verification failed:", error)
    const functionError = await extractFunctionErrorMessage(error)
    throw new Error(functionError || error.message || "Failed to verify bottle purchase")
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  if (!data?.verified) {
    throw new Error("Payment verification failed")
  }

  return data as VerifyRechargeResponse
}

// Alias for verifyWalletRecharge
export const verifyBottlePurchase = verifyWalletRecharge
