// Pricing catalog for the ROOTED SaaS. Prices live in Stripe (test mode); the
// IDs below are created by scripts/setup-stripe-products.mjs. Env vars override
// the defaults when going live.

export const PRICE_SUBSCRIPTION =
  process.env.STRIPE_PRICE_SUBSCRIPTION ?? "price_1U7GpWA4qHVLcz90fAMEF8dy"

export const PRICE_SETUP_FEE =
  process.env.STRIPE_PRICE_SETUP_FEE ?? "price_1U7GpXA4qHVLcz90iLg8rV1D"

export const PLAN = {
  name: "ROOTED Ministry Platform",
  monthlyAmount: 19900, // cents
  setupFeeAmount: 24900, // cents
  currency: "usd",
} as const

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}

// A church's subscription is "entitled" (app usable) in these states.
export const ACTIVE_STATUSES = ["trialing", "active", "past_due"] as const

export type SubscriptionStatus =
  | "incomplete"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "paused"
  | "suspended"

export function isEntitled(status: string | null | undefined, suspended: boolean): boolean {
  if (suspended) return false
  return (ACTIVE_STATUSES as readonly string[]).includes(status ?? "")
}

export const PLAN_FEATURES: string[] = [
  "Unlimited youth members",
  "Discipleship activities & streaks",
  "Video lessons with reflection questions",
  "VOCAL prayer video journaling",
  "Leadership dashboard & member insights",
  "Custom church branding",
]
