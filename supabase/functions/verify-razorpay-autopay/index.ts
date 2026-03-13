// ========================================
// Supabase Edge Function: verify-razorpay-autopay
// Verifies Razorpay subscription signature and enables autopay
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

// ─── Helpers ───────────────────────────────────────────────────────────────
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

// ─── Main handler ──────────────────────────────────────────────────────────
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

    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } =
      body as {
        razorpay_payment_id?: string
        razorpay_subscription_id?: string
        razorpay_signature?: string
      }

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return jsonResponse(
        {
          error:
            "Missing required fields: razorpay_payment_id, razorpay_subscription_id, razorpay_signature",
        },
        400,
      )
    }

    // 3. Verify payment signature using Razorpay SDK utility
    let isValid = false
    try {
      isValid = validatePaymentVerification(
        {
          subscription_id: razorpay_subscription_id,
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
        `Invalid signature for payment ${razorpay_payment_id}, subscription ${razorpay_subscription_id}`
      )
      return jsonResponse(
        { verified: false, error: "Payment signature verification failed" },
        400,
      )
    }

    // 7. Enable Autopay in the database using service role
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (walletError || !wallet) {
      return jsonResponse({ verified: false, error: "Wallet not found" }, 404)
    }
    
    // Verify it's the expected subscription!
    if (wallet.razorpay_subscription_id !== razorpay_subscription_id) {
       console.error(`Subscription ID mismatch. Expected ${wallet.razorpay_subscription_id}, got ${razorpay_subscription_id}`);
       return jsonResponse({ verified: false, error: "Subscription ID mismatch" }, 403)
    }

    // Update wallet balance
    const { error: updateError } = await supabaseAdmin
      .from("wallets")
      .update({ auto_recharge_enabled: true })
      .eq("id", wallet.id)

    if (updateError) {
      console.error("Wallet update failed:", updateError)
      throw updateError
    }

    console.log(`Autopay verified & enabled: user=${user.id}, subscription=${razorpay_subscription_id}`)

    return jsonResponse({
      verified: true
    })
  } catch (error) {
    console.error("verify-razorpay-autopay error:", error)
    const message =
      error instanceof Error ? error.message : "Internal server error"
    return jsonResponse({ verified: false, error: message }, 500)
  }
})
