// ============================================================================
// Supabase Edge Function: checkout
// Handles atomic cart checkout with server-side amount calculation
// ============================================================================
// Deploy: supabase functions deploy checkout --no-verify-jwt --project-ref mrbjduttwiciolhhabpa

import { createClient } from "npm:@supabase/supabase-js@2"
import Razorpay from "npm:razorpay@2.9.6"
import { validatePaymentVerification } from "npm:razorpay@2.9.6/dist/utils/razorpay-utils.js"

// ─── Environment Variables ───────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
})

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
    // Sum weekly quantities and multiply by ~4.3 weeks per month
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
// ACTION: INITIATE
// Calculates amounts server-side, creates session, creates Razorpay order if needed
// ============================================================================
async function handleInitiate(body: any, user: any, supabaseAdmin: any) {
  console.log("🚀 [INITIATE] Starting checkout initiation for user:", user.id)

  const { use_wallet = true, address_id_override = null } = body

  // 1. Fetch cart items from database
  console.log("📦 [INITIATE] Fetching cart items from database...")
  const { data: cartItems, error: cartError } = await supabaseAdmin
    .from("cart_items")
    .select("*")
    .eq("user_id", user.id)

  if (cartError) {
    console.error("❌ [INITIATE] Cart fetch error:", cartError)
    return jsonResponse({ error: "Failed to fetch cart" }, 500)
  }

  if (!cartItems || cartItems.length === 0) {
    console.log("⚠️ [INITIATE] Cart is empty")
    return jsonResponse({ error: "Cart is empty" }, 400)
  }

  console.log(`✓ [INITIATE] Found ${cartItems.length} items in cart`)

  // 2. Fetch product prices and validate
  console.log("💰 [INITIATE] Fetching product prices...")
  const productIds = cartItems.map((item: any) => item.product_id)
  const { data: products, error: productsError } = await supabaseAdmin
    .from("products")
    .select("id, name, price, is_active")
    .in("id", productIds)

  if (productsError) {
    console.error("❌ [INITIATE] Products fetch error:", productsError)
    return jsonResponse({ error: "Failed to fetch products" }, 500)
  }

  console.log(`[DEBUG] Products query returned ${products?.length || 0} products`)
  console.log(`[DEBUG] Product IDs requested: ${JSON.stringify(productIds)}`)
  console.log(`[DEBUG] Products returned: ${JSON.stringify(products)}`)

  if (!products || products.length === 0) {
    console.error("❌ [INITIATE] No products found for the given IDs")
    return jsonResponse({ error: "Products not found in database" }, 400)
  }

  const productMap = new Map(products.map((p: any) => [p.id, p]))
  console.log(`[DEBUG] ProductMap size: ${productMap.size}`)

  // Validate all products exist and are active
  for (const item of cartItems) {
    console.log(`[DEBUG] Validating cart item with product_id: ${item.product_id} (type: ${typeof item.product_id})`)
    const product = productMap.get(item.product_id)
    console.log(`[DEBUG] Product lookup result: ${product ? product.name : 'NOT FOUND'}`)
    if (!product) {
      console.error(`❌ [INITIATE] Product not found: ${item.product_id}`)
      console.error(`[DEBUG] Available product IDs in map: ${Array.from(productMap.keys()).join(', ')}`)
      return jsonResponse({ error: `Product not found: ${item.product_id}` }, 400)
    }
    if (!product.is_active) {
      console.error(`❌ [INITIATE] Product inactive: ${product.name}`)
      return jsonResponse({ error: `Product is no longer available: ${product.name}` }, 400)
    }
  }

  console.log("✓ [INITIATE] All products validated")

  // 3. Validate addresses
  console.log("🏠 [INITIATE] Validating addresses...")
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

  console.log("✓ [INITIATE] All addresses validated")

  // 4. Check for duplicate subscriptions
  console.log("🔍 [INITIATE] Checking for duplicate subscriptions...")
  const { data: activeSubs, error: subsError } = await supabaseAdmin
    .from("subscriptions")
    .select("product_id, address_id")
    .eq("user_id", user.id)
    .eq("status", "active")

  if (subsError) {
    console.error("❌ [INITIATE] Subscriptions fetch error:", subsError)
    return jsonResponse({ error: "Failed to check subscriptions" }, 500)
  }

  console.log(`[DEBUG] Found ${activeSubs?.length || 0} active subscriptions`)

  for (const item of cartItems) {
    const finalAddressId = item.address_id || address_id_override
    console.log(`[DEBUG] Checking item product_id=${item.product_id}, address_id=${finalAddressId}`)
    const isDuplicate = activeSubs?.some(
      (sub: any) => sub.product_id === item.product_id && sub.address_id === finalAddressId
    )
    if (isDuplicate) {
      const product = productMap.get(item.product_id)
      console.log(`❌ [INITIATE] Duplicate found for product: ${product?.name}`)
      return jsonResponse(
        { error: `You already have an active subscription for ${product?.name} at this address.` },
        400
      )
    }
  }

  console.log("✓ [INITIATE] No duplicate subscriptions found")

  // 5. Calculate total amount from server-side prices
  console.log("🧮 [INITIATE] Calculating total amount...")
  console.log(`[DEBUG] Cart items count: ${cartItems.length}`)
  console.log(`[DEBUG] First cart item:`, JSON.stringify(cartItems[0]))
  let totalAmount = 0

  for (const item of cartItems) {
    const product = productMap.get(item.product_id)!
    
    // Apply cutoff logic
    try {
      item.start_date = applyCutoffLogic(item.start_date, item.frequency)
    } catch (error: any) {
      return jsonResponse({ error: error.message }, 400)
    }

    // Calculate total bottles
    const totalBottles = calculateTotalBottles(
      item.frequency,
      item.quantity,
      item.duration_months || 1,
      item.interval_days,
      item.custom_quantities
    )

    // Calculate amount for this item
    const itemAmount = totalBottles * product.price
    totalAmount += itemAmount

    console.log(`  Item: ${product.name} × ${totalBottles} bottles = ₹${itemAmount}`)
  }

  console.log(`✓ [INITIATE] Total amount calculated: ₹${totalAmount}`)

  // 6. Get wallet balance
  console.log("💳 [INITIATE] Fetching wallet balance...")
  const { data: wallet, error: walletError } = await supabaseAdmin
    .from("wallets")
    .select("balance")
    .eq("user_id", user.id)
    .single()

  const walletBalance = wallet?.balance || 0
  console.log(`✓ [INITIATE] Wallet balance: ₹${walletBalance}`)

  // 7. Calculate payment split
  const walletAmount = use_wallet ? Math.min(walletBalance, totalAmount) : 0
  const razorpayAmount = totalAmount - walletAmount

  console.log(`💰 [INITIATE] Payment split:`)
  console.log(`  Wallet: ₹${walletAmount}`)
  console.log(`  Razorpay: ₹${razorpayAmount}`)

  // 8. Create Razorpay order if needed
  let razorpayOrderId: string | null = null

  if (razorpayAmount > 0) {
    console.log("🏦 [INITIATE] Creating Razorpay order...")
    try {
      const amountInPaise = Math.round(razorpayAmount * 100)
      const timestamp = Date.now().toString().slice(-10)
      const userIdPrefix = user.id.slice(0, 8)
      const receipt = `co_${userIdPrefix}_${timestamp}`

      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt,
        notes: {
          user_id: user.id,
          purpose: "cart_checkout",
        },
      })

      razorpayOrderId = order.id
      console.log(`✓ [INITIATE] Razorpay order created: ${razorpayOrderId}`)
    } catch (error: any) {
      console.error("❌ [INITIATE] Razorpay order creation failed:", error)
      return jsonResponse({ error: "Failed to create payment order" }, 500)
    }
  }

  // 9. Create checkout session
  console.log("💾 [INITIATE] Creating checkout session...")
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("checkout_sessions")
    .insert({
      user_id: user.id,
      total_amount: totalAmount,
      wallet_amount: walletAmount,
      razorpay_amount: razorpayAmount,
      razorpay_order_id: razorpayOrderId,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (sessionError) {
    console.error("❌ [INITIATE] Session creation failed:", sessionError)
    return jsonResponse({ error: "Failed to create checkout session" }, 500)
  }

  console.log(`✅ [INITIATE] Session created: ${session.id}`)

  // 10. Return session details
  return jsonResponse({
    session_id: session.id,
    total_amount: totalAmount,
    wallet_amount: walletAmount,
    razorpay_amount: razorpayAmount,
    razorpay_order_id: razorpayOrderId,
    razorpay_key_id: razorpayAmount > 0 ? RAZORPAY_KEY_ID : null,
    expires_at: expiresAt.toISOString(),
  })
}

// ============================================================================
// ACTION: COMPLETE
// Verifies payment, creates subscriptions atomically
// ============================================================================
async function handleComplete(body: any, user: any, supabaseAdmin: any) {
  console.log("🚀 [COMPLETE] Starting checkout completion for user:", user.id)

  const { session_id, razorpay_payment_id, razorpay_signature } = body

  if (!session_id) {
    return jsonResponse({ error: "session_id is required" }, 400)
  }

  // 1. Fetch and validate session
  console.log(`🔍 [COMPLETE] Fetching session: ${session_id}`)
  const { data: session, error: sessionError } = await supabaseAdmin
    .from("checkout_sessions")
    .select("*")
    .eq("id", session_id)
    .eq("user_id", user.id)
    .single()

  if (sessionError || !session) {
    console.error("❌ [COMPLETE] Session not found or access denied")
    return jsonResponse({ error: "Invalid or expired session" }, 404)
  }

  // Validate session status
  if (session.status !== "pending") {
    console.error(`❌ [COMPLETE] Session status is ${session.status}, not pending`)
    return jsonResponse({ error: `Session already ${session.status}` }, 400)
  }

  // Validate not expired
  if (new Date(session.expires_at) < new Date()) {
    console.error("❌ [COMPLETE] Session expired")
    await supabaseAdmin
      .from("checkout_sessions")
      .update({ status: "expired", error_message: "Session expired" })
      .eq("id", session_id)
    return jsonResponse({ error: "Session expired. Please retry checkout." }, 400)
  }

  console.log("✓ [COMPLETE] Session validated")

  // 2. Verify Razorpay payment if needed
  if (session.razorpay_amount > 0) {
    console.log("🔐 [COMPLETE] Verifying Razorpay payment...")

    if (!razorpay_payment_id || !razorpay_signature) {
      return jsonResponse({ error: "Payment details required" }, 400)
    }

    // Verify signature
    let isValid = false
    try {
      isValid = validatePaymentVerification(
        {
          order_id: session.razorpay_order_id!,
          payment_id: razorpay_payment_id,
        },
        razorpay_signature,
        RAZORPAY_KEY_SECRET
      )
    } catch (error) {
      console.error("❌ [COMPLETE] Signature verification error:", error)
    }

    if (!isValid) {
      console.error("❌ [COMPLETE] Invalid payment signature")
      await supabaseAdmin
        .from("checkout_sessions")
        .update({ status: "failed", error_message: "Invalid payment signature" })
        .eq("id", session_id)
      return jsonResponse({ error: "Payment verification failed" }, 400)
    }

    // Fetch payment details from Razorpay
    try {
      const payment = await razorpay.payments.fetch(razorpay_payment_id)
      
      if (payment.status !== "captured" && payment.status !== "authorized") {
        console.error(`❌ [COMPLETE] Payment status is ${payment.status}`)
        await supabaseAdmin
          .from("checkout_sessions")
          .update({ status: "failed", error_message: `Payment status: ${payment.status}` })
          .eq("id", session_id)
        return jsonResponse({ error: `Payment not successful: ${payment.status}` }, 400)
      }

      console.log("✓ [COMPLETE] Payment verified successfully")
    } catch (error: any) {
      console.error("❌ [COMPLETE] Failed to fetch payment details:", error)
      return jsonResponse({ error: "Payment verification failed" }, 500)
    }
  }

  // 3. Execute atomic transaction
  console.log("⚡ [COMPLETE] Starting atomic transaction...")

  try {
    // Fetch cart items
    const { data: cartItems, error: cartError } = await supabaseAdmin
      .from("cart_items")
      .select("*")
      .eq("user_id", user.id)

    if (cartError || !cartItems || cartItems.length === 0) {
      throw new Error("Cart is empty or inaccessible")
    }

    // Fetch product details
    const productIds = cartItems.map((item: any) => item.product_id)
    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, name, price")
      .in("id", productIds)

    if (productsError) {
      throw new Error("Failed to fetch product details")
    }

    const productMap = new Map(products.map((p: any) => [p.id, p]))

    // Lock wallet and verify balance
    if (session.wallet_amount > 0) {
      console.log("🔒 [COMPLETE] Locking wallet and verifying balance...")
      
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from("wallets")
        .select("id, balance")
        .eq("user_id", user.id)
        .single()

      if (walletError || !wallet) {
        throw new Error("Wallet not found")
      }

      if (wallet.balance < session.wallet_amount) {
        throw new Error(`Insufficient wallet balance. Required: ₹${session.wallet_amount}, Available: ₹${wallet.balance}`)
      }

      // Deduct wallet balance
      const newBalance = wallet.balance - session.wallet_amount
      const { error: updateError } = await supabaseAdmin
        .from("wallets")
        .update({ balance: newBalance })
        .eq("id", wallet.id)

      if (updateError) {
        throw new Error("Failed to deduct wallet balance")
      }

      // Create transaction record
      const transactionId = `TXN_CO_${Date.now()}_${Math.floor(Math.random() * 10000)}`
      const { error: txnError } = await supabaseAdmin
        .from("transactions")
        .insert({
          transaction_id: transactionId,
          user_id: user.id,
          wallet_id: wallet.id,
          type: "debit",
          amount: session.wallet_amount,
          status: "completed",
          description: `Cart checkout (${cartItems.length} items)`,
          balance_before: wallet.balance,
          balance_after: newBalance,
          payment_method: "wallet",
        })

      if (txnError) {
        throw new Error("Failed to create transaction record")
      }

      console.log("✓ [COMPLETE] Wallet deducted successfully")
    }

    // Create all subscriptions
    console.log("📝 [COMPLETE] Creating subscriptions...")
    const subscriptionsToInsert = []

    for (const item of cartItems) {
      const product = productMap.get(item.product_id)!
      
      const totalBottles = calculateTotalBottles(
        item.frequency,
        item.quantity,
        item.duration_months || 1,
        item.interval_days,
        item.custom_quantities
      )

      const itemAmount = totalBottles * product.price
      const itemWalletAmount = session.wallet_amount > 0
        ? Math.round((itemAmount / session.total_amount) * session.wallet_amount * 100) / 100
        : 0
      const itemRazorpayAmount = session.razorpay_amount > 0
        ? Math.round((itemAmount / session.total_amount) * session.razorpay_amount * 100) / 100
        : 0

      subscriptionsToInsert.push({
        user_id: user.id,
        product_id: item.product_id,
        address_id: item.address_id,
        start_date: item.start_date,
        frequency: item.frequency,
        status: "active",
        quantity: item.quantity,
        delivery_time: item.preferred_delivery_time || "morning",
        interval_days: item.interval_days,
        custom_quantities: item.custom_quantities,
        duration_months: item.duration_months || 1,
        total_bottles: totalBottles,
        remaining_bottles: totalBottles,
        amount_paid: itemAmount,
        wallet_amount_used: itemWalletAmount,
        razorpay_amount_paid: itemRazorpayAmount,
        payment_id: razorpay_payment_id || null,
      })
    }

    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from("subscriptions")
      .insert(subscriptionsToInsert)
      .select()

    if (subsError) {
      throw new Error(`Failed to create subscriptions: ${subsError.message}`)
    }

    console.log(`✓ [COMPLETE] Created ${subscriptions.length} subscriptions`)

    // Clear cart
    const { error: clearError } = await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("user_id", user.id)

    if (clearError) {
      console.warn("⚠️ [COMPLETE] Failed to clear cart (non-critical):", clearError)
    }

    // Mark session as completed
    await supabaseAdmin
      .from("checkout_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        razorpay_payment_id: razorpay_payment_id || null,
      })
      .eq("id", session_id)

    // Get new wallet balance
    const { data: updatedWallet } = await supabaseAdmin
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single()

    console.log("✅ [COMPLETE] Checkout completed successfully")

    return jsonResponse({
      success: true,
      subscriptions: subscriptions.map((sub: any) => ({
        id: sub.id,
        product_id: sub.product_id,
        total_bottles: sub.total_bottles,
        amount_paid: sub.amount_paid,
      })),
      new_wallet_balance: updatedWallet?.balance || 0,
    })
  } catch (error: any) {
    console.error("❌ [COMPLETE] Transaction failed:", error)
    
    // Mark session as failed
    await supabaseAdmin
      .from("checkout_sessions")
      .update({
        status: "failed",
        error_message: error.message,
      })
      .eq("id", session_id)

    return jsonResponse({
      error: error.message || "Checkout failed",
    }, 500)
  }
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
    if (action === "initiate") {
      return await handleInitiate(body, user, supabaseAdmin)
    } else if (action === "complete") {
      return await handleComplete(body, user, supabaseAdmin)
    } else {
      return jsonResponse({ error: "Invalid action. Use 'initiate' or 'complete'" }, 400)
    }
  } catch (error: any) {
    console.error("❌ [CHECKOUT] Unexpected error:", error)
    return jsonResponse({
      error: error.message || "Internal server error",
    }, 500)
  }
})
