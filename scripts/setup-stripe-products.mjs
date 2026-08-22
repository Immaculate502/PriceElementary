// Creates (idempotently) the ROOTED SaaS Stripe products and prices in test mode.
// Run: node --env-file=/vercel/share/.env.project scripts/setup-stripe-products.mjs
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const SUBSCRIPTION_LOOKUP = "rooted_monthly_v1"
const SETUP_FEE_LOOKUP = "rooted_setup_fee_v1"

async function findPriceByLookup(lookupKey) {
  const res = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 })
  return res.data[0] ?? null
}

async function ensureSubscriptionPrice() {
  const existing = await findPriceByLookup(SUBSCRIPTION_LOOKUP)
  if (existing) return existing

  const product = await stripe.products.create({
    name: "ROOTED Ministry Platform",
    description: "Monthly subscription to the ROOTED youth ministry platform.",
  })
  return stripe.prices.create({
    product: product.id,
    unit_amount: 19900,
    currency: "usd",
    recurring: { interval: "month" },
    lookup_key: SUBSCRIPTION_LOOKUP,
  })
}

async function ensureSetupFeePrice() {
  const existing = await findPriceByLookup(SETUP_FEE_LOOKUP)
  if (existing) return existing

  const product = await stripe.products.create({
    name: "ROOTED Activation & Onboarding",
    description: "One-time setup fee for onboarding a new church.",
  })
  return stripe.prices.create({
    product: product.id,
    unit_amount: 24900,
    currency: "usd",
    lookup_key: SETUP_FEE_LOOKUP,
  })
}

const sub = await ensureSubscriptionPrice()
const setup = await ensureSetupFeePrice()

console.log(
  JSON.stringify(
    {
      STRIPE_PRICE_SUBSCRIPTION: sub.id,
      STRIPE_PRICE_SETUP_FEE: setup.id,
      subscription_amount: sub.unit_amount,
      setup_amount: setup.unit_amount,
    },
    null,
    2,
  ),
)
