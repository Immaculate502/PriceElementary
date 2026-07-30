"use client"

import Link from "next/link"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { signIn, signUp, type AuthResult } from "@/app/(auth)/auth-actions"
import { Button } from "@/components/ui/button"

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
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Password
        </label>
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
