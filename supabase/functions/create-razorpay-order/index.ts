// ========================================
// Supabase Edge Function: create-razorpay-order
// Creates a Razorpay order for wallet recharge
// ========================================
// Deploy: supabase functions deploy create-razorpay-order --no-verify-jwt --project-ref mrbjduttwiciolhhabpa

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate secrets are configured
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error("Razorpay credentials not configured. KEY_ID present:", !!RAZORPAY_KEY_ID, "SECRET present:", !!RAZORPAY_KEY_SECRET);
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { amount, currency, receipt, notes } = await req.json();

    console.log("Creating order with amount:", amount, "currency:", currency || "INR");

    if (!amount || amount < 100) {
      return new Response(
        JSON.stringify({ error: "Amount must be at least ₹1 (100 paise)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Basic auth header using Deno-compatible base64 encoding
    const credentials = new TextEncoder().encode(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const basicAuth = `Basic ${base64Encode(credentials)}`;

    // Create Razorpay order via their API
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": basicAuth,
      },
      body: JSON.stringify({
        amount,
        currency: currency || "INR",
        receipt: receipt || `rcpt_${Date.now()}`,
        notes: notes || {},
      }),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error(
        "Razorpay API error - Status:", razorpayResponse.status,
        "Response:", errorText
      );
      return new Response(
        JSON.stringify({
          error: "Failed to create payment order",
          details: `Razorpay returned ${razorpayResponse.status}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const order = await razorpayResponse.json();
    console.log("Order created successfully:", order.id);

    return new Response(
      JSON.stringify({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", (error as Error).message, (error as Error).stack);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
