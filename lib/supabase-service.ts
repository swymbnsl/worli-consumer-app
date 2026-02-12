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
 * Create a single subscription.
 */
export async function createSubscription(
  subscription: SubscriptionInsert,
): Promise<Subscription> {
  const { data, error } = await supabase
    .from("subscriptions")
    .insert([subscription])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Create multiple subscriptions in a batch.
 */
export async function createSubscriptions(
  subscriptions: SubscriptionInsert[],
): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .insert(subscriptions)
    .select()

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
 */
export async function createAddress(data: AddressInsert): Promise<Address> {
  if (data.is_default && data.user_id) {
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
 */
export async function updateAddress(
  addressId: string,
  userId: string,
  data: AddressUpdate,
): Promise<Address> {
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
