// ============================================================================
// Supabase Edge Function: checkout
// Handles subscription creation with bottle balance check
// NO payment during checkout - just checks if user has enough bottles
// Payment only happens during bottle purchase (wallet-recharge)
// ============================================================================
// Deploy: supabase functions deploy checkout --no-verify-jwt --project-ref mrbjduttwiciolhhabpa

import { createClient } from "npm:@supabase/supabase-js@2"

// ─── Environment Variables ───────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

// ─── CORS Headers ────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// ─── Helper Functions ────────────────────────────────────────────────────────
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

async function authenticateUser(req: Request) {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return null

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

// ─── Calculate Total Bottles ─────────────────────────────────────────────────
function calculateTotalBottles(
  frequency: string,
  quantity: number,
  durationMonths: number,
  intervalDays: number | null,
  customQuantities: Record<string, number> | null
): number {
  if (frequency === "daily") {
    return quantity * 30 * durationMonths
  } else if (frequency === "custom" && customQuantities) {
    // Sum weekly quantities and multiply by ~4 weeks per month
    const weeklyTotal = Object.values(customQuantities).reduce((sum, q) => sum + q, 0)
    return weeklyTotal * 4 * durationMonths
  } else if (frequency === "on_interval" && intervalDays) {
    return quantity * Math.floor(30 / intervalDays) * durationMonths
  } else if (frequency === "buy_once") {
    return quantity
  } else {
    // Default to daily
    return quantity * 30 * durationMonths
  }
}

// ─── Apply 7 PM Cutoff Logic ─────────────────────────────────────────────────
function applyCutoffLogic(startDate: string, frequency: string): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const nowUtc = new Date()
  const nowIst = new Date(nowUtc.getTime() + IST_OFFSET_MS)
  
  const isPastCutoff = nowIst.getUTCHours() >= 19

  if (!isPastCutoff) return startDate

  const tomorrow = new Date(nowIst)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const dayAfter = new Date(nowIst)
  dayAfter.setUTCDate(dayAfter.getUTCDate() + 2)
  const dayAfterStr = dayAfter.toISOString().split('T')[0]

  if (startDate === tomorrowStr) {
    if (frequency === "buy_once") {
      throw new Error("It is past the 7 PM cutoff for tomorrow's delivery.")
    } else {
      return dayAfterStr
    }
  }

  return startDate
}

// ============================================================================
// ACTION: CHECK
// Validates cart, calculates required bottles, checks balance
// Returns success if user has enough bottles, error with shortage if not
// ============================================================================
async function handleCheck(body: any, user: any, supabaseAdmin: any) {
  console.log("🚀 [CHECK] Checking bottle balance for user:", user.id)

  const { address_id_override = null } = body

  // 1. Fetch cart items from database
  console.log("📦 [CHECK] Fetching cart items...")
  const { data: cartItems, error: cartError } = await supabaseAdmin
    .from("cart_items")
    .select("*")
    .eq("user_id", user.id)

  if (cartError) {
    console.error("❌ [CHECK] Cart fetch error:", cartError)
    return jsonResponse({ error: "Failed to fetch cart" }, 500)
  }

  if (!cartItems || cartItems.length === 0) {
    console.log("⚠️ [CHECK] Cart is empty")
    return jsonResponse({ error: "Cart is empty" }, 400)
  }

  console.log(`✓ [CHECK] Found ${cartItems.length} items in cart`)

  // 2. Fetch product prices and validate
  console.log("💰 [CHECK] Fetching product prices...")
  const productIds = cartItems.map((item: any) => item.product_id)
  const { data: products, error: productsError } = await supabaseAdmin
    .from("products")
    .select("id, name, price, is_active")
    .in("id", productIds)

  if (productsError || !products || products.length === 0) {
    console.error("❌ [CHECK] Products fetch error:", productsError)
    return jsonResponse({ error: "Failed to fetch products" }, 500)
  }

  const productMap = new Map(products.map((p: any) => [p.id, p]))
  
  // Get bottle price (from first active product)
  const bottlePrice = products[0].price

  // Validate all products exist and are active
  for (const item of cartItems) {
    const product = productMap.get(item.product_id)
    if (!product) {
      return jsonResponse({ error: `Product not found: ${item.product_id}` }, 400)
    }
    if (!product.is_active) {
      return jsonResponse({ error: `Product is no longer available: ${product.name}` }, 400)
    }
  }

  console.log("✓ [CHECK] All products validated")

  // 3. Validate addresses
  console.log("🏠 [CHECK] Validating addresses...")
  const addressIds = cartItems
    .map((item: any) => item.address_id || address_id_override)
    .filter(Boolean)

  if (addressIds.length === 0) {
    return jsonResponse({ error: "No delivery address specified" }, 400)
  }

  const { data: addresses, error: addressError } = await supabaseAdmin
    .from("addresses")
    .select("id")
    .eq("user_id", user.id)
    .in("id", addressIds)

  if (addressError || addresses.length !== new Set(addressIds).size) {
    return jsonResponse({ error: "Invalid address specified" }, 400)
  }

  console.log("✓ [CHECK] All addresses validated")

  // 4. Check for duplicate subscriptions
  console.log("🔍 [CHECK] Checking for duplicate subscriptions...")
  const { data: activeSubs, error: subsError } = await supabaseAdmin
    .from("subscriptions")
    .select("product_id, address_id")
    .eq("user_id", user.id)
    .eq("status", "active")

  if (subsError) {
    console.error("❌ [CHECK] Subscriptions fetch error:", subsError)
    return jsonResponse({ error: "Failed to check subscriptions" }, 500)
  }

  for (const item of cartItems) {
    const finalAddressId = item.address_id || address_id_override
    const isDuplicate = activeSubs?.some(
      (sub: any) => sub.product_id === item.product_id && sub.address_id === finalAddressId
    )
    if (isDuplicate) {
      const product = productMap.get(item.product_id)
      return jsonResponse(
        { error: `You already have an active subscription for ${product?.name} at this address.` },
        400
      )
    }
  }

  console.log("✓ [CHECK] No duplicate subscriptions found")

  // 5. Calculate total bottles required
  console.log("🧮 [CHECK] Calculating total bottles required...")
  let totalBottlesRequired = 0

  for (const item of cartItems) {
    // Apply cutoff logic
    try {
      item.start_date = applyCutoffLogic(item.start_date, item.frequency)
    } catch (error: any) {
      return jsonResponse({ error: error.message }, 400)
    }

    const itemBottles = calculateTotalBottles(
      item.frequency,
      item.quantity,
      item.duration_months || 1,
      item.interval_days,
      item.custom_quantities
    )

    totalBottlesRequired += itemBottles
    const product = productMap.get(item.product_id)
    console.log(`  ${product?.name}: ${itemBottles} bottles`)
  }

  console.log(`✓ [CHECK] Total bottles required: ${totalBottlesRequired}`)

  // 6. Get wallet balance and calculate bottle balance
  console.log("💳 [CHECK] Fetching wallet balance...")
  const { data: wallet, error: walletError } = await supabaseAdmin
    .from("wallets")
    .select("balance")
    .eq("user_id", user.id)
    .single()

  const walletBalance = wallet?.balance || 0
  const bottleBalance = Math.floor(walletBalance / bottlePrice)

  console.log(`✓ [CHECK] Wallet: ₹${walletBalance} = ${bottleBalance} bottles`)

  // 7. Check if user has enough bottles
  if (bottleBalance < totalBottlesRequired) {
    const bottlesShort = totalBottlesRequired - bottleBalance
    const amountToRecharge = bottlesShort * bottlePrice

    console.log(`❌ [CHECK] Insufficient bottles: need ${totalBottlesRequired}, have ${bottleBalance}, short by ${bottlesShort}`)

    // Return 200 with success: false so client can handle it gracefully
    return jsonResponse({
      success: false,
      error: "INSUFFICIENT_BOTTLES",
      message: `You need ${bottlesShort} more bottles to subscribe`,
      bottles_required: totalBottlesRequired,
      bottles_available: bottleBalance,
      bottles_short: bottlesShort,
      bottle_price: bottlePrice,
      amount_to_recharge: amountToRecharge,
      wallet_balance: walletBalance,
    }, 200)  // Changed from 400 to 200
  }

  console.log(`✅ [CHECK] Sufficient bottles: ${bottleBalance} >= ${totalBottlesRequired}`)

  // Return success with details
  return jsonResponse({
    success: true,
    bottles_required: totalBottlesRequired,
    bottles_available: bottleBalance,
    bottle_price: bottlePrice,
    cart_items: cartItems.length,
  })
}

// ============================================================================
// ACTION: COMPLETE
// Creates subscriptions after bottle balance has been verified
// NO wallet deduction here - deduction happens during daily order creation
// ============================================================================
async function handleComplete(body: any, user: any, supabaseAdmin: any) {
  console.log("🚀 [COMPLETE] Creating subscriptions for user:", user.id)

  const { address_id_override = null } = body

  // 1. Fetch cart items
  console.log("📦 [COMPLETE] Fetching cart items...")
  const { data: cartItems, error: cartError } = await supabaseAdmin
    .from("cart_items")
    .select("*")
    .eq("user_id", user.id)

  if (cartError || !cartItems || cartItems.length === 0) {
    console.error("❌ [COMPLETE] Cart fetch error or empty cart")
    return jsonResponse({ error: "Cart is empty or inaccessible" }, 400)
  }

  // 2. Fetch product details
  const productIds = cartItems.map((item: any) => item.product_id)
  const { data: products, error: productsError } = await supabaseAdmin
    .from("products")
    .select("id, name, price, is_active")
    .in("id", productIds)

  if (productsError || !products || products.length === 0) {
    return jsonResponse({ error: "Failed to fetch product details" }, 500)
  }

  const productMap = new Map(products.map((p: any) => [p.id, p]))
  const bottlePrice = products[0].price

  // 3. Re-verify bottle balance (to prevent race conditions)
  console.log("🔒 [COMPLETE] Verifying bottle balance...")
  const { data: wallet } = await supabaseAdmin
    .from("wallets")
    .select("balance")
    .eq("user_id", user.id)
    .single()

  const walletBalance = wallet?.balance || 0
  const bottleBalance = Math.floor(walletBalance / bottlePrice)

  // Calculate total bottles required
  let totalBottlesRequired = 0
  for (const item of cartItems) {
    const itemBottles = calculateTotalBottles(
      item.frequency,
      item.quantity,
      item.duration_months || 1,
      item.interval_days,
      item.custom_quantities
    )
    totalBottlesRequired += itemBottles
  }

  if (bottleBalance < totalBottlesRequired) {
    const bottlesShort = totalBottlesRequired - bottleBalance
    return jsonResponse({
      success: false,
      error: "INSUFFICIENT_BOTTLES",
      message: `You need ${bottlesShort} more bottles to subscribe`,
      bottles_required: totalBottlesRequired,
      bottles_available: bottleBalance,
      bottles_short: bottlesShort,
      bottle_price: bottlePrice,
      amount_to_recharge: bottlesShort * bottlePrice,
    }, 400)
  }

  console.log(`✓ [COMPLETE] Bottle balance verified: ${bottleBalance} >= ${totalBottlesRequired}`)

  // 4. Check for duplicates again
  const { data: activeSubs } = await supabaseAdmin
    .from("subscriptions")
    .select("product_id, address_id")
    .eq("user_id", user.id)
    .eq("status", "active")

  for (const item of cartItems) {
    const finalAddressId = item.address_id || address_id_override
    const isDuplicate = activeSubs?.some(
      (sub: any) => sub.product_id === item.product_id && sub.address_id === finalAddressId
    )
    if (isDuplicate) {
      const product = productMap.get(item.product_id)
      return jsonResponse(
        { error: `You already have an active subscription for ${product?.name} at this address.` },
        400
      )
    }
  }

  // 5. Create subscriptions
  console.log("📝 [COMPLETE] Creating subscriptions...")
  const subscriptionsToInsert = []

  for (const item of cartItems) {
    // Apply cutoff logic
    try {
      item.start_date = applyCutoffLogic(item.start_date, item.frequency)
    } catch (error: any) {
      return jsonResponse({ error: error.message }, 400)
    }

    const totalBottles = calculateTotalBottles(
      item.frequency,
      item.quantity,
      item.duration_months || 1,
      item.interval_days,
      item.custom_quantities
    )

    const finalAddressId = item.address_id || address_id_override

    subscriptionsToInsert.push({
      user_id: user.id,
      product_id: item.product_id,
      address_id: finalAddressId,
      start_date: item.start_date,
      frequency: item.frequency,
      status: "active",
      quantity: item.quantity,
      delivery_time: item.preferred_delivery_time || "morning",
      interval_days: item.interval_days,
      custom_quantities: item.custom_quantities,
      duration_months: item.duration_months || 1,
      total_bottles: totalBottles,
      // remaining_bottles not used anymore - we track via wallet balance
      remaining_bottles: totalBottles, // Keep for backwards compatibility
      // No payment fields - payment only happens during bottle purchase
      amount_paid: 0,
      wallet_amount_used: 0,
      razorpay_amount_paid: 0,
      payment_id: null,
    })
  }

  const { data: subscriptions, error: subsError } = await supabaseAdmin
    .from("subscriptions")
    .insert(subscriptionsToInsert)
    .select()

  if (subsError) {
    console.error("❌ [COMPLETE] Subscription creation failed:", subsError)
    return jsonResponse({ error: `Failed to create subscriptions: ${subsError.message}` }, 500)
  }

  console.log(`✓ [COMPLETE] Created ${subscriptions.length} subscriptions`)

  // 6. Clear cart
  const { error: clearError } = await supabaseAdmin
    .from("cart_items")
    .delete()
    .eq("user_id", user.id)

  if (clearError) {
    console.warn("⚠️ [COMPLETE] Failed to clear cart (non-critical):", clearError)
  }

  console.log("✅ [COMPLETE] Checkout completed successfully")

  return jsonResponse({
    success: true,
    subscriptions: subscriptions.map((sub: any) => ({
      id: sub.id,
      product_id: sub.product_id,
      total_bottles: sub.total_bottles,
      start_date: sub.start_date,
      frequency: sub.frequency,
      duration_months: sub.duration_months,
    })),
    total_bottles: totalBottlesRequired,
    bottle_balance: bottleBalance,
  })
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
Deno.serve(async (req) => {
  console.log("🚀 [CHECKOUT] Request received")

  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  try {
    // Authenticate user
    const user = await authenticateUser(req)
    if (!user) {
      console.error("❌ [CHECKOUT] Authentication failed")
      return jsonResponse({ error: "Unauthorized" }, 401)
    }

    console.log("✓ [CHECKOUT] User authenticated:", user.id)

    // Create admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Parse action
    let body: any
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400)
    }

    const { action } = body

    // Route to appropriate handler
    // 'check' replaces 'initiate' - just checks bottle balance
    // 'complete' creates subscriptions (no payment)
    if (action === "check" || action === "initiate") {
      return await handleCheck(body, user, supabaseAdmin)
    } else if (action === "complete") {
      return await handleComplete(body, user, supabaseAdmin)
    } else {
      return jsonResponse({ error: "Invalid action. Use 'check' or 'complete'" }, 400)
    }
  } catch (error: any) {
    console.error("❌ [CHECKOUT] Unexpected error:", error)
    return jsonResponse({
      error: error.message || "Internal server error",
    }, 500)
  }
})
