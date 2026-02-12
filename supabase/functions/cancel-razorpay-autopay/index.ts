// ========================================
// Supabase Edge Function: cancel-razorpay-autopay
// Cancels a Razorpay subscription/autopay mandate
// ========================================
// Deploy: supabase functions deploy cancel-razorpay-autopay

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
const basicAuth = `Basic ${base64Encode(credentials)}`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { subscription_id } = await req.json();

    if (!subscription_id) {
      return new Response(
        JSON.stringify({ error: "Missing subscription_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Cancel subscription on Razorpay
    const cancelResponse = await fetch(
      `https://api.razorpay.com/v1/subscriptions/${subscription_id}/cancel`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": basicAuth,
        },
        body: JSON.stringify({ cancel_at_cycle_end: 0 }),
      }
    );

    if (!cancelResponse.ok) {
      const errorData = await cancelResponse.json();
      console.error("Razorpay cancel failed:", errorData);
      return new Response(
        JSON.stringify({ cancelled: false, error: "Failed to cancel autopay" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the subscription to find user_id from notes
    const subResponse = await fetch(
      `https://api.razorpay.com/v1/subscriptions/${subscription_id}`,
      {
        headers: {
          "Authorization": basicAuth,
        },
      }
    );

    const subData = await subResponse.json();
    const userId = subData.notes?.user_id;

    if (userId) {
      const supabaseAdmin = createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY
      );

      await supabaseAdmin
        .from("wallets")
        .update({
          auto_recharge_enabled: false,
          auto_recharge_amount: null,
          auto_recharge_trigger_amount: null,
        })
        .eq("user_id", userId);
    }

    return new Response(JSON.stringify({ cancelled: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Cancel autopay error:", error);
    return new Response(
      JSON.stringify({ cancelled: false, error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
