// ============================================================================
// Supabase Edge Function: generate-daily-orders
// Daily cron job to create orders from active subscriptions
// Deducts bottle price from wallet for each order created
// Creates failed orders if insufficient balance
// ============================================================================
// Deploy: supabase functions deploy generate-daily-orders --no-verify-jwt --project-ref mrbjduttwiciolhhabpa
// 
// Schedule with pg_cron (run at 12:01 AM IST daily):
// SELECT cron.schedule('generate-daily-orders', '31 18 * * *', $$
//   SELECT net.http_post(
//     url := 'https://mrbjduttwiciolhhabpa.supabase.co/functions/v1/generate-daily-orders',
//     headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
//     body := '{"secret": "CRON_SECRET"}'::jsonb
//   );
// $$);

import { createClient } from "npm:@supabase/supabase-js@2"

// ─── Environment Variables ───────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "default-cron-secret"

// ─── CORS Headers ────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// ─── Helper Functions ────────────────────────────────────────────────────────
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

// Get today's date in IST
function getTodayIST(): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const nowUtc = new Date()
  const nowIst = new Date(nowUtc.getTime() + IST_OFFSET_MS)
  return nowIst.toISOString().split('T')[0]
}

// Get day of week (0 = Sunday, 6 = Saturday)
function getDayOfWeekIST(): number {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const nowUtc = new Date()
  const nowIst = new Date(nowUtc.getTime() + IST_OFFSET_MS)
  return nowIst.getUTCDay()
}

// Map day index to day name
const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

// Check if subscription should have delivery today
function shouldDeliverToday(
  subscription: any,
  todayDate: string,
  dayOfWeek: number
): { shouldDeliver: boolean; quantity: number } {
  const { frequency, start_date, quantity, interval_days, custom_quantities } = subscription

  // Check if subscription has started
  if (start_date > todayDate) {
    return { shouldDeliver: false, quantity: 0 }
  }

  // Check if subscription has ended (based on duration_months)
  const startDate = new Date(start_date)
  const endDate = new Date(startDate)
  endDate.setMonth(endDate.getMonth() + (subscription.duration_months || 1))
  const endDateStr = endDate.toISOString().split('T')[0]
  
  if (todayDate > endDateStr) {
    return { shouldDeliver: false, quantity: 0 }
  }

  switch (frequency) {
    case 'daily':
      return { shouldDeliver: true, quantity }

    case 'custom':
      // Custom has quantities per day of week
      if (custom_quantities) {
        const dayName = dayNames[dayOfWeek]
        const dayQty = custom_quantities[dayName] || 0
        return { shouldDeliver: dayQty > 0, quantity: dayQty }
      }
      return { shouldDeliver: false, quantity: 0 }

    case 'on_interval':
      // Delivery every X days
      if (interval_days && interval_days > 0) {
        const start = new Date(start_date)
        const today = new Date(todayDate)
        const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        const isDeliveryDay = diffDays % interval_days === 0
        return { shouldDeliver: isDeliveryDay, quantity }
      }
      return { shouldDeliver: false, quantity: 0 }

    case 'buy_once':
      // One-time delivery on start date only
      return { shouldDeliver: start_date === todayDate, quantity }

    default:
      return { shouldDeliver: false, quantity: 0 }
  }
}

// Generate unique order number
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `ORD-${timestamp}-${random}`
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
Deno.serve(async (req) => {
  console.log("🚀 [GENERATE-DAILY-ORDERS] Request received")

  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  try {
    // Validate cron secret (for security when called by pg_cron)
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      // Allow empty body for direct calls
    }

    // Check authorization - either via secret or service role key
    const authHeader = req.headers.get("Authorization")
    const isServiceRole = authHeader?.includes(SUPABASE_SERVICE_ROLE_KEY.slice(0, 20))
    const hasValidSecret = body.secret === CRON_SECRET

    if (!isServiceRole && !hasValidSecret) {
      console.error("❌ [GENERATE-DAILY-ORDERS] Unauthorized access attempt")
      return jsonResponse({ error: "Unauthorized" }, 401)
    }

    console.log("✓ [GENERATE-DAILY-ORDERS] Authorization validated")

    // Create admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const todayDate = getTodayIST()
    const dayOfWeek = getDayOfWeekIST()

    console.log(`📅 [GENERATE-DAILY-ORDERS] Processing orders for ${todayDate} (${dayNames[dayOfWeek]})`)

    // 1. Fetch all active subscriptions
    console.log("📦 [GENERATE-DAILY-ORDERS] Fetching active subscriptions...")
    const { data: subscriptions, error: subsError } = await supabaseAdmin
      .from("subscriptions")
      .select(`
        *,
        product:products(id, name, price),
        user:users(id, full_name, email),
        address:addresses(id, address_line1, city, pincode)
      `)
      .eq("status", "active")

    if (subsError) {
      console.error("❌ [GENERATE-DAILY-ORDERS] Failed to fetch subscriptions:", subsError)
      return jsonResponse({ error: "Failed to fetch subscriptions" }, 500)
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("ℹ️ [GENERATE-DAILY-ORDERS] No active subscriptions found")
      return jsonResponse({
        success: true,
        message: "No active subscriptions",
        orders_created: 0,
        orders_failed: 0,
      })
    }

    console.log(`✓ [GENERATE-DAILY-ORDERS] Found ${subscriptions.length} active subscriptions`)

    // 2. Check for existing orders today (to avoid duplicates)
    const { data: existingOrders } = await supabaseAdmin
      .from("orders")
      .select("subscription_id")
      .eq("delivery_date", todayDate)

    const existingOrderSubIds = new Set(existingOrders?.map(o => o.subscription_id) || [])

    // 3. Process each subscription
    const results = {
      ordersCreated: 0,
      ordersFailed: 0,
      ordersSkipped: 0,
      details: [] as any[],
    }

    // Group subscriptions by user for efficient wallet handling
    const subscriptionsByUser = new Map<string, any[]>()
    
    for (const sub of subscriptions) {
      // Skip if already has order for today
      if (existingOrderSubIds.has(sub.id)) {
        results.ordersSkipped++
        continue
      }

      // Check if should deliver today
      const { shouldDeliver, quantity } = shouldDeliverToday(sub, todayDate, dayOfWeek)
      
      if (!shouldDeliver) {
        continue
      }

      const userId = sub.user_id
      if (!subscriptionsByUser.has(userId)) {
        subscriptionsByUser.set(userId, [])
      }
      subscriptionsByUser.get(userId)!.push({ ...sub, deliveryQuantity: quantity })
    }

    console.log(`📋 [GENERATE-DAILY-ORDERS] Processing orders for ${subscriptionsByUser.size} users`)

    // Process each user's subscriptions
    for (const [userId, userSubs] of subscriptionsByUser) {
      // Fetch user's wallet
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from("wallets")
        .select("id, balance")
        .eq("user_id", userId)
        .single()

      if (walletError || !wallet) {
        console.warn(`⚠️ [GENERATE-DAILY-ORDERS] No wallet found for user ${userId}`)
        // Create failed orders for this user
        for (const sub of userSubs) {
          await createFailedOrder(supabaseAdmin, sub, todayDate, "No wallet found")
          results.ordersFailed++
        }
        continue
      }

      let currentBalance = Number(wallet.balance)

      for (const sub of userSubs) {
        const bottlePrice = sub.product?.price || 30
        const orderAmount = sub.deliveryQuantity * bottlePrice

        // Check if user has enough balance
        if (currentBalance >= orderAmount) {
          // Create order and deduct wallet
          const success = await createOrderAndDeductWallet(
            supabaseAdmin,
            sub,
            todayDate,
            wallet.id,
            currentBalance,
            orderAmount
          )

          if (success) {
            currentBalance -= orderAmount
            results.ordersCreated++
            results.details.push({
              subscription_id: sub.id,
              user_id: userId,
              product: sub.product?.name,
              quantity: sub.deliveryQuantity,
              amount: orderAmount,
              status: "created",
            })
          } else {
            results.ordersFailed++
          }
        } else {
          // Insufficient balance - create failed order
          await createFailedOrder(
            supabaseAdmin,
            sub,
            todayDate,
            `Insufficient balance: ₹${currentBalance.toFixed(2)} < ₹${orderAmount}`
          )
          results.ordersFailed++
          results.details.push({
            subscription_id: sub.id,
            user_id: userId,
            product: sub.product?.name,
            quantity: sub.deliveryQuantity,
            amount: orderAmount,
            balance: currentBalance,
            status: "failed",
            reason: "Insufficient balance",
          })
        }
      }
    }

    console.log(`✅ [GENERATE-DAILY-ORDERS] Completed:`)
    console.log(`   - Orders created: ${results.ordersCreated}`)
    console.log(`   - Orders failed: ${results.ordersFailed}`)
    console.log(`   - Orders skipped (already exist): ${results.ordersSkipped}`)

    return jsonResponse({
      success: true,
      date: todayDate,
      orders_created: results.ordersCreated,
      orders_failed: results.ordersFailed,
      orders_skipped: results.ordersSkipped,
      details: results.details,
    })

  } catch (error: any) {
    console.error("❌ [GENERATE-DAILY-ORDERS] Unexpected error:", error)
    return jsonResponse({
      error: error.message || "Internal server error",
    }, 500)
  }
})

// ============================================================================
// Helper: Create order and deduct from wallet
// ============================================================================
async function createOrderAndDeductWallet(
  supabaseAdmin: any,
  subscription: any,
  deliveryDate: string,
  walletId: string,
  balanceBefore: number,
  amount: number
): Promise<boolean> {
  const orderNumber = generateOrderNumber()
  const balanceAfter = balanceBefore - amount

  try {
    // Start transaction-like operations
    // 1. Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        product_id: subscription.product_id,
        delivery_date: deliveryDate,
        status: "scheduled",
        quantity: subscription.deliveryQuantity,
        amount: amount,
        address_id: subscription.address_id,
        delivery_notes: subscription.delivery_notes,
      })
      .select()
      .single()

    if (orderError) {
      console.error(`❌ Failed to create order for subscription ${subscription.id}:`, orderError)
      return false
    }

    // 2. Deduct wallet balance
    const { error: walletError } = await supabaseAdmin
      .from("wallets")
      .update({ balance: balanceAfter })
      .eq("id", walletId)

    if (walletError) {
      console.error(`❌ Failed to deduct wallet for order ${orderNumber}:`, walletError)
      // Rollback order
      await supabaseAdmin.from("orders").delete().eq("id", order.id)
      return false
    }

    // 3. Create transaction record
    const transactionId = `TXN_ORD_${orderNumber}`
    const { error: txnError } = await supabaseAdmin
      .from("transactions")
      .insert({
        transaction_id: transactionId,
        user_id: subscription.user_id,
        wallet_id: walletId,
        order_id: order.id,
        type: "debit",
        amount: amount,
        status: "completed",
        description: `Delivery: ${subscription.product?.name || 'Milk Bottle'} x${subscription.deliveryQuantity}`,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        payment_method: "wallet",
      })

    if (txnError) {
      console.warn(`⚠️ Transaction record failed for order ${orderNumber}:`, txnError)
      // Non-critical - order still created
    }

    console.log(`✓ Order ${orderNumber} created: ${subscription.product?.name} x${subscription.deliveryQuantity} = ₹${amount}`)
    return true

  } catch (error: any) {
    console.error(`❌ Error creating order for subscription ${subscription.id}:`, error)
    return false
  }
}

// ============================================================================
// Helper: Create failed order
// ============================================================================
async function createFailedOrder(
  supabaseAdmin: any,
  subscription: any,
  deliveryDate: string,
  reason: string
): Promise<void> {
  const orderNumber = generateOrderNumber()
  const bottlePrice = subscription.product?.price || 30
  const amount = subscription.deliveryQuantity * bottlePrice

  try {
    await supabaseAdmin
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        product_id: subscription.product_id,
        delivery_date: deliveryDate,
        status: "failed",
        quantity: subscription.deliveryQuantity,
        amount: amount,
        address_id: subscription.address_id,
        delivery_notes: subscription.delivery_notes,
        cancellation_reason: reason,
      })

    console.log(`⚠️ Failed order ${orderNumber} created: ${reason}`)

    // TODO: Send notification to user about failed order / low balance

  } catch (error: any) {
    console.error(`❌ Error creating failed order for subscription ${subscription.id}:`, error)
  }
}
