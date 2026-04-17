import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// RevenueCat 웹훅 인증 토큰 (RevenueCat 대시보드에서 설정한 값)
const WEBHOOK_AUTH = Deno.env.get('REVENUECAT_WEBHOOK_AUTH') ?? ''

serve(async (req: Request) => {
  // RevenueCat Authorization 헤더 검증
  const auth = req.headers.get('Authorization') ?? ''
  if (WEBHOOK_AUTH && auth !== WEBHOOK_AUTH) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const event = body?.event
  if (!event) return new Response('No event', { status: 400 })

  // app_user_id = Supabase user UUID (Purchases.logIn()으로 설정한 값)
  const appUserId: string  = event.app_user_id
  const eventType: string  = event.type
  const expiresMs: number | null = event.expiration_at_ms ?? null
  const entitlementIds: string[] = event.entitlement_ids ??
    (event.entitlement_id ? [event.entitlement_id] : [])

  if (!appUserId) return new Response('No app_user_id', { status: 400 })

  // Supabase Admin Client (서비스 롤 키로 RLS 우회)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // 플랜 결정
  let plan = 'free'
  if (entitlementIds.includes('pro_entitlement'))           plan = 'pro'
  else if (entitlementIds.includes('standard_entitlement')) plan = 'standard'

  const ACTIVE_EVENTS   = ['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'TRANSFER']
  const INACTIVE_EVENTS = ['CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE']

  if (ACTIVE_EVENTS.includes(eventType)) {
    const { error } = await supabase.from('subscriptions').upsert({
      user_id: appUserId,
      plan,
      status: 'active',
      current_period_end: expiresMs ? new Date(expiresMs).toISOString() : null,
      cancel_at_period_end: false,
    }, { onConflict: 'user_id' })
    if (error) console.error('[Webhook] upsert 오류:', error)

  } else if (INACTIVE_EVENTS.includes(eventType)) {
    const status = eventType === 'BILLING_ISSUE' ? 'past_due' : 'canceled'
    const { error } = await supabase.from('subscriptions').upsert({
      user_id: appUserId,
      plan: eventType === 'EXPIRATION' ? 'free' : plan,
      status,
      cancel_at_period_end: eventType === 'CANCELLATION',
    }, { onConflict: 'user_id' })
    if (error) console.error('[Webhook] upsert 오류:', error)
  }

  console.log(`[Webhook] ${eventType} | user: ${appUserId} | plan: ${plan}`)
  return new Response('OK', { status: 200 })
})
