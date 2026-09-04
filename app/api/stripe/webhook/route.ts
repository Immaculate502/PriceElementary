import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { seedChurchActivities } from "@/lib/seed-activities"

// Stripe requires the raw request body to verify the signature.
export const dynamic = "force-dynamic"

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

type ChurchPatch = {
  subscription_status?: string
  stripe_subscription_id?: string | null
  setup_fee_paid?: boolean
  current_period_end?: string | null
}

async function patchChurchByCustomer(customerId: string, patch: ChurchPatch) {
  const admin = getSupabaseAdminClient()
  if (!admin) return
  await admin.from("churches").update(patch).eq("stripe_customer_id", customerId)
}

async function patchChurchById(churchId: string, patch: ChurchPatch) {
  const admin = getSupabaseAdminClient()
  if (!admin) return
  await admin.from("churches").update(patch).eq("id", churchId)
}

function periodEndISO(sub: any): string | null {
  const end = sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end
  return end ? new Date(end * 1000).toISOString() : null
}

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET) {
    console.log("[v0] STRIPE_WEBHOOK_SECRET is not set")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  const body = await req.text()
  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: any
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature"
    console.log("[v0] Stripe signature verification failed:", message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        const churchId: string | undefined =
          session.client_reference_id ?? session.metadata?.church_id
        const customerId: string | undefined =
          typeof session.customer === "string" ? session.customer : session.customer?.id
        const subscriptionId: string | undefined =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id

        let status = "active"
        let periodEnd: string | null = null
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId)
          status = (sub as any).status ?? "active"
          periodEnd = periodEndISO(sub)
        }

        const patch: ChurchPatch = {
          subscription_status: status,
          stripe_subscription_id: subscriptionId ?? null,
          setup_fee_paid: session.payment_status === "paid" || status === "active",
          current_period_end: periodEnd,
        }

        if (churchId) await patchChurchById(churchId, patch)
        else if (customerId) await patchChurchByCustomer(customerId, patch)

        // First successful payment: give the church its starter FAME activities.
        // Idempotent — seedChurchActivities no-ops if the church already has any.
        if (status === "active") {
          const admin = getSupabaseAdminClient()
          let targetId = churchId
          if (!targetId && customerId && admin) {
            const { data } = await admin
              .from("churches")
              .select("id")
              .eq("stripe_customer_id", customerId)
              .maybeSingle()
            targetId = data?.id
          }
          if (targetId && admin) {
            try {
              await seedChurchActivities(admin, targetId)
            } catch (seedErr) {
              console.log("[v0] Activity seed skipped:", seedErr instanceof Error ? seedErr.message : seedErr)
            }
          }
        }
        break
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object
        const customerId: string =
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id
        const churchId: string | undefined = sub.metadata?.church_id
        const patch: ChurchPatch = {
          subscription_status: sub.status,
          stripe_subscription_id: sub.id,
          current_period_end: periodEndISO(sub),
        }
        if (churchId) await patchChurchById(churchId, patch)
        else if (customerId) await patchChurchByCustomer(customerId, patch)
        break
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object
        const customerId: string =
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id
        const churchId: string | undefined = sub.metadata?.church_id
        const patch: ChurchPatch = {
          subscription_status: "canceled",
          current_period_end: periodEndISO(sub),
        }
        if (churchId) await patchChurchById(churchId, patch)
        else if (customerId) await patchChurchByCustomer(customerId, patch)
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object
        const customerId: string =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id
        if (customerId) {
          await patchChurchByCustomer(customerId, { subscription_status: "past_due" })
        }
        break
      }

      default:
        break
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler error"
    console.log("[v0] Stripe webhook handler error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
