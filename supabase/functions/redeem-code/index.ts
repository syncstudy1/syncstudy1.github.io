import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── 1. Require Authorization header ────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ success: false, error: 'Missing Authorization header' }, 401)
    }

    // ── 2. Build service-role client (bypasses RLS — stays server-side) ───
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      return json({ success: false, error: 'Server configuration error' }, 500)
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })

    // ── 3. Verify the caller's JWT and extract user id ─────────────────────
    const token = authHeader.replace('Bearer ', '').trim()
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token)

    if (userError || !user) {
      return json({ success: false, error: 'Invalid or expired session. Please sign in again.' }, 401)
    }

    // ── 4. Parse and validate the code from the request body ───────────────
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return json({ success: false, error: 'Invalid request body.' }, 400)
    }

    const rawCode = String(body.code ?? '').trim().toUpperCase()
    if (!rawCode) {
      return json({ success: false, error: 'Please enter a redeem code.' }, 400)
    }

    // ── 5. Look up the code via the service-role client (RLS bypassed) ─────
    //   The redeem_codes table has NO client-accessible policies, so this
    //   query can only succeed from server-side code using the service key.
    const { data: codeRecord, error: codeError } = await adminClient
      .from('redeem_codes')
      .select('code, duration_days, active')
      .eq('code', rawCode)
      .maybeSingle()

    if (codeError) {
      console.error('redeem_codes lookup error:', codeError.message)
      return json({ success: false, error: 'Internal error validating code.' }, 500)
    }

    if (!codeRecord || !codeRecord.active) {
      // Return a generic message — do not confirm whether the code exists.
      return json({ success: false, error: 'Invalid or inactive redeem code.' }, 400)
    }

    // ── 6. Atomic grant: UPDATE only if this account has NOT used this code ─
    //   The WHERE clause includes `redeem_code_used IS DISTINCT FROM rawCode`,
    //   so two concurrent requests will race on the DB row; only one will find
    //   a matching row and update it.  The losing request will see rowCount=0
    //   and receive the "already redeemed" error.
    const durationDays: number = codeRecord.duration_days ?? 30

    // Calculate expiry as exactly durationDays calendar days from now (UTC).
    const now = new Date()
    const expiresAt = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + durationDays,
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds(),
      )
    ).toISOString()

    const { data: updatedRows, error: updateError } = await adminClient
      .from('profiles')
      .update({
        tier: 'premium',
        premium_expires_at: expiresAt,
        redeem_code_used: rawCode,
        redeem_used_at: now.toISOString(),
      })
      // Only update if the account has not already used this exact code.
      // This WHERE + select('id') pattern returns the affected row count.
      .eq('id', user.id)
      .is('redeem_code_used', null)        // account has never redeemed any code
      .select('id')                         // return updated rows so we can count them

    if (updateError) {
      console.error('profile update error:', updateError.message)
      return json({ success: false, error: 'Failed to activate premium. Please try again.' }, 500)
    }

    // If no rows were updated, the user has already redeemed a code.
    if (!updatedRows || updatedRows.length === 0) {
      return json(
        { success: false, error: 'Your account has already redeemed a code and cannot redeem another.' },
        400
      )
    }

    // ── 7. Success ─────────────────────────────────────────────────────────
    return json({
      success: true,
      message: `${durationDays} days of SyncStudy Premium activated! Your access expires on ${new Date(expiresAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}.`,
      expires_at: expiresAt,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    console.error('redeem-code unhandled error:', message)
    return json({ success: false, error: 'An unexpected error occurred. Please try again.' }, 500)
  }
})
