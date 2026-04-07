// ========================================
// Supabase Edge Function: trigger-autopay-charge
// Manually charges a Razorpay subscription when wallet balance drops below threshold
// Called by database trigger or webhook
// ========================================
// Deploy: supabase functions deploy trigger-autopay-charge --no-verify-jwt --project-ref mrbjduttwiciolhhabpa

import { createClient } from "npm:@supabase/supabase-js@2"
import Razorpay from "npm:razorpay@2.9.6"

// ── Environment ──────────────────────────────────────────────
const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
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
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ── 1. Parse request body ────────────────────────────────
    const body = await req.json()
    const { user_id } = body

    if (!user_id) {
      return jsonResponse({ error: "user_id is required" }, 400)
    }

    console.log(`[AUTOPAY] Checking autopay trigger for user: ${user_id}`)

    // ── 2. Get wallet information ────────────────────────────
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select(
        "balance, auto_recharge_enabled, auto_recharge_amount, auto_recharge_trigger_amount, razorpay_subscription_id, last_autopay_charge_at",
      )
      .eq("user_id", user_id)
      .single()

    if (walletError || !wallet) {
      console.error(`[AUTOPAY] Wallet not found for user ${user_id}`)
      return jsonResponse({ error: "Wallet not found" }, 404)
    }

    // ── 3. Check if autopay should trigger ──────────────────
    if (!wallet.auto_recharge_enabled) {
      console.log(`[AUTOPAY] Auto-recharge disabled for user ${user_id}`)
      return jsonResponse({
        triggered: false,
        reason: "Auto-recharge is disabled",
      })
    }

    if (!wallet.razorpay_subscription_id) {
      console.log(`[AUTOPAY] No Razorpay subscription for user ${user_id}`)
      return jsonResponse({
        triggered: false,
        reason: "No Razorpay subscription found",
      })
    }

    const balance = parseFloat(wallet.balance || "0")
    const triggerAmount = parseFloat(wallet.auto_recharge_trigger_amount || "0")
    const rechargeAmount = parseFloat(wallet.auto_recharge_amount || "0")

    // Check if balance is above trigger threshold
    if (balance >= triggerAmount) {
      console.log(
        `[AUTOPAY] Balance (₹${balance}) >= trigger (₹${triggerAmount}), no charge needed`,
      )
      return jsonResponse({
        triggered: false,
        reason: "Balance is above trigger threshold",
        balance,
        trigger_amount: triggerAmount,
      })
    }

    // ── 4. Check cooldown (prevent multiple charges in short time) ──
    const lastChargeAt = wallet.last_autopay_charge_at
      ? new Date(wallet.last_autopay_charge_at)
      : null
    const now = new Date()
    const cooldownHours = 12 // Minimum 12 hours between autopay charges

    if (lastChargeAt) {
      const hoursSinceLastCharge =
        (now.getTime() - lastChargeAt.getTime()) / (1000 * 60 * 60)
      if (hoursSinceLastCharge < cooldownHours) {
        console.log(
          `[AUTOPAY] Cooldown active. Last charge: ${hoursSinceLastCharge.toFixed(1)}h ago`,
        )
        return jsonResponse({
          triggered: false,
          reason: "Cooldown period active",
          hours_since_last_charge: hoursSinceLastCharge.toFixed(1),
          cooldown_hours: cooldownHours,
        })
      }
    }

    console.log(
      `[AUTOPAY] Triggering charge: Balance ₹${balance} < ₹${triggerAmount}`,
    )

    // ── 5. Create a charge on the Razorpay subscription ─────
    let paymentId: string
    let amountCharged: number

    try {
      // Fetch the subscription to get details
      const subscription = await razorpay.subscriptions.fetch(
        wallet.razorpay_subscription_id,
      )

      if (subscription.status !== "active" && subscription.status !== "authenticated") {
        console.error(
          `[AUTOPAY] Subscription status is ${subscription.status}, cannot charge`,
        )
        
        // Disable auto-recharge since subscription is not active
        await supabaseAdmin
          .from("wallets")
          .update({ auto_recharge_enabled: false })
          .eq("user_id", user_id)

        return jsonResponse({
          triggered: false,
          error: `Subscription status is ${subscription.status}. Auto-recharge has been disabled.`,
        }, 400)
      }

      // Create an invoice/charge for this subscription
      // Razorpay will automatically charge the customer's saved payment method
      const amountInPaise = Math.round(rechargeAmount * 100)
      
      // Create an invoice
      const invoice = await razorpay.invoices.create({
        customer_id: subscription.customer_id,
        type: "invoice",
        description: `Wallet Auto-Recharge (Balance: ₹${balance})`,
        amount: amountInPaise,
        currency: "INR",
        subscription_id: wallet.razorpay_subscription_id,
        draft: false, // Issue immediately
      })

      console.log(`[AUTOPAY] Created invoice: ${invoice.id}`)

      // The invoice will be auto-charged if customer has a valid payment method
      // We need to wait a moment and check the status
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const updatedInvoice = await razorpay.invoices.fetch(invoice.id)
      
      if (updatedInvoice.status === "paid") {
        paymentId = updatedInvoice.payment_id || invoice.id
        amountCharged = rechargeAmount

        console.log(
          `[AUTOPAY] Charge successful: ₹${amountCharged}, payment: ${paymentId}`,
        )
      } else {
        console.error(
          `[AUTOPAY] Invoice created but not paid. Status: ${updatedInvoice.status}`,
        )
        return jsonResponse({
          triggered: false,
          error: `Invoice created but payment failed. Status: ${updatedInvoice.status}`,
          invoice_id: invoice.id,
        }, 400)
      }
    } catch (chargeErr: any) {
      console.error("[AUTOPAY] Charge error:", chargeErr)
      return jsonResponse(
        {
          triggered: false,
          error: "Failed to charge subscription",
          details: chargeErr?.error?.description || chargeErr.message,
        },
        500,
      )
    }

    // ── 6. Update wallet balance ─────────────────────────────
    const newBalance = balance + amountCharged
    const transactionId = `AUTOPAY_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Create transaction record
    const { error: txnError } = await supabaseAdmin.from("transactions").insert({
      transaction_id: transactionId,
      user_id: user_id,
      wallet_id: wallet.id,
      type: "credit",
      amount: amountCharged,
      balance_before: balance,
      balance_after: newBalance,
      description: `Auto-recharge triggered (balance < ₹${triggerAmount})`,
      payment_method: "razorpay_autopay",
      payment_gateway_id: paymentId,
      status: "completed",
    })

    if (txnError) {
      console.error("[AUTOPAY] Transaction insert error:", txnError)
      // Continue anyway - we'll update the balance
    }

    // Update wallet
    const { error: updateError } = await supabaseAdmin
      .from("wallets")
      .update({
        balance: newBalance,
        last_autopay_charge_at: now.toISOString(),
      })
      .eq("user_id", user_id)

    if (updateError) {
      console.error("[AUTOPAY] Wallet update error:", updateError)
      return jsonResponse(
        {
          triggered: true,
          warning: "Charge succeeded but wallet update failed",
          payment_id: paymentId,
          amount_charged: amountCharged,
        },
        200,
      )
    }

    console.log(
      `[AUTOPAY] SUCCESS: Charged ₹${amountCharged}, balance: ₹${balance} → ₹${newBalance}`,
    )

    // ── 7. Return success ────────────────────────────────────
    return jsonResponse({
      triggered: true,
      payment_id: paymentId,
      amount_charged: amountCharged,
      old_balance: balance,
      new_balance: newBalance,
      transaction_id: transactionId,
    })
  } catch (error) {
    console.error("[AUTOPAY] Unexpected error:", error)
    return jsonResponse(
      {
        triggered: false,
        error: "Internal server error",
        details: (error as Error).message,
      },
      500,
    )
  }
})
