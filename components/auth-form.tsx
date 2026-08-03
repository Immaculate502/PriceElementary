"use client"

import Link from "next/link"
import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { signIn, signUp, type AuthResult } from "@/app/(auth)/auth-actions"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.29 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-navy text-navy-foreground hover:bg-navy/90"
    >
      {pending ? "Please wait…" : label}
    </Button>
  )
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "login" ? signIn : signUp
  const [state, formAction] = useActionState<AuthResult | null, FormData>(action, null)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [googleMessage, setGoogleMessage] = useState<string | null>(null)

  async function handleGoogle() {
    setGoogleMessage(null)
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setGoogleMessage(
        "Demo mode — connect Supabase and enable the Google provider to sign in with Google.",
      )
      return
    }

    setGoogleBusy(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
          `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setGoogleBusy(false)
      setGoogleMessage(error.message)
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {mode === "signup" && (
        <div className="grid gap-2">
          <label htmlFor="name" className="text-sm font-medium text-foreground">
            Full name
          </label>
          <input
            id="name"
            name="name"
            required
            autoComplete="name"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/40 focus:ring-2"
          />
        </div>
      )}

      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/40 focus:ring-2"
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          {mode === "login" && (
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-accent-foreground hover:underline"
            >
              Forgot password?
            </Link>
          )}
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/40 focus:ring-2"
        />
      </div>

      <SubmitButton label={mode === "login" ? "Sign in" : "Create account"} />

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogle}
        disabled={googleBusy}
        className="w-full gap-2 bg-background"
      >
        <GoogleIcon />
        {googleBusy
          ? "Redirecting to Google…"
          : mode === "login"
            ? "Sign in with Google"
            : "Sign up with Google"}
      </Button>

      {googleMessage && (
        <p className="flex items-center gap-1.5 text-sm text-destructive" role="status">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {googleMessage}
        </p>
      )}

      {state && (
        <p
          className={`flex items-center gap-1.5 text-sm ${
            state.ok ? "text-success" : "text-destructive"
          }`}
          role="status"
        >
          {state.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {state.message}
        </p>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            {"New to the community? "}
            <Link href="/signup" className="font-medium text-accent-foreground hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            {"Already a member? "}
            <Link href="/login" className="font-medium text-accent-foreground hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  )
}
