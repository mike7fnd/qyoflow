"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, signUp, type AuthState } from "@/app/auth/actions";
import { Button, Field, Input } from "@/components/ui";

export function AuthForm({ mode, next }: { mode: "signin" | "signup"; next?: string }) {
  const action = mode === "signup" ? signUp : signIn;
  const [state, formAction] = useActionState<AuthState, FormData>(action, undefined);
  const signup = mode === "signup";

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}

      {signup && (
        <Field label="Your name" htmlFor="name">
          <Input id="name" name="name" autoComplete="name" placeholder="Juan Dela Cruz" />
        </Field>
      )}

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@yourbusiness.com"
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        hint={signup ? "At least 8 characters." : undefined}
      >
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={signup ? "new-password" : "current-password"}
        />
      </Field>

      {/* One error region, above the button where the eye lands after failing. */}
      {state?.error && (
        <p
          role="alert"
          className="msg-in rounded-[var(--radius-md)] bg-[var(--color-danger-soft)] px-3.5 py-2.5 t-body-sm text-[var(--color-danger)]"
        >
          {state.error}
        </p>
      )}

      <Submit label={signup ? "Create account" : "Sign in"} />

      <p className="pt-2 text-center t-body-sm text-[var(--color-ink-2)]">
        {signup ? (
          <>
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[var(--color-accent)] underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link
              href="/signup"
              className="text-[var(--color-accent)] underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="mt-2 w-full" loading={pending}>
      {label}
    </Button>
  );
}
