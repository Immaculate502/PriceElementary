"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { stripe } from "@/lib/stripe"
import { PRICE_SETUP_FEE, PRICE_SUBSCRIPTION } from "@/lib/billing"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { requireChurchAdmin } from "@/lib/admin-auth"
import { getCurrentChurch } from "@/lib/tenant"

export type BillingResult = { ok: boolean; message: string }

function baseUrl(h: Headers): string {
  const origin = h.get("origin")
  if (origin) return origin
  const host = h.get("host")
  return host ? `https://${host}` : ""
}

/** Ensure the church has a Stripe customer, creating one on first checkout. */
async function ensureCustomer(churchId: string, name: string, email: string | null) {
  const admin = getSupabaseAdminClient()
  if (!admin) throw new Error("Service-role key missing.")

  const { data } = await admin
    .from("churches")
    .select("stripe_customer_id")
    .eq("id", churchId)
    .single()

  if (data?.stripe_customer_id) return data.stripe_customer_id as string

  const customer = await stripe.customers.create({
    name,
    email: email ?? undefined,
    metadata: { church_id: churchId },
  })

  await admin.from("churches").update({ stripe_customer_id: customer.id }).eq("id", churchId)
  return customer.id
}

/**
 * Start subscription checkout for the current church. The first invoice
 * includes the one-time setup fee alongside the recurring plan. Idempotency is
 * keyed on the church so a double-submit can't create two subscriptions.
 */
export async function startCheckout(): Promise<BillingResult> {
  const ctx = await requireChurchAdmin()
  if (!ctx?.churchId) {
    return { ok: false, message: "Only a church leader can manage billing." }
  }

  const church = await getCurrentChurch()
  if (!church) return { ok: false, message: "Church not found." }

  const h = await headers()
  const base = baseUrl(h)
  let url: string | null = null

  try {
    const customerId = await ensureCustomer(church.id, church.name, church.contactEmail ?? ctx.email)

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        line_items: [
          { price: PRICE_SUBSCRIPTION, quantity: 1 },
          { price: PRICE_SETUP_FEE, quantity: 1 },
        ],
        client_reference_id: church.id,
        subscription_data: { metadata: { church_id: church.id } },
        success_url: `${base}/billing?status=success`,
        cancel_url: `${base}/billing?status=cancelled`,
        allow_promotion_codes: true,
      },
      { idempotencyKey: `checkout-${church.id}-${church.stripeCustomerId ?? "new"}` },
    )

    url = session.url
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start checkout."
    console.log("[v0] startCheckout error:", message)
    return { ok: false, message }
  }

  if (!url) return { ok: false, message: "Stripe did not return a checkout URL." }
  redirect(url)
}

/** Open the Stripe billing portal so leaders can manage/cancel their plan. */
export async function openBillingPortal(): Promise<BillingResult> {
  const ctx = await requireChurchAdmin()
  if (!ctx?.churchId) {
    return { ok: false, message: "Only a church leader can manage billing." }
  }

  const church = await getCurrentChurch()
  if (!church?.stripeCustomerId) {
    return { ok: false, message: "No billing account yet. Start a subscription first." }
  }

  const h = await headers()
  const base = baseUrl(h)
  let url: string | null = null

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: church.stripeCustomerId,
      return_url: `${base}/billing`,
    })
    url = session.url
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not open the billing portal."
    console.log("[v0] billingPortal error:", message)
    return { ok: false, message }
  }

  if (!url) return { ok: false, message: "Stripe did not return a portal URL." }
  redirect(url)
}
