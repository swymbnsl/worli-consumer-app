// ========================================
// Supabase Edge Function: create-razorpay-order
// Creates a Razorpay order for wallet recharge
// ========================================

import { createClient } from "npm:@supabase/supabase-js@2"
import Razorpay from "npm:razorpay@2.9.6"

const razorpay = new Razorpay({
  key_id: Deno.env.get("RAZORPAY_KEY_ID")!,
  key_secret: Deno.env.get("RAZORPAY_KEY_SECRET")!,
})

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

// ─── Simple in-memory rate limiter ───────────────────────────────────────────
const rateLimit = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX = 10 // max 10 orders per minute per user

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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

// ─── Authenticate user from JWT ──────────────────────────────────────────────
async function authenticateUser(req: Request) {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return null

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null
  return user
}

// ─── Main handler ────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  console.log("🚀 [START] create-razorpay-order request received")

  if (req.method === "OPTIONS") {
    console.log("✓ OPTIONS preflight request")
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    console.log("✗ Method not POST:", req.method)
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  try {
    // 1. Authenticate
    console.log("🔐 Step 1: Authenticating user...")
    const user = await authenticateUser(req)
    if (!user) {
      console.log("✗ Authentication failed")
      return jsonResponse({ error: "Unauthorized. Please log in." }, 401)
    }
    console.log("✓ User authenticated:", user.id)

    // 2. Rate limit
    console.log("⏱️  Step 2: Checking rate limit...")
    if (isRateLimited(user.id)) {
      console.log("✗ Rate limit exceeded for user:", user.id)
      return jsonResponse(
        { error: "Too many requests. Please wait a moment." },
        429,
      )
    }
    console.log("✓ Rate limit OK")

    // 3. Parse & validate request body
    console.log("📝 Step 3: Parsing request body...")
    let body: Record<string, unknown>
    try {
      body = await req.json()
      console.log("✓ Body parsed:", JSON.stringify(body))
    } catch (e) {
      console.log("✗ JSON parse error:", e)
      return jsonResponse({ error: "Invalid JSON body" }, 400)
    }

    const { amount } = body as { amount?: number }
    console.log("💰 Received amount:", amount, "| Type:", typeof amount)

    if (amount === undefined || amount === null) {
      console.log("✗ Amount is missing")
      return jsonResponse({ error: "amount is required" }, 400)
    }

    if (typeof amount !== "number" || !Number.isFinite(amount)) {
      console.log("✗ Amount is not a valid number")
      return jsonResponse({ error: "amount must be a valid number" }, 400)
    }

    // Amount is in rupees from the client
    const amountInRupees = amount
    console.log("✓ Amount in rupees:", amountInRupees)

    if (amountInRupees < 100) {
      console.log("✗ Amount below minimum:", amountInRupees)
      return jsonResponse({ error: "Minimum recharge amount is ₹100" }, 400)
    }

    if (amountInRupees > 50000) {
      console.log("✗ Amount exceeds maximum:", amountInRupees)
      return jsonResponse({ error: "Maximum recharge amount is ₹50,000" }, 400)
    }
    console.log("✓ Amount validation passed")

    // 4. Create Razorpay order using SDK
    console.log("🏦 Step 4: Creating Razorpay order...")
    const amountInPaise = Math.round(amountInRupees * 100)
    console.log("💵 Amount in paise:", amountInPaise)

    // Receipt must be max 40 chars - use short timestamp + user ID prefix
    const timestamp = Date.now().toString().slice(-10) // Last 10 digits
    const userIdPrefix = user.id.slice(0, 8) // First 8 chars of UUID
    const receipt = `wr_${userIdPrefix}_${timestamp}` // Format: wr_<8chars>_<10digits> = 22 chars
    console.log("🧾 Receipt:", receipt, "| Length:", receipt.length)

    const orderPayload = {
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        user_id: user.id,
        purpose: "wallet_recharge",
        user_email: user.email || "",
      },
    }
    console.log("📤 Razorpay order payload:", JSON.stringify(orderPayload))

    const order = await razorpay.orders.create(orderPayload)
    console.log("✓ Razorpay order created:", order.id)

    // 5. Return order details
    const response = {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: Deno.env.get("RAZORPAY_KEY_ID"),
    }
    console.log("✅ [SUCCESS] Returning response:", JSON.stringify(response))
    return jsonResponse(response)
  } catch (error) {
    console.error("❌ [ERROR] create-razorpay-order error:", error)
    console.error("Error type:", error?.constructor?.name)
    console.error(
      "Error message:",
      error instanceof Error ? error.message : String(error),
    )
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    )

    const message =
      error instanceof Error ? error.message : "Internal server error"

    return jsonResponse({ error: message }, 500)
  }
})
