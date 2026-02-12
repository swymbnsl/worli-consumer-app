// ========================================
// Supabase Edge Function: verify-razorpay-payment
// Verifies Razorpay payment signature and credits wallet
// ========================================
// Deploy: supabase functions deploy verify-razorpay-payment --no-verify-jwt --project-ref mrbjduttwiciolhhabpa

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";
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

async function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string
): Promise<boolean> {
  const payload = `${orderId}|${paymentId}`;
  const key = new TextEncoder().encode(RAZORPAY_KEY_SECRET);
  const data = new TextEncoder().encode(payload);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, data);
  const computedSignature = new TextDecoder().decode(
    hexEncode(new Uint8Array(signatureBuffer))
  );

  return computedSignature === signature;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      await req.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ error: "Missing payment details" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify signature
    const isValid = await verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      console.error("Invalid payment signature");
      return new Response(
        JSON.stringify({ verified: false, error: "Invalid signature" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Basic auth header using Deno-compatible base64 encoding
    const credentials = new TextEncoder().encode(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const basicAuth = `Basic ${base64Encode(credentials)}`;

    // Fetch payment details from Razorpay to get amount and user info
    const paymentResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${razorpay_payment_id}`,
      {
        headers: {
          "Authorization": basicAuth,
        },
      }
    );

    const paymentDetails = await paymentResponse.json();

    // Use service role to update wallet (bypasses RLS)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const userId = paymentDetails.notes?.user_id;
    const amountInRupees = paymentDetails.amount / 100;

    if (userId) {
      // Get current wallet balance
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (walletError) throw walletError;

      const newBalance = Number(wallet.balance) + amountInRupees;

      // Update wallet balance
      const { error: updateError } = await supabaseAdmin
        .from("wallets")
        .update({ balance: newBalance })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: txnError } = await supabaseAdmin
        .from("transactions")
        .insert({
          transaction_id: `TXN_${razorpay_payment_id}`,
          user_id: userId,
          wallet_id: wallet.id,
          type: "credit",
          amount: amountInRupees,
          status: "completed",
          description: "Wallet recharge via Razorpay",
          balance_before: wallet.balance,
          balance_after: newBalance,
          payment_method: paymentDetails.method || "razorpay",
          payment_gateway_id: razorpay_payment_id,
          payment_gateway_response: paymentDetails,
        });

      if (txnError) throw txnError;
    }

    return new Response(JSON.stringify({ verified: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Verification error:", error);
    return new Response(
      JSON.stringify({ verified: false, error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
