// ========================================
// Supabase Edge Function: cancel-razorpay-autopay
// Cancels a Razorpay subscription/autopay mandate
// Uses Razorpay Node SDK v2.9.6 via npm imports
// ========================================
// Deploy: supabase functions deploy cancel-razorpay-autopay --no-verify-jwt --project-ref mrbjduttwiciolhhabpa

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

    // ── 2. Get wallet to find subscription ID ────────────────
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("razorpay_subscription_id, auto_recharge_enabled")
      .eq("user_id", userId)
      .single()

    if (walletError) {
      console.error("Wallet fetch error:", walletError.message)
      return jsonResponse({ error: "Could not fetch wallet" }, 500)
    }

    if (!wallet?.razorpay_subscription_id) {
      return jsonResponse(
        { error: "No active autopay subscription found" },
        404,
      )
    }

    if (!wallet.auto_recharge_enabled) {
      // Already disabled – just clear the fields to be safe
      await supabaseAdmin
        .from("wallets")
        .update({
          auto_recharge_enabled: false,
          auto_recharge_amount: null,
          auto_recharge_trigger_amount: null,
          razorpay_subscription_id: null,
        })
        .eq("user_id", userId)

      return jsonResponse({
        cancelled: true,
        message: "Autopay was already disabled",
      })
    }

    // ── 3. Cancel subscription on Razorpay ───────────────────
    const subscriptionId = wallet.razorpay_subscription_id

    try {
      const cancelResult = await razorpay.subscriptions.cancel(subscriptionId, {
        cancel_at_cycle_end: false, // Cancel immediately
      })
      console.log(
        "Subscription cancelled:",
        subscriptionId,
        "status:",
        cancelResult.status,
      )
    } catch (cancelErr) {
      const errorMsg = (cancelErr as Error).message || "Unknown error"
      console.error("Razorpay cancel error:", errorMsg)

      // If subscription is already cancelled or doesn't exist, still clean up DB
      const isAlreadyCancelled =
        errorMsg.includes("already cancelled") ||
        errorMsg.includes("completed") ||
        errorMsg.includes("not found")

      if (!isAlreadyCancelled) {
        return jsonResponse(
          {
            cancelled: false,
            error: "Failed to cancel autopay on Razorpay",
            details: errorMsg,
          },
          500,
        )
      }

      console.log("Subscription already cancelled/completed, cleaning up DB")
    }

    // ── 4. Update wallet – clear autopay settings ────────────
    const { error: updateError } = await supabaseAdmin
      .from("wallets")
      .update({
        auto_recharge_enabled: false,
        auto_recharge_amount: null,
        auto_recharge_trigger_amount: null,
        razorpay_subscription_id: null,
      })
      .eq("user_id", userId)

    if (updateError) {
      console.error("Wallet update error:", updateError.message)
      // Subscription is cancelled on Razorpay, but DB didn't update
      return jsonResponse(
        {
          cancelled: true,
          warning:
            "Subscription cancelled but wallet update failed. Please refresh.",
        },
        200,
      )
    }

    // ── 5. Return success ────────────────────────────────────
    return jsonResponse({
      cancelled: true,
      message: "Autopay cancelled successfully",
    })
  } catch (error) {
    console.error("Cancel autopay error:", error)
    return jsonResponse(
      {
        cancelled: false,
        error: "Internal server error",
        details: (error as Error).message,
      },
      500,
    )
  }
})
