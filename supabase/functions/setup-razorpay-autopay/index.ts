// ========================================
// Supabase Edge Function: setup-razorpay-autopay
// Creates a Razorpay subscription for autopay mandate
// Uses Razorpay Node SDK v2.9.6 via npm imports
// ========================================
// Deploy: supabase functions deploy setup-razorpay-autopay --no-verify-jwt --project-ref mrbjduttwiciolhhabpa

import { createClient } from "npm:@supabase/supabase-js@2"
import Razorpay from "npm:razorpay@2.9.6"

// ── Environment ──────────────────────────────────────────────
const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

// ── CORS ─────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

// ── Rate limiting (in-memory, per-instance) ──────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX = 3 // max 3 autopay setups per minute

function isRateLimited(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

// ── Razorpay SDK instance ────────────────────────────────────
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
})

// ── Main handler ─────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  try {
    // ── 1. Authenticate user via JWT ─────────────────────────
    const authHeader = req.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return jsonResponse(
        { error: "Missing or invalid Authorization header" },
        401,
      )
    }

    const token = authHeader.replace("Bearer ", "")
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      console.error("Auth error:", authError?.message)
      return jsonResponse({ error: "Unauthorized" }, 401)
    }

    const userId = user.id

    // ── 2. Rate limit ────────────────────────────────────────
    if (isRateLimited(userId)) {
      return jsonResponse(
        { error: "Too many requests. Please wait a minute." },
        429,
      )
    }

    // ── 3. Parse & validate request body ─────────────────────
    const body = await req.json()
    const { recharge_amount, trigger_amount } = body

    if (!recharge_amount || typeof recharge_amount !== "number") {
      return jsonResponse(
        {
          error: "recharge_amount is required and must be a number (in rupees)",
        },
        400,
      )
    }
    if (!trigger_amount || typeof trigger_amount !== "number") {
      return jsonResponse(
        {
          error: "trigger_amount is required and must be a number (in rupees)",
        },
        400,
      )
    }

    // Validate ranges (in rupees)
    if (recharge_amount < 100 || recharge_amount > 100000) {
      return jsonResponse(
        { error: "recharge_amount must be between ₹100 and ₹1,00,000" },
        400,
      )
    }
    if (trigger_amount < 50 || trigger_amount > 50000) {
      return jsonResponse(
        { error: "trigger_amount must be between ₹50 and ₹50,000" },
        400,
      )
    }
    if (trigger_amount >= recharge_amount) {
      return jsonResponse(
        { error: "trigger_amount must be less than recharge_amount" },
        400,
      )
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ── 4. Check if user already has an active subscription ──
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select(
        "razorpay_customer_id, razorpay_subscription_id, auto_recharge_enabled",
      )
      .eq("user_id", userId)
      .single()

    if (walletError) {
      console.error("Wallet fetch error:", walletError.message)
      return jsonResponse({ error: "Could not fetch wallet" }, 500)
    }

    // If there's an existing active subscription, cancel it first
    if (wallet?.razorpay_subscription_id && wallet?.auto_recharge_enabled) {
      try {
        await razorpay.subscriptions.cancel(wallet.razorpay_subscription_id, {
          cancel_at_cycle_end: false,
        })
        console.log(
          "Cancelled existing subscription:",
          wallet.razorpay_subscription_id,
        )
      } catch (cancelErr) {
        // Log but don't fail – the old subscription might already be cancelled
        console.warn(
          "Could not cancel old subscription:",
          (cancelErr as Error).message,
        )
      }
    }

    // ── 5. Create or reuse Razorpay customer ─────────────────
    let customerId = wallet?.razorpay_customer_id

    if (!customerId) {
      try {
        const customer = await razorpay.customers.create({
          name:
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "Customer",
          email: user.email || "",
          contact: user.phone || user.user_metadata?.phone || "",
          notes: { supabase_user_id: userId },
        })
        customerId = customer.id
        console.log("Created Razorpay customer:", customerId)
      } catch (custErr) {
        console.error("Customer creation error:", custErr)
        return jsonResponse(
          { error: "Failed to create Razorpay customer" },
          500,
        )
      }
    }

    // ── 6. Create a Plan for the recharge amount ─────────────
    // Amount in paise for Razorpay
    const amountInPaise = Math.round(recharge_amount * 100)

    let planId: string
    try {
      const plan = await razorpay.plans.create({
        period: "monthly",
        interval: 1,
        item: {
          name: `Worli Dairy Wallet Auto-Recharge ₹${recharge_amount}`,
          amount: amountInPaise,
          currency: "INR",
          description: `Auto-recharge ₹${recharge_amount} when balance drops below ₹${trigger_amount}`,
        },
        notes: {
          user_id: userId,
          purpose: "wallet_auto_recharge",
          recharge_amount: recharge_amount.toString(),
          trigger_amount: trigger_amount.toString(),
        },
      })
      planId = plan.id
      console.log("Created Razorpay plan:", planId)
    } catch (planErr) {
      console.error("Plan creation error:", planErr)
      return jsonResponse({ error: "Failed to create Razorpay plan" }, 500)
    }

    // ── 7. Create Subscription ───────────────────────────────
    let subscription: Record<string, unknown>
    try {
      subscription = await razorpay.subscriptions.create({
        plan_id: planId,
        customer_id: customerId,
        total_count: 120, // Up to 10 years
        quantity: 1,
        customer_notify: 1,
        notes: {
          user_id: userId,
          purpose: "wallet_auto_recharge",
          recharge_amount: recharge_amount.toString(),
          trigger_amount: trigger_amount.toString(),
        },
      })
      console.log(
        "Created Razorpay subscription:",
        subscription.id,
        "status:",
        subscription.status,
      )
    } catch (subErr) {
      console.error("Subscription creation error:", subErr)
      return jsonResponse(
        { error: "Failed to create Razorpay subscription" },
        500,
      )
    }

    // ── 8. Update wallet with autopay settings ───────────────
    const { error: updateError } = await supabaseAdmin
      .from("wallets")
      .update({
        razorpay_customer_id: customerId,
        razorpay_subscription_id: subscription.id as string,
        auto_recharge_enabled: true,
        auto_recharge_amount: recharge_amount,
        auto_recharge_trigger_amount: trigger_amount,
      })
      .eq("user_id", userId)

    if (updateError) {
      console.error("Wallet update error:", updateError.message)
      // Don't fail – subscription is already created on Razorpay side
      // The user can still use the subscription link
    }

    // ── 9. Return subscription details ───────────────────────
    return jsonResponse({
      success: true,
      subscription_id: subscription.id,
      subscription_status: subscription.status,
      short_url: subscription.short_url,
      customer_id: customerId,
      recharge_amount,
      trigger_amount,
    })
  } catch (error) {
    console.error("AutoPay setup error:", error)
    return jsonResponse(
      { error: "Internal server error", details: (error as Error).message },
      500,
    )
  }
})
