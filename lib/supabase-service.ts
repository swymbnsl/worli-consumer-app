// ========================================
// FILE: lib/supabase-service.ts
// Centralized Supabase data-access layer
// ========================================

import { supabase } from "@/lib/supabase"
import {
  Address,
  AddressInsert,
  AddressUpdate,
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
export async function fetchWallet(userId: string): Promise<Wallet> {
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error) throw error
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

/**
 * Update wallet balance.
 */
export async function updateWalletBalance(
  userId: string,
  newBalance: number,
): Promise<void> {
  const { error } = await supabase
    .from("wallets")
    .update({ balance: newBalance })
    .eq("user_id", userId)

  if (error) throw error
}

/**
 * Create a transaction record.
 */
export async function createTransaction(
  transaction: TransactionInsert,
): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .insert([transaction])

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
  /** Wallet credit amount granted to both parties upon qualifying order */
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

  if (error) throw error

  return data as ReferralSuccess | ReferralError
}

export interface ReferralStats {
  /** Number of people who signed up using this user's code */
  totalReferrals: number
  /** Sum of referrer_reward_amount where status = 'rewarded' */
  totalEarned: number
}

/**
 * Fetches referral stats for the given user:
 *  - How many people they referred (all statuses)
 *  - How much wallet credit they have earned (rewarded rows only)
 */
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const { data, error } = await supabase
    .from("referrals")
    .select("referrer_reward_amount, status")
    .eq("referrer_id", userId)

  if (error) throw error

  const rows = (data ?? []) as { referrer_reward_amount: number; status: string }[]
  const totalReferrals = rows.length
  const totalEarned = rows
    .filter((r) => r.status === "rewarded")
    .reduce((sum: number, r) => sum + (r.referrer_reward_amount ?? 0), 0)

  return { totalReferrals, totalEarned }
}
