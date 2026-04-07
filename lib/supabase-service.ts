// ========================================
// FILE: lib/supabase-service.ts
// Centralized Supabase data-access layer
// ========================================

import { supabase } from "@/lib/supabase"
import {
  Address,
  AddressInsert,
  AddressUpdate,
  FreeSampleConfig,
  Offer,
  Order,
  Product,
  Subscription,
  SubscriptionInsert,
  SubscriptionUpdate,
  Transaction,
  TransactionInsert,
  Wallet,
  WalletUpdate,
} from "@/types/database.types"

// ─── Orders ────────────────────────────────────────────────────────────────────

/**
 * Fetch orders for a user within a date range (default: last 7 days → future 30 days).
 */
export async function fetchHomeOrders(userId: string): Promise<Order[]> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .gte("delivery_date", sevenDaysAgo.toISOString().split("T")[0])
    .order("delivery_date", { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Fetch all orders for a user (most recent first).
 */
export async function fetchAllOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("delivery_date", { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Fetch a single order by ID (scoped to user).
 */
export async function fetchOrderById(
  orderId: string,
  userId: string,
): Promise<Order> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("user_id", userId)
    .single()

  if (error) throw error
  return data
}

/**
 * Create a new order.
 */
export async function createOrder(order: {
  order_number: string
  user_id: string
  delivery_date: string
  quantity: number
  amount: number
  status: string
}): Promise<void> {
  const { error } = await supabase.from("orders").insert([order])
  if (error) throw error
}

// ─── Products ──────────────────────────────────────────────────────────────────

/**
 * Fetch all active products.
 */
export async function fetchActiveProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Fetch a single product by ID.
 */
export async function fetchProductById(
  productId: string,
): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single()

  if (error) throw error
  return data
}

/**
 * Fetch a product summary (id, name, price, image_url, volume) by ID.
 */
export async function fetchProductSummary(
  productId: string,
): Promise<Pick<
  Product,
  "id" | "name" | "price" | "image_url" | "volume"
> | null> {
  const { data, error } = await supabase
    .from("products")
    .select("id,name,price,image_url,volume")
    .eq("id", productId)
    .single()

  if (error) throw error
  return data
}

// ─── Offers ────────────────────────────────────────────────────────────────────

/**
 * Fetch all active offers.
 */
export async function fetchActiveOffers(): Promise<Offer[]> {
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })

  if (error) throw error
  return data || []
}

// ─── Subscriptions ─────────────────────────────────────────────────────────────

/**
 * Fetch the active subscription for a user (returns null if none).
 */
export async function fetchActiveSubscription(
  userId: string,
): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single()

  // PGRST116 = no rows found – not an error, just no subscription
  if (error && error.code !== "PGRST116") throw error
  return data
}

/**
 * Fetch all active subscriptions for a user (for home page).
 */
export async function fetchActiveSubscriptions(
  userId: string,
): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")

  if (error) throw error
  return data || []
}

/**
 * Cancel a subscription by ID.
 */
export async function cancelSubscription(
  subscriptionId: string,
): Promise<void> {
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("id", subscriptionId)

  if (error) throw error
}

/**
 * Update a subscription by ID.
 */
export async function updateSubscription(
  subscriptionId: string,
  data: SubscriptionUpdate,
): Promise<void> {
  const { error } = await supabase
    .from("subscriptions")
    .update(data)
    .eq("id", subscriptionId)

  if (error) throw error
}

/**
 * Update a subscription's paused dates
 */
export async function updateSubscriptionPausedDates(
  subscriptionId: string,
  pausedDates: string[],
): Promise<void> {
  const { error } = await supabase
    .from("subscriptions")
    .update({ paused_dates: pausedDates })
    .eq("id", subscriptionId)

  if (error) throw error
}

/**
 * Check if an address has any active subscriptions.
 */
export async function hasActiveSubscriptionsForAddress(
  addressId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("address_id", addressId)
    .eq("status", "active")
    .limit(1)

  return (data?.length ?? 0) > 0
}

/**
 * Save or update a user's delivery time preference.
 */
export async function saveDeliveryPreference(
  userId: string,
  preferredDeliveryTime: string,
): Promise<void> {
  const { error } = await supabase
    .from("delivery_preferences")
    .upsert(
      { user_id: userId, preferred_delivery_time: preferredDeliveryTime },
      { onConflict: "user_id" },
    )

  if (error) throw error
}

/**
 * Create a single subscription.
 */
export async function createSubscription(
  subscription: SubscriptionInsert,
): Promise<Subscription> {
  const result = await createSubscriptions([subscription])
  return result[0]
}

/**
 * Create multiple subscriptions in a batch using the edge function.
 * Pass discountContext when a promo code was applied so the edge function
 * can record the usage (which triggers discounts.current_uses increment).
 */
export async function createSubscriptions(
  subscriptions: SubscriptionInsert[],
  discountContext?: { discount_amount: number; original_amount: number } | null,
): Promise<Subscription[]> {
  const { data, error } = await supabase.functions.invoke(
    "create-subscriptions",
    { body: { subscriptions, discount_context: discountContext ?? null } },
  )

  if (error) {
    // supabase-js wraps non-2xx responses. Try to extract our custom error
    // It's often in error.context?.error or error.message depending on the exact error type
    const customError = error.context?.error || error.message
    throw new Error(customError || "Failed to create subscriptions")
  }
  if (data?.error) throw new Error(data.error)
  return data?.subscriptions || []
}

/**
 * Create a prepaid subscription with secure wallet deduction using RPC.
 * This function atomically:
 * 1. Deducts wallet balance (if use_wallet is true)
 * 2. Creates a debit transaction
 * 3. Creates the subscription with bottle credits
 */
export interface CreatePrepaidSubscriptionParams {
  user_id: string
  product_id: string
  address_id: string
  duration_months: number
  quantity: number
  frequency: string
  start_date: string
  interval_days?: number | null
  custom_quantities?: Record<string, number> | null
  delivery_time?: string
  use_wallet: boolean
  total_amount: number
  razorpay_payment_id?: string | null
  razorpay_amount?: number
}

export interface CreatePrepaidSubscriptionResult {
  success: boolean
  subscription_id: string
  total_bottles: number
  amount_paid: number
  wallet_deducted: number
  razorpay_paid: number
  transaction_id: string | null
  new_wallet_balance: number
}

export async function createPrepaidSubscription(
  params: CreatePrepaidSubscriptionParams,
): Promise<CreatePrepaidSubscriptionResult> {
  const { data, error } = await supabase.rpc("create_prepaid_subscription", {
    p_user_id: params.user_id,
    p_product_id: params.product_id,
    p_address_id: params.address_id,
    p_duration_months: params.duration_months,
    p_quantity: params.quantity,
    p_frequency: params.frequency,
    p_start_date: params.start_date,
    p_interval_days: params.interval_days ?? null,
    p_custom_quantities: params.custom_quantities ?? null,
    p_delivery_time: params.delivery_time ?? "morning",
    p_use_wallet: params.use_wallet,
    p_total_amount: params.total_amount,
    p_razorpay_payment_id: params.razorpay_payment_id ?? null,
    p_razorpay_amount: params.razorpay_amount ?? 0,
  })

  if (error) {
    // Parse the error message from PostgreSQL exception
    const match = error.message?.match(/ERROR:\s*(.+?)(?:\s*CONTEXT:|$)/i)
    const message = match?.[1] || error.message || "Failed to create subscription"
    throw new Error(message)
  }

  if (!data?.success) {
    throw new Error("Failed to create subscription")
  }

  return data as CreatePrepaidSubscriptionResult
}

/**
 * Create multiple prepaid subscriptions (batch).
 * Each subscription is created atomically with its own wallet deduction.
 */
export async function createPrepaidSubscriptions(
  subscriptions: CreatePrepaidSubscriptionParams[],
): Promise<CreatePrepaidSubscriptionResult[]> {
  const results: CreatePrepaidSubscriptionResult[] = []

  for (const sub of subscriptions) {
    const result = await createPrepaidSubscription(sub)
    results.push(result)
  }

  return results
}

/**
 * Fetch subscription duration discounts from database.
 */
export interface DurationDiscount {
  id: string
  duration_months: number
  discount_percent: number
  display_label: string | null
  is_active: boolean
}

export async function fetchDurationDiscounts(): Promise<DurationDiscount[]> {
  const { data, error } = await supabase
    .from("subscription_duration_discounts")
    .select("*")
    .eq("is_active", true)
    .order("duration_months", { ascending: true })

  if (error) throw error
  return data || []
}

// ─── Addresses ─────────────────────────────────────────────────────────────────

/**
 * Fetch all addresses for a user (default address first).
 */
export async function fetchUserAddresses(userId: string): Promise<Address[]> {
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Delete an address by ID.
 */
export async function deleteAddress(addressId: string): Promise<void> {
  const { error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", addressId)

  if (error) throw error
}

/**
 * Set an address as the default (clears previous default).
 */
export async function setDefaultAddress(
  userId: string,
  addressId: string,
): Promise<void> {
  // Clear all defaults for the user
  await supabase
    .from("addresses")
    .update({ is_default: false })
    .eq("user_id", userId)

  // Set the chosen address as default
  const { error } = await supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", addressId)

  if (error) throw error
}

/**
 * Create a new address. If is_default is true, clears other defaults first.
 * Throws a user-friendly error if an address with the same name already exists.
 */
export async function createAddress(data: AddressInsert): Promise<Address> {
  if (!data.user_id) throw new Error("User ID is required")

  // Check for duplicate name
  const existing = await fetchUserAddresses(data.user_id)
  const nameLower = (data.name || "Home").toLowerCase().trim()
  const dup = existing.find((a) => a.name?.toLowerCase().trim() === nameLower)
  if (dup) {
    throw new Error(
      `You already have an address named "${dup.name}". Please use a different name.`,
    )
  }

  if (data.is_default) {
    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", data.user_id)
  }

  const { data: address, error } = await supabase
    .from("addresses")
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return address
}

/**
 * Update an existing address. If is_default is true, clears other defaults first.
 * Throws a user-friendly error if another address with the same name already exists.
 */
export async function updateAddress(
  addressId: string,
  userId: string,
  data: AddressUpdate,
): Promise<Address> {
  // Check for duplicate name (exclude the address being edited)
  if (data.name) {
    const existing = await fetchUserAddresses(userId)
    const nameLower = data.name.toLowerCase().trim()
    const dup = existing.find(
      (a) => a.name?.toLowerCase().trim() === nameLower && a.id !== addressId,
    )
    if (dup) {
      throw new Error(
        `You already have an address named "${dup.name}". Please use a different name.`,
      )
    }
  }

  if (data.is_default) {
    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", userId)
  }

  const { data: address, error } = await supabase
    .from("addresses")
    .update(data)
    .eq("id", addressId)
    .select()
    .single()

  if (error) throw error
  return address
}

/**
 * Check if a duplicate active subscription exists for this product + address.
 * Returns true if a duplicate exists.
 */
export async function checkDuplicateSubscription(
  userId: string,
  productId: string,
  addressId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .eq("address_id", addressId)
    .eq("status", "active")
    .limit(1)

  return (data?.length ?? 0) > 0
}

// ─── Wallets ───────────────────────────────────────────────────────────────────

/**
 * Fetch the wallet for a user.
 */
export async function fetchWallet(userId: string): Promise<Wallet | null> {
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    console.error("fetchWallet error:", error);
    return null;
  }
  return data
}

/**
 * Fetch recent transactions for a user.
 */
export async function fetchTransactions(
  userId: string,
  limit = 50,
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// ─── RPC Migrations (Secure Logic) ──────────────────────────────────

/**
 * Deduct from wallet securely via RPC.
 */
export async function deductWalletBalanceRpc(
  userId: string,
  amount: number,
  description: string,
): Promise<{ success: boolean; new_balance?: number; transaction_id?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc("deduct_wallet_balance", {
      p_user_id: userId,
      p_amount: amount,
      p_description: description,
    })

    if (error) throw error

    // data is returned as JSON from the RPC
    return data as any
  } catch (err: any) {
    console.error("RPC deduct_wallet_balance failed:", err)
    return { success: false, error: err.message }
  }
}



/**
 * Create a transaction record.
 */
export async function createTransaction(
  transaction: TransactionInsert,
): Promise<void> {
  const { error } = await supabase.from("transactions").insert([transaction])

  if (error) throw error
}

/**
 * Update wallet settings.
 */
export async function updateWalletSettings(
  userId: string,
  settings: WalletUpdate,
): Promise<void> {
  const { error } = await supabase
    .from("wallets")
    .update(settings)
    .eq("user_id", userId)

  if (error) throw error
}

// ─── Discounts ─────────────────────────────────────────────────────────────────

export interface DiscountResult {
  valid: true
  discount_id: string
  discount_type: "percentage" | "flat_amount"
  discount_value: number
  discount_amount: number
  final_amount: number
  /** NULL = no order-count limit. Set to e.g. 7 means discount applies to first 7 deliveries only. */
  max_discount_orders: number | null
}

export interface DiscountError {
  valid: false
  error: string
}

/**
 * Calls the validate_discount_code Postgres function.
 * Returns the discount breakdown if valid, or an error message if not.
 */
export async function validateDiscountCode(
  code: string,
  userId: string,
  orderAmount: number,
  applicableTo = "all",
): Promise<DiscountResult | DiscountError> {
  const { data, error } = await supabase.rpc("validate_discount_code", {
    p_code: code,
    p_user_id: userId,
    p_order_amount: orderAmount,
    p_applicable_to: applicableTo,
  })

  if (error) throw error

  // data is a JSON object returned from the PL/pgSQL function
  return data as DiscountResult | DiscountError
}

// ─── Referrals ─────────────────────────────────────────────────────────────────

export interface ReferralSuccess {
  success: true
  /** UUID of the user whose referral code was used */
  referrer_id: string
  /** Wallet credit amount granted to both parties upon first successful recharge */
  reward_amount: number
}

export interface ReferralError {
  success: false
  error: string
}

export interface ReferralCodeCheck {
  valid: boolean
  /** Set when valid is false */
  error?: string
}

/**
 * Calls the `check_referral_code` SECURITY DEFINER Postgres function.
 *
 * Read-only check — does NOT apply the code. Use this for inline UI
 * validation before form submission.
 *
 * Returns `{ valid: true }` if the code exists, belongs to a different user,
 * and the caller has not already used a referral code.
 * Returns `{ valid: false, error }` otherwise.
 */
export async function checkReferralCode(
  code: string,
): Promise<ReferralCodeCheck> {
  const { data, error } = await supabase.rpc("check_referral_code", {
    p_code: code.trim().toUpperCase(),
  })

  if (error) {
    // PGRST202: function not found — migration hasn't been run yet
    if (error.code === "PGRST202") {
      throw new Error(
        "check_referral_code function not found. Please run migration 20260227000003_check_referral_code_fn.sql in Supabase.",
      )
    }
    throw error
  }

  return data as ReferralCodeCheck
}

/**
 * Calls the `apply_referral_code` SECURITY DEFINER Postgres function.
 *
 * This single RPC call atomically:
 *  1. Validates the code (case-insensitive, not-self, not-already-used)
 *  2. Sets `users.referred_by` for the current user
 *  3. Inserts a row into `referrals` with the current reward snapshot
 *
 * Returns a {@link ReferralSuccess} on success or a {@link ReferralError}
 * with a human-readable message on any failure.
 */
export async function applyReferralCode(
  code: string,
): Promise<ReferralSuccess | ReferralError> {
  const { data, error } = await supabase.rpc("apply_referral_code", {
    p_code: code.trim().toUpperCase(),
  })

  if (error) {
    return {
      success: false,
      error: error.message || "Unable to apply referral code right now.",
    }
  }

  return data as ReferralSuccess | ReferralError
}

/**
 * Returns pending referral bonus amount for the current referee.
 * Uses referral row status (server truth) instead of local transaction history.
 */
export async function getPendingReferralBonusAmount(
  refereeId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("referrals")
    .select("referee_reward_amount, expires_at")
    .eq("referee_id", refereeId)
    .eq("status", "pending")
    .maybeSingle()

  if (error) {
    console.error("Failed to fetch pending referral bonus:", error)
    return 0
  }

  if (!data) return 0

  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return 0
  }

  return Number(data.referee_reward_amount) || 0
}

export async function fetchAppSetting(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", key)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching app setting:", error)
  }
  return data?.setting_value || null
}

export async function calculateMonthlySubscriptionCost(
  userId: string,
): Promise<number> {
  const { data: subs, error } = await supabase
    .from("subscriptions")
    .select("*, product:products(price)")
    .eq("user_id", userId)
    .eq("status", "active")

  if (error) {
    console.error("Error fetching subscriptions for cost calculation:", error)
    return 0
  }
  if (!subs || subs.length === 0) return 0

  let totalCost = 0
  for (const sub of subs) {
    const price = (sub.product as any)?.price || 0
    if (price === 0) continue

    const qty = sub.quantity || 1

    if (sub.frequency === "daily") {
      totalCost += qty * price * 30
    } else if (sub.frequency === "alternate") {
      totalCost += qty * price * 15
    } else if (sub.frequency === "custom" && sub.custom_quantities) {
      let weeklyTotal = 0
      try {
        const cq =
          typeof sub.custom_quantities === "string"
            ? JSON.parse(sub.custom_quantities)
            : sub.custom_quantities

        for (const key in cq) {
          weeklyTotal += (Number(cq[key]) || 0) * price
        }
        totalCost += (weeklyTotal / 7) * 30
      } catch (e) {
        console.error("Error parsing custom quantities", e)
      }
    }
  }

  return Math.round(totalCost)
}

// ─── Free Samples ──────────────────────────────────────────────────────────────

/**
 * Fetch the free sample configuration.
 * Returns null if no config row exists or feature is disabled.
 */
export async function fetchFreeSampleConfig(): Promise<FreeSampleConfig | null> {
  const { data, error } = await supabase
    .from("free_sample_config")
    .select("*")
    .eq("is_enabled", true)
    .limit(1)
    .single()

  // PGRST116 = no rows found
  if (error && error.code !== "PGRST116") throw error
  return data
}

/**
 * Check if the current user has already claimed their free sample.
 */
export async function hasClaimedFreeSample(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("users")
    .select("claimed_free_sample")
    .eq("id", userId)
    .single()

  if (error) throw error
  return data?.claimed_free_sample ?? false
}

export interface FreeSampleClaimSuccess {
  success: true
  orders: {
    order_number: string
    delivery_date: string
    quantity: number
    amount: number
  }[]
  message: string
}

export interface FreeSampleClaimError {
  success: false
  error: string
}

/**
 * Claims the free sample by calling the `claim_free_sample` SECURITY DEFINER
 * Postgres function. Creates ₹0 orders for the chosen delivery dates.
 */
export async function claimFreeSample(
  dates: string[],
  addressId?: string,
): Promise<FreeSampleClaimSuccess | FreeSampleClaimError> {
  const { data, error } = await supabase.rpc("claim_free_sample", {
    p_dates: dates,
    p_address_id: addressId ?? null,
  })

  if (error) throw error

  return data as FreeSampleClaimSuccess | FreeSampleClaimError
}

export interface ReferralDetail {
  id: string
  referee_name: string | null
  referee_phone: string | null
  status: string
  created_at: string
  rewarded_at: string | null
  reward_amount: number
}

export interface ReferralStats {
  totalReferrals: number
  successfulReferrals: number
  pendingReferrals: number
  totalEarned: number
  referrals: ReferralDetail[]
}

interface ReferralStatsRow {
  id: string
  referrer_reward_amount: number | string | null
  status: string | null
  created_at: string
  referrer_rewarded_at: string | null
  referee: {
    full_name: string | null
    phone_number: string | null
  } | {
    full_name: string | null
    phone_number: string | null
  }[] | null
}

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const { data: statsData, error: statsError } = await supabase
    .from("referrals")
    .select(
      `
      id,
      referrer_reward_amount,
      status,
      created_at,
      referrer_rewarded_at,
      referee:referee_id (
        full_name,
        phone_number
      )
    `,
    )
    .eq("referrer_id", userId)
    .order("created_at", { ascending: false })

  if (statsError) {
    console.error("Failed to fetch referral stats:", statsError)
    return {
      totalReferrals: 0,
      successfulReferrals: 0,
      pendingReferrals: 0,
      totalEarned: 0,
      referrals: [],
    }
  }

  const rows: ReferralStatsRow[] = (statsData as any) ?? []
  const totalReferrals = rows.length
  const successfulReferrals = rows.filter((r) => r.status === "rewarded").length
  const pendingReferrals = rows.filter((r) => r.status === "pending").length

  // Compute total earned by summing rewards where status is 'rewarded'
  const totalEarned = rows
    .filter((r: ReferralStatsRow) => r.status === "rewarded")
    .reduce(
      (sum: number, r: ReferralStatsRow) =>
        sum + (Number(r.referrer_reward_amount) || 0),
      0,
    )

  // Map to detailed referrals
  const referrals: ReferralDetail[] = rows.map((r) => {
    // If Supabase returns the foreign key relation as an array of length 1, extract it.
    const refereeObj = Array.isArray(r.referee) ? r.referee[0] : r.referee
    
    return {
      id: r.id,
      referee_name: refereeObj?.full_name || null,
      referee_phone: refereeObj?.phone_number || null,
      status: r.status || "pending",
      created_at: r.created_at,
      rewarded_at: r.referrer_rewarded_at || null,
      reward_amount: Number(r.referrer_reward_amount) || 0,
    }
  })

  return {
    totalReferrals,
    successfulReferrals,
    pendingReferrals,
    totalEarned,
    referrals,
  }
}

// ─── Users & Auth ─────────────────────────────────────────────────────────

/**
 * Fetch a user by ID.
 */
export async function fetchUserById(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Create a new user.
 */
export async function createUser(user: any) {
  const { data, error } = await supabase.from("users").insert([user])

  if (error) throw error
  return data
}

/**
 * Update user details.
 */
export async function updateUserDb(userId: string, updates: any) {
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)

  if (error) throw error
  return data
}

// ─── Wallets ────────────────────────────────────────────────────────────────

/**
 * Upsert wallet for a user.
 */
export async function upsertWallet(walletData: any) {
  const { data, error } = await supabase
    .from("wallets")
    .upsert(walletData, { onConflict: "user_id" })
    .select()
    .maybeSingle()

  if (error) throw error
  return data
}

// ─── Preferences ────────────────────────────────────────────────────────────

/**
 * Fetch user preferences.
 */
export async function fetchUserPreferences(userId: string) {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Upsert user preferences.
 */
export async function upsertUserPreferences(prefData: any) {
  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(prefData, { onConflict: "user_id" })
    .select()
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Update user preferences.
 */
export async function updateUserPreferencesDb(userId: string, updates: any) {
  const { error } = await supabase
    .from("user_preferences")
    .update(updates)
    .eq("user_id", userId)

  if (error) throw error
}

/**
 * Insert user preferences.
 */
export async function insertUserPreferencesDb(prefData: any) {
  const { error } = await supabase.from("user_preferences").insert([prefData])

  if (error) throw error
}

/**
 * Fetch delivery preferences.
 */
export async function fetchDeliveryPreferences(userId: string) {
  const { data, error } = await supabase
    .from("delivery_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Upsert delivery preferences.
 */
export async function upsertDeliveryPreferences(prefData: any) {
  const { data, error } = await supabase
    .from("delivery_preferences")
    .upsert(prefData, { onConflict: "user_id" })
    .select()
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Update delivery preferences.
 */
export async function updateDeliveryPreferencesDb(
  userId: string,
  updates: any,
) {
  const { error } = await supabase
    .from("delivery_preferences")
    .update(updates)
    .eq("user_id", userId)

  if (error) throw error
}

/**
 * Insert delivery preferences.
 */
export async function insertDeliveryPreferencesDb(prefData: any) {
  const { error } = await supabase
    .from("delivery_preferences")
    .insert([prefData])

  if (error) throw error
}

// ─── Cart ───────────────────────────────────────────────────────────────────

/**
 * Fetch cart items for a user.
 */
export async function fetchCartItems(userId: string) {
  const { data, error } = await supabase
    .from("cart_items")
    .select(
      `
      id,
      product_id,
      quantity,
      frequency,
      start_date,
      interval_days,
      custom_quantities,
      preferred_delivery_time,
      address_id,
      duration_months,
      total_bottles,
      total_amount,
      products:product_id (
        id,
        name,
        price,
        image_url,
        volume
      )
    `,
    )
    .eq("user_id", userId)

  if (error) throw error
  return data || []
}

/**
 * Add item to cart.
 */
export async function insertCartItem(itemData: any) {
  const { data, error } = await supabase
    .from("cart_items")
    .insert([itemData])
    .select(
      `
      id,
      product_id,
      quantity,
      frequency,
      start_date,
      interval_days,
      custom_quantities,
      preferred_delivery_time,
      address_id,
      duration_months,
      total_bottles,
      total_amount,
      products:product_id (
        id,
        name,
        price,
        image_url,
        volume
      )
    `,
    )
    .single()

  if (error) throw error
  return data
}

/**
 * Remove item from cart.
 */
export async function deleteCartItem(itemId: string) {
  const { error } = await supabase.from("cart_items").delete().eq("id", itemId)

  if (error) throw error
}

/**
 * Clear user cart.
 */
export async function clearUserCart(userId: string) {
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", userId)

  if (error) throw error
}

/**
 * Update cart item.
 */
export async function updateCartItemDb(
  userId: string,
  itemId: string,
  updates: any,
) {
  const { error } = await supabase
    .from("cart_items")
    .update(updates)
    .eq("id", itemId)
    .eq("user_id", userId)

  if (error) throw error
}

// ─── Bottle Returns ─────────────────────────────────────────────────────────

/**
 * Create a new bottle return request
 */
export async function createBottleReturn(data: {
  user_id: string
  address_id: string
  quantity: number
  return_date: string
  notes?: string
}) {
  const { data: returnData, error } = await supabase
    .from("bottle_returns")
    .insert({
      user_id: data.user_id,
      quantity: data.quantity,
      return_date: data.return_date,
      notes: data.notes || null,
      status: "requested",
    })
    .select()
    .single()

  if (error) throw error
  return returnData
}

/**
 * Fetch all bottle returns for a user
 */
export async function fetchUserBottleReturns(userId: string) {
  const { data, error } = await supabase
    .from("bottle_returns")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Cancel a bottle return request
 */
export async function cancelBottleReturn(returnId: string) {
  const { error } = await supabase
    .from("bottle_returns")
    .update({ status: "cancelled" })
    .eq("id", returnId)

  if (error) throw error
}

/**
 * Count pending bottle returns for a user
 */
export async function countPendingBottleReturns(userId: string): Promise<number> {
  const { data, error, count } = await supabase
    .from("bottle_returns")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ["pending", "requested"])

  if (error) throw error
  return count || 0
}
