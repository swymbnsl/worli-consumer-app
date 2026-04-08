// ============================================================================
// Supabase Edge Function: wallet-recharge (Bottle Purchase)
// Handles purchasing bottles (wallet recharge in bottle multiples)
// Users buy bottles, amount must be integral multiple of bottle price
// ============================================================================
// Deploy: supabase functions deploy wallet-recharge --no-verify-jwt --project-ref mrbjduttwiciolhhabpa

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

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const rateLimit = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX = 10 // max 10 recharges per minute per user

function isRateLimited(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimit.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimit.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  entry.count++
  return entry.count > RATE_LIMIT_MAX
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

// ============================================================================
// ACTION: INITIATE (Create Razorpay Order for Bottle Purchase)
// Amount must be integral multiple of bottle price
// ============================================================================
async function handleInitiate(body: any, user: any, supabaseAdmin: any) {
  console.log("🚀 [INITIATE] Creating bottle purchase order for user:", user.id)

  // Rate limit check
  if (isRateLimited(user.id)) {
    console.log("⚠️ [INITIATE] Rate limit exceeded for user:", user.id)
    return jsonResponse({ error: "Too many requests. Please wait a moment." }, 429)
  }

  // Support both 'bottles' and 'amount' parameters
  // If 'bottles' is provided, calculate amount from bottles * bottle_price
  // If 'amount' is provided, validate it's a multiple of bottle_price
  let { bottles, amount, min_bottles_required } = body

  // 1. Fetch bottle price from products table
  console.log("🍼 [INITIATE] Fetching bottle price...")
  let bottlePrice = 30 // Default fallback
  try {
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("price")
      .eq("is_active", true)
      .limit(1)
      .single()

    if (product && product.price) {
      bottlePrice = Number(product.price)
    }
  } catch (e) {
    console.log("⚠️ [INITIATE] Could not fetch bottle price, using default ₹30")
  }

  console.log(`✓ [INITIATE] Bottle price: ₹${bottlePrice}`)

  // 2. Calculate amount based on bottles or validate amount is multiple
  if (bottles !== undefined) {
    // User specified bottles to purchase
    bottles = Number(bottles)
    if (!bottles || !Number.isInteger(bottles) || bottles <= 0) {
      console.error(`❌ [INITIATE] Invalid bottles count: ${body.bottles}`)
      return jsonResponse({ error: "bottles must be a positive integer" }, 400)
    }
    amount = bottles * bottlePrice
    console.log(`🍼 [INITIATE] Purchasing ${bottles} bottles = ₹${amount}`)
  } else if (amount !== undefined) {
    // User specified amount - validate it's a multiple of bottle price
    amount = Number(amount)
    if (!amount || typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      console.error(`❌ [INITIATE] Invalid amount: ${body.amount}`)
      return jsonResponse({ error: "amount must be a valid positive number" }, 400)
    }

    // Check if amount is integral multiple of bottle price
    if (amount % bottlePrice !== 0) {
      const suggestedBottles = Math.ceil(amount / bottlePrice)
      const suggestedAmount = suggestedBottles * bottlePrice
      return jsonResponse({
        error: `Amount must be a multiple of ₹${bottlePrice} (bottle price)`,
        bottle_price: bottlePrice,
        suggested_bottles: suggestedBottles,
        suggested_amount: suggestedAmount,
      }, 400)
    }

    bottles = amount / bottlePrice
    console.log(`💰 [INITIATE] Amount ₹${amount} = ${bottles} bottles`)
  } else {
    return jsonResponse({ error: "Either 'bottles' or 'amount' is required" }, 400)
  }

  // 3. Fetch minimum bottles for recharge from app_settings
  let minBottles = 10 // Default minimum bottles
  try {
    const { data: settingData } = await supabaseAdmin
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "min_bottles_recharge")
      .single()

    if (settingData && settingData.setting_value) {
      const parsed = parseInt(settingData.setting_value, 10)
      if (!isNaN(parsed) && parsed > 0) {
        minBottles = parsed
      }
    }
  } catch (e) {
    console.log("⚠️ [INITIATE] Could not fetch min_bottles_recharge, using default 10")
  }

  // If min_bottles_required is passed (during checkout shortfall), use that as minimum
  if (min_bottles_required && Number(min_bottles_required) > 0) {
    const requiredMin = Number(min_bottles_required)
    // Ensure user buys at least the required minimum
    if (bottles < requiredMin) {
      return jsonResponse({
        error: `You need at least ${requiredMin} bottles to proceed`,
        min_bottles_required: requiredMin,
        min_amount_required: requiredMin * bottlePrice,
      }, 400)
    }
    // For checkout shortfall, we allow buying exactly what's needed
    console.log(`✓ [INITIATE] Checkout shortfall mode: minimum ${requiredMin} bottles`)
  } else {
    // Regular recharge - enforce minimum bottles
    if (bottles < minBottles) {
      return jsonResponse({
        error: `Minimum purchase is ${minBottles} bottles (₹${minBottles * bottlePrice})`,
        min_bottles: minBottles,
        min_amount: minBottles * bottlePrice,
        bottle_price: bottlePrice,
      }, 400)
    }
  }

  // 4. Validate maximum amount
  const maxAmount = 50000
  const maxBottles = Math.floor(maxAmount / bottlePrice)
  if (amount > maxAmount) {
    return jsonResponse({
      error: `Maximum purchase is ${maxBottles} bottles (₹${maxAmount})`,
      max_bottles: maxBottles,
      max_amount: maxAmount,
    }, 400)
  }

  console.log("✓ [INITIATE] Validation passed")

  // 5. Create Razorpay order
  console.log("🏦 [INITIATE] Creating Razorpay order...")
  try {
    const amountInPaise = Math.round(amount * 100)
    const timestamp = Date.now().toString().slice(-10)
    const userIdPrefix = user.id.slice(0, 8)
    const receipt = `bp_${userIdPrefix}_${timestamp}` // bp = bottle purchase

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        user_id: user.id,
        purpose: "bottle_purchase",
        bottles: bottles.toString(),
        bottle_price: bottlePrice.toString(),
        user_email: user.email || "",
      },
    })

    console.log(`✅ [INITIATE] Razorpay order created: ${order.id} for ${bottles} bottles`)

    return jsonResponse({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: RAZORPAY_KEY_ID,
      bottles: bottles,
      bottle_price: bottlePrice,
      amount_rupees: amount,
    })
  } catch (error: any) {
    console.error("❌ [INITIATE] Razorpay order creation failed:", error)
    return jsonResponse({ error: "Failed to create payment order" }, 500)
  }
}

// ============================================================================
// ACTION: VERIFY (Verify Payment and Credit Wallet with Bottles)
// ============================================================================
async function handleVerify(body: any, user: any, supabaseAdmin: any) {
  console.log("🚀 [VERIFY] Verifying bottle purchase for user:", user.id)

  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    console.error(`❌ [VERIFY] Missing fields. Keys present:`, Object.keys(body || {}))
    return jsonResponse({
      error: "Missing required fields: razorpay_payment_id, razorpay_order_id, razorpay_signature",
    }, 400)
  }

  // 1. Verify payment signature
  console.log("🔐 [VERIFY] Verifying payment signature...")
  let isValid = false
  try {
    isValid = validatePaymentVerification(
      {
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
      },
      razorpay_signature,
      RAZORPAY_KEY_SECRET
    )
  } catch (err) {
    console.error("❌ [VERIFY] Signature verification threw:", err)
    isValid = false
  }

  if (!isValid) {
    console.error("❌ [VERIFY] Invalid signature")
    return jsonResponse({
      verified: false,
      error: "Payment signature verification failed",
    }, 400)
  }

  console.log("✓ [VERIFY] Signature verified")

  // 2. Fetch payment details from Razorpay
  console.log("📥 [VERIFY] Fetching payment details from Razorpay...")
  let paymentDetails: any
  try {
    paymentDetails = await razorpay.payments.fetch(razorpay_payment_id)
  } catch (error: any) {
    console.error("❌ [VERIFY] Failed to fetch payment details:", error)
    return jsonResponse({ verified: false, error: "Failed to verify payment" }, 500)
  }

  // 3. Validate payment status
  if (paymentDetails.status !== "captured" && paymentDetails.status !== "authorized") {
    console.error(`❌ [VERIFY] Payment status is ${paymentDetails.status}`)
    return jsonResponse({
      verified: false,
      error: `Payment status is ${paymentDetails.status}`,
    }, 400)
  }

  console.log("✓ [VERIFY] Payment status is valid")

  // 4. Validate user_id matches
  const orderUserId = paymentDetails.notes?.user_id
  if (orderUserId && orderUserId !== user.id) {
    console.error(`❌ [VERIFY] User mismatch: JWT user ${user.id} vs order user ${orderUserId}`)
    return jsonResponse({ verified: false, error: "User mismatch" }, 403)
  }

  const amountInRupees = paymentDetails.amount / 100
  
  // Calculate bottles from payment notes or from amount
  let bottlePrice = 30
  let bottlesPurchased = 0
  
  if (paymentDetails.notes?.bottle_price) {
    bottlePrice = Number(paymentDetails.notes.bottle_price)
  } else {
    // Fetch from products table as fallback
    try {
      const { data: product } = await supabaseAdmin
        .from("products")
        .select("price")
        .eq("is_active", true)
        .limit(1)
        .single()
      if (product && product.price) {
        bottlePrice = Number(product.price)
      }
    } catch (e) {
      console.log("⚠️ [VERIFY] Using default bottle price ₹30")
    }
  }
  
  if (paymentDetails.notes?.bottles) {
    bottlesPurchased = Number(paymentDetails.notes.bottles)
  } else {
    bottlesPurchased = Math.floor(amountInRupees / bottlePrice)
  }
  
  console.log(`💰 [VERIFY] Payment: ₹${amountInRupees} = ${bottlesPurchased} bottles`)

  // 5. Check for duplicate transaction (idempotency)
  console.log("🔍 [VERIFY] Checking for duplicate transaction...")
  const { data: existingTxn } = await supabaseAdmin
    .from("transactions")
    .select("id")
    .eq("payment_gateway_id", razorpay_payment_id)
    .maybeSingle()

  if (existingTxn) {
    console.log("⚠️ [VERIFY] Duplicate verification detected (already processed)")
    
    // Retry-safe referral payout
    const { data: referralData, error: referralError } = await supabaseAdmin.rpc(
      "payout_referral_on_recharge",
      {
        p_referee_id: user.id,
        p_recharge_payment_id: razorpay_payment_id,
        p_recharge_amount: amountInRupees,
      }
    )

    if (referralError) {
      console.error("⚠️ [VERIFY] Referral payout retry failed:", referralError)
    }

    // Get current wallet balance
    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single()

    const currentBalance = wallet?.balance || 0
    const currentBottles = Math.floor(currentBalance / bottlePrice)

    return jsonResponse({
      verified: true,
      duplicate: true,
      amount: amountInRupees,
      bottles_purchased: bottlesPurchased,
      bottle_price: bottlePrice,
      new_balance: currentBalance,
      new_bottle_balance: currentBottles,
      payment_id: razorpay_payment_id,
      referral: referralData ?? null,
    })
  }

  // 6. Get current wallet
  console.log("💳 [VERIFY] Fetching wallet...")
  let { data: wallet, error: walletError } = await supabaseAdmin
    .from("wallets")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (walletError) {
    console.error("❌ [VERIFY] Wallet fetch error:", walletError)
    return jsonResponse({ verified: false, error: "Failed to fetch wallet" }, 500)
  }

  // Auto-create wallet if missing
  if (!wallet) {
    console.log("⚠️ [VERIFY] Wallet not found. Creating one...")
    const { data: newWallet, error: createError } = await supabaseAdmin
      .from("wallets")
      .insert({
        user_id: user.id,
        balance: 0,
        low_balance_threshold: 100,
        auto_recharge_enabled: false,
      })
      .select()
      .single()
      
    if (createError || !newWallet) {
      console.error("❌ [VERIFY] Failed to create wallet:", createError)
      return jsonResponse({ verified: false, error: "Failed to create wallet" }, 500)
    }
    wallet = newWallet
  }

  const newBalance = Number(wallet.balance) + amountInRupees
  const newBottleBalance = Math.floor(newBalance / bottlePrice)

  // 7. Update wallet balance
  console.log(`💰 [VERIFY] Updating wallet: ₹${wallet.balance} → ₹${newBalance} (+${bottlesPurchased} bottles)`)
  const { error: updateError } = await supabaseAdmin
    .from("wallets")
    .update({ balance: newBalance })
    .eq("id", wallet.id)

  if (updateError) {
    console.error("❌ [VERIFY] Wallet update failed:", updateError)
    return jsonResponse({ verified: false, error: "Failed to update wallet" }, 500)
  }

  // 8. Create transaction record
  console.log("📝 [VERIFY] Creating transaction record...")
  const { error: txnError } = await supabaseAdmin
    .from("transactions")
    .insert({
      transaction_id: `TXN_${razorpay_payment_id}`,
      user_id: user.id,
      wallet_id: wallet.id,
      type: "credit",
      amount: amountInRupees,
      status: "completed",
      description: `Purchased ${bottlesPurchased} bottles`,
      balance_before: wallet.balance,
      balance_after: newBalance,
      payment_method: paymentDetails.method || "razorpay",
      payment_gateway_id: razorpay_payment_id,
      payment_gateway_response: paymentDetails,
    })

  if (txnError) {
    console.error("❌ [VERIFY] Transaction insert failed:", txnError)
    return jsonResponse({ verified: false, error: "Failed to create transaction" }, 500)
  }

  // 9. Trigger referral reward payout
  console.log("🎁 [VERIFY] Checking referral rewards...")
  const { data: referralData, error: referralError } = await supabaseAdmin.rpc(
    "payout_referral_on_recharge",
    {
      p_referee_id: user.id,
      p_recharge_payment_id: razorpay_payment_id,
      p_recharge_amount: amountInRupees,
    }
  )

  if (referralError) {
    console.error("⚠️ [VERIFY] Referral payout failed (non-critical):", referralError)
  }

  console.log(`✅ [VERIFY] Bottle purchase completed: ${bottlesPurchased} bottles added`)

  return jsonResponse({
    verified: true,
    amount: amountInRupees,
    bottles_purchased: bottlesPurchased,
    bottle_price: bottlePrice,
    new_balance: newBalance,
    new_bottle_balance: newBottleBalance,
    payment_id: razorpay_payment_id,
    referral: referralData ?? null,
  })
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
Deno.serve(async (req) => {
  console.log("🚀 [WALLET-RECHARGE] Request received")

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
      console.error("❌ [WALLET-RECHARGE] Authentication failed")
      return jsonResponse({ error: "Unauthorized" }, 401)
    }

    console.log("✓ [WALLET-RECHARGE] User authenticated:", user.id)

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
    } else if (action === "verify") {
      return await handleVerify(body, user, supabaseAdmin)
    } else {
      return jsonResponse({ error: "Invalid action. Use 'initiate' or 'verify'" }, 400)
    }
  } catch (error: any) {
    console.error("❌ [WALLET-RECHARGE] Unexpected error:", error)
    return jsonResponse({
      error: error.message || "Internal server error",
    }, 500)
  }
})
