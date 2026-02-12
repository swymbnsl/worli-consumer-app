// ========================================
// Supabase Edge Function: setup-razorpay-autopay
// Creates a Razorpay subscription for autopay mandate
// ========================================
// Deploy: supabase functions deploy setup-razorpay-autopay

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Create Basic auth header using Deno-compatible base64 encoding
const credentials = new TextEncoder().encode(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
const authHeader = `Basic ${base64Encode(credentials)}`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { user_id, max_amount, customer } = await req.json()

    if (!user_id || !max_amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    // Step 1: Create or fetch Razorpay customer
    const customerResponse = await fetch(
      "https://api.razorpay.com/v1/customers",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          name: customer?.name || "Customer",
          email: customer?.email || "",
          contact: customer?.contact || "",
          notes: { user_id },
        }),
      },
    )

    const customerData = await customerResponse.json()

    // Step 2: Create a Plan (monthly, ₹0 - just for mandate authorization)
    const planResponse = await fetch("https://api.razorpay.com/v1/plans", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        period: "monthly",
        interval: 1,
        item: {
          name: "Duddu Wallet Auto-Recharge",
          amount: 0, // ₹0 plan - we charge on demand
          currency: "INR",
          description: "Automatic wallet recharge when balance is low",
        },
        notes: { user_id, purpose: "autopay_mandate" },
      }),
    })

    const planData = await planResponse.json()

    // Step 3: Create Subscription
    const subscriptionResponse = await fetch(
      "https://api.razorpay.com/v1/subscriptions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          plan_id: planData.id,
          customer_id: customerData.id,
          total_count: 120, // 10 years of monthly mandate
          quantity: 1,
          notes: {
            user_id,
            purpose: "wallet_auto_recharge",
            max_amount: max_amount.toString(),
          },
        }),
      },
    )

    const subscriptionData = await subscriptionResponse.json()

    // Step 4: Store customer and subscription IDs in wallet
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    await supabaseAdmin
      .from("wallets")
      .update({
        auto_recharge_enabled: true,
        auto_recharge_amount: max_amount / 100, // Convert from paise
      })
      .eq("user_id", user_id)

    return new Response(
      JSON.stringify({
        subscription_id: subscriptionData.id,
        short_url: subscriptionData.short_url,
        status: subscriptionData.status,
        customer_id: customerData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("AutoPay setup error:", error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
