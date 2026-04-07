// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Optionally drain the request body so Deno doesn't complain about unconsumed streams
    try {
      await req.text()
    } catch (_e) {}

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      throw new Error("Missing Authorization header")
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

    // 1. Create a quick auth client using the incoming JWT to safely grab the user's Auth context
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    
    // Verify that the JWT is valid and get the authenticated user ID
    const { data: userData, error: userError } = await authClient.auth.getUser()
    if (userError || !userData?.user) {
      throw new Error("Unauthorized: Invalid user token")
    }
    const userId = userData.user.id

    // 2. Create an admin client (bypasses RLS) to query the secure data
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Select the referral stats and forcefully join the referee details now that we bypassed RLS
    const { data: statsData, error: statsError } = await adminClient
      .from("referrals")
      .select(`
        id,
        referrer_reward_amount,
        status,
        created_at,
        referrer_rewarded_at,
        referee:referee_id (
          full_name,
          phone_number
        )
      `)
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false })

    if (statsError) {
      throw statsError
    }

    return new Response(JSON.stringify({ data: statsData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error: any) {
    // Return 200 with an error object inside, so React Native doesn't throw an opaque FunctionsHttpError
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-referral-stats' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
