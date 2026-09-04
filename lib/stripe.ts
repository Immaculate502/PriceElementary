import "server-only"
import Stripe from "stripe"

// Single shared Stripe client. The installed SDK pins its own API version.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)
