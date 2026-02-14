// ========================================
// Supabase Edge Function: verify-razorpay-payment
// Verifies Razorpay payment signature and credits wallet
// ========================================

import { createClient } from "npm:@supabase/supabase-js@2"
import Razorpay from "npm:razorpay@2.9.6"
import { validatePaymentVerification } from "npm:razorpay@2.9.6/dist/utils/razorpay-utils.js"

const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const razorpay = new Razorpay({
  key_id: Deno.env.get("RAZORPAY_KEY_ID")!,
  key_secret: RAZORPAY_KEY_SECRET,
})

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null
  return user
}

// ─── Main handler ────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  try {
    // 1. Authenticate
    const user = await authenticateUser(req)
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401)
    }

    // 2. Parse & validate body
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400)
    }

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      body as {
        razorpay_payment_id?: string
        razorpay_order_id?: string
        razorpay_signature?: string
      }

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return jsonResponse(
        {
          error:
            "Missing required fields: razorpay_payment_id, razorpay_order_id, razorpay_signature",
        },
        400,
      )
    }

    // 3. Verify payment signature using Razorpay SDK utility
    let isValid = false
    try {
      isValid = validatePaymentVerification(
        {
          order_id: razorpay_order_id,
          payment_id: razorpay_payment_id,
        },
        razorpay_signature,
        RAZORPAY_KEY_SECRET,
      )
    } catch (err) {
      console.error("Signature verification threw:", err)
      isValid = false
    }

    if (!isValid) {
      console.error(
        `Invalid signature for payment ${razorpay_payment_id}, order ${razorpay_order_id}`,
      )
      return jsonResponse(
        { verified: false, error: "Payment signature verification failed" },
        400,
      )
    }

    // 4. Fetch payment details from Razorpay to get amount & metadata
    const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id)

    // 5. Validate payment status
    if (
      paymentDetails.status !== "captured" &&
      paymentDetails.status !== "authorized"
    ) {
      console.error(
        `Payment ${razorpay_payment_id} status is ${paymentDetails.status}, not captured`,
      )
      return jsonResponse(
        {
          verified: false,
          error: `Payment status is ${paymentDetails.status}`,
        },
        400,
      )
    }

    // 6. Validate the user_id in order notes matches the authenticated user
    const orderUserId = paymentDetails.notes?.user_id
    if (orderUserId && orderUserId !== user.id) {
      console.error(
        `User mismatch: JWT user ${user.id} vs order user ${orderUserId}`,
      )
      return jsonResponse({ verified: false, error: "User mismatch" }, 403)
    }

    const amountInRupees = paymentDetails.amount / 100

    // 7. Credit wallet using service role (bypasses RLS)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Check for duplicate transaction (idempotency)
    const { data: existingTxn } = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("payment_gateway_id", razorpay_payment_id)
      .maybeSingle()

    if (existingTxn) {
      console.log(`Duplicate verification for payment ${razorpay_payment_id}`)
      return jsonResponse({ verified: true, duplicate: true })
    }

    // Get current wallet
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (walletError || !wallet) {
      console.error("Wallet not found for user:", user.id, walletError)
      return jsonResponse({ verified: false, error: "Wallet not found" }, 404)
    }

    const newBalance = Number(wallet.balance) + amountInRupees

    // Update wallet balance
    const { error: updateError } = await supabaseAdmin
      .from("wallets")
      .update({ balance: newBalance })
      .eq("id", wallet.id)

    if (updateError) {
      console.error("Wallet update failed:", updateError)
      throw updateError
    }

    // Create transaction record
    const { error: txnError } = await supabaseAdmin
      .from("transactions")
      .insert({
        transaction_id: `TXN_${razorpay_payment_id}`,
        user_id: user.id,
        wallet_id: wallet.id,
        type: "credit",
        amount: amountInRupees,
        status: "completed",
        description: `Wallet recharge via ${paymentDetails.method || "Razorpay"}`,
        balance_before: wallet.balance,
        balance_after: newBalance,
        payment_method: paymentDetails.method || "razorpay",
        payment_gateway_id: razorpay_payment_id,
        payment_gateway_response: paymentDetails,
      })

    if (txnError) {
      console.error("Transaction insert failed:", txnError)
      throw txnError
    }

    console.log(
      `Payment verified & wallet credited: user=${user.id}, amount=₹${amountInRupees}, payment=${razorpay_payment_id}`,
    )

    return jsonResponse({
      verified: true,
      amount: amountInRupees,
      new_balance: newBalance,
      payment_id: razorpay_payment_id,
    })
  } catch (error) {
    console.error("verify-razorpay-payment error:", error)
    const message =
      error instanceof Error ? error.message : "Internal server error"
    return jsonResponse({ verified: false, error: message }, 500)
  }
})
