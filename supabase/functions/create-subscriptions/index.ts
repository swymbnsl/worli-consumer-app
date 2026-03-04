import { createClient } from "npm:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req) => {
  console.log("🚀 [START] create-subscriptions request received")

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401)
    }

    // Authenticate user
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()

    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401)
    }

    let body;
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400)
    }

    const { subscriptions } = body
    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
      return jsonResponse({ error: "No subscriptions provided" }, 400)
    }

    // Connect with service role to bypass RLS and insert securely
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ─── 7 PM Cutoff Logic ───────────────────────────────────────────────────
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
    const nowUtc = new Date()
    const nowIst = new Date(nowUtc.getTime() + IST_OFFSET_MS)
    
    // Check if past 7 PM (19:00 IST)
    const isPastCutoff = nowIst.getUTCHours() >= 19

    const getTomorrowsDateStr = () => {
        const tomorrow = new Date(nowIst)
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
        return tomorrow.toISOString().split('T')[0]
    }
    
    const getDayAfterTomorrowsDateStr = () => {
        const after = new Date(nowIst)
        after.setUTCDate(after.getUTCDate() + 2)
        return after.toISOString().split('T')[0]
    }

    const tomorrowStr = getTomorrowsDateStr()
    const dayAfterStr = getDayAfterTomorrowsDateStr()

    // Process 7 PM Cutoff & Ensure user_id is forced to the authenticated user
    for (const sub of subscriptions) {
      sub.user_id = user.id // Force correct user

      if (isPastCutoff && sub.start_date === tomorrowStr) {
        if (sub.frequency === "buy_once") {
           return jsonResponse({ error: "It is past the 7 PM cutoff for tomorrow's delivery." }, 400)
        } else {
           // Shift start date to day-after-tomorrow
           sub.start_date = dayAfterStr
        }
      }
    }

    // ─── Duplicate Prevention ────────────────────────────────────────────────
    const { data: activeSubs, error: fetchError } = await supabaseAdmin
      .from("subscriptions")
      .select("product_id, address_id")
      .eq("user_id", user.id)
      .eq("status", "active")

    if (fetchError) {
      throw fetchError
    }

    for (const sub of subscriptions) {
      const isDuplicate = activeSubs?.some(active => 
        active.product_id === sub.product_id && 
        active.address_id === sub.address_id
      )

      if (isDuplicate) {
         const { data: product } = await supabaseAdmin.from("products").select("name").eq("id", sub.product_id).single()
         const productName = product?.name || "this product"
         return jsonResponse({ error: `You already have an active subscription for ${productName} at this address.` }, 400)
      }
      
      const duplicatesInBatch = subscriptions.filter((s: any) => s.product_id === sub.product_id && s.address_id === sub.address_id)
      if (duplicatesInBatch.length > 1) {
          const { data: product } = await supabaseAdmin.from("products").select("name").eq("id", sub.product_id).single()
          const productName = product?.name || "this product"
          return jsonResponse({ error: `Cannot process duplicate subscriptions for ${productName} at this address. Please remove the duplicate from your cart.` }, 400)
      }
    }

    // ─── Direct Insert ───────────────────────────────────────────────────────
    // The RLS won't block service role, but triggers will run (e.g. updated_at)
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .insert(subscriptions)
      .select()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation fallback
        return jsonResponse({ error: "An active subscription already exists for this product and address." }, 400)
      }
      throw error
    }

    // ─── Record Discount Usage ───────────────────────────────────────────────
    // Inserting into discount_usages fires the trigger that increments
    // discounts.current_uses and provides an audit trail.
    // We record one usage row per unique discount code used in this batch.
    const discountContext: { discount_amount: number; original_amount: number } | null = body.discount_context ?? null
    const discountCodeId: string | null = subscriptions[0]?.discount_code_id ?? null

    if (discountCodeId && discountContext) {
      const { error: usageError } = await supabaseAdmin
        .from("discount_usages")
        .insert({
          discount_id: discountCodeId,
          user_id: user.id,
          order_id: null, // No order exists yet; orders are generated later by the delivery job
          discount_amount_applied: discountContext.discount_amount,
          original_amount: discountContext.original_amount,
          final_amount: discountContext.original_amount - discountContext.discount_amount,
          status: "applied",
        })

      if (usageError) {
        // Log but don't roll back — subscriptions are already created.
        // A failed usage record is preferable to losing a confirmed order.
        console.error("⚠️ [WARN] Failed to record discount_usage:", usageError)
      } else {
        console.log(`🎟️ [DISCOUNT] Recorded usage of code ${discountCodeId} for user ${user.id}`)
      }
    }

    console.log(`✅ [SUCCESS] Created ${data.length} subscriptions for user ${user.id}`)
    return jsonResponse({ subscriptions: data })

  } catch (error) {
    console.error("❌ [ERROR] create-subscriptions error:", error)
    return jsonResponse({ error: "Internal server error" }, 500)
  }
})
