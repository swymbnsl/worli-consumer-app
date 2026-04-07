// ========================================
// Supabase Edge Function: process-autopay-queue
// Scheduled job (runs every 5 minutes via cron)
// Processes pending autopay charges from the queue
// ========================================
// Deploy: supabase functions deploy process-autopay-queue --no-verify-jwt --project-ref mrbjduttwiciolhhabpa
// Setup cron: Create a cron trigger in Supabase dashboard to call this every 5 minutes

import { createClient } from "npm:@supabase/supabase-js@2"

// ── Environment ──────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!

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

// ── Main handler ─────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    console.log("[AUTOPAY QUEUE] Starting queue processing...")

    // ── 1. Fetch unprocessed autopay requests ────────────────
    const { data: queueItems, error: fetchError } = await supabaseAdmin
      .from("autopay_queue")
      .select("*")
      .eq("processed", false)
      .order("created_at", { ascending: true })
      .limit(10) // Process max 10 at a time

    if (fetchError) {
      console.error("[AUTOPAY QUEUE] Fetch error:", fetchError)
      return jsonResponse({ error: "Failed to fetch queue" }, 500)
    }

    if (!queueItems || queueItems.length === 0) {
      console.log("[AUTOPAY QUEUE] No pending items")
      return jsonResponse({
        processed: 0,
        message: "No pending autopay charges",
      })
    }

    console.log(`[AUTOPAY QUEUE] Found ${queueItems.length} items to process`)

    // ── 2. Process each item ──────────────────────────────────
    const results = []

    for (const item of queueItems) {
      console.log(`[AUTOPAY QUEUE] Processing user ${item.user_id}...`)

      try {
        // Call the trigger-autopay-charge function
        const { data, error } = await supabaseAdmin.functions.invoke(
          "trigger-autopay-charge",
          {
            body: { user_id: item.user_id },
          },
        )

        if (error) {
          console.error(
            `[AUTOPAY QUEUE] Error for user ${item.user_id}:`,
            error,
          )
          
          // Mark as processed with error
          await supabaseAdmin
            .from("autopay_queue")
            .update({
              processed: true,
              processed_at: new Date().toISOString(),
              error_message: error.message || "Unknown error",
            })
            .eq("user_id", item.user_id)

          results.push({
            user_id: item.user_id,
            success: false,
            error: error.message,
          })
          continue
        }

        if (data?.triggered) {
          console.log(
            `[AUTOPAY QUEUE] SUCCESS for user ${item.user_id}: Charged ₹${data.amount_charged}`,
          )

          // Mark as processed successfully
          await supabaseAdmin
            .from("autopay_queue")
            .update({
              processed: true,
              processed_at: new Date().toISOString(),
              error_message: null,
            })
            .eq("user_id", item.user_id)

          results.push({
            user_id: item.user_id,
            success: true,
            amount_charged: data.amount_charged,
            payment_id: data.payment_id,
          })
        } else {
          console.log(
            `[AUTOPAY QUEUE] Not triggered for user ${item.user_id}: ${data?.reason}`,
          )

          // Mark as processed (but not charged - might be due to cooldown or balance above threshold)
          await supabaseAdmin
            .from("autopay_queue")
            .update({
              processed: true,
              processed_at: new Date().toISOString(),
              error_message: data?.reason || "Not triggered",
            })
            .eq("user_id", item.user_id)

          results.push({
            user_id: item.user_id,
            success: false,
            reason: data?.reason,
          })
        }
      } catch (processError) {
        console.error(
          `[AUTOPAY QUEUE] Unexpected error for user ${item.user_id}:`,
          processError,
        )

        // Mark as processed with error
        await supabaseAdmin
          .from("autopay_queue")
          .update({
            processed: true,
            processed_at: new Date().toISOString(),
            error_message: (processError as Error).message,
          })
          .eq("user_id", item.user_id)

        results.push({
          user_id: item.user_id,
          success: false,
          error: (processError as Error).message,
        })
      }
    }

    const successCount = results.filter((r) => r.success).length

    console.log(
      `[AUTOPAY QUEUE] Completed: ${successCount}/${queueItems.length} successful`,
    )

    return jsonResponse({
      processed: queueItems.length,
      successful: successCount,
      results,
    })
  } catch (error) {
    console.error("[AUTOPAY QUEUE] Fatal error:", error)
    return jsonResponse(
      {
        error: "Internal server error",
        details: (error as Error).message,
      },
      500,
    )
  }
})
