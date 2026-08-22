import type { Metadata } from "next"
import { ChurchSignupForm } from "@/components/church-signup-form"
import { RootedEmblem } from "@/components/rooted-emblem"

export const metadata: Metadata = {
  title: "Start your church on ROOTED",
  description: "Register your church and set up discipleship for your youth ministry.",
}

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 lg:hidden">
        <RootedEmblem size={40} priority />
        <span className="font-display text-xl font-semibold tracking-wide text-foreground">
          ROOTED
        </span>
      </div>

      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Start your church</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Create your church workspace and become its first leader. You&apos;ll set up billing on
          the next step, then invite your members.
        </p>
      </div>

      <ChurchSignupForm />
    </div>
  )
}
