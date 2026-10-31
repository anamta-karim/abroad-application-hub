"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction, type AuthActionResult } from "@/app/auth/actions";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

const initialState: AuthActionResult = {};

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUpAction, initialState);

  return (
    <div className="w-full max-w-md bg-surface border border-rule rounded p-6 sm:p-8 space-y-6">
      <div className="space-y-1">
        <Link
          href="/"
          className="text-xs text-ink-muted hover:text-forest focus:outline-none focus:underline"
        >
          Back to home
        </Link>
        <h1 className="text-2xl font-bold text-ink">Create your account</h1>
        <p className="text-sm text-ink-muted">
          Your applications and source documents will remain private to this account.
        </p>
      </div>

      {state?.error && (
        <div
          className="p-3 text-xs bg-paper border border-error text-error rounded"
          role="alert"
        >
          {state.error}
        </div>
      )}

      {state?.success ? (
        <div className="space-y-4">
          <div
            className="p-3 text-xs bg-sage border border-forest text-forest rounded"
            role="status"
          >
            {state.message}
          </div>
          <Link
            href="/login"
            className="block w-full h-11 text-center py-2.5 text-sm font-medium text-surface bg-forest hover:bg-forest-hover rounded focus:outline-none focus:ring-2 focus:ring-forest"
          >
            Proceed to Log in
          </Link>
        </div>
      ) : (
        <>
          <form action={formAction} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-ink"
              >
                Full name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                required
                autoComplete="name"
                className="w-full h-11 px-3 text-sm bg-surface border border-rule rounded text-ink focus:outline-none focus:ring-2 focus:ring-forest"
                placeholder="Jane Doe"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-ink"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full h-11 px-3 text-sm bg-surface border border-rule rounded text-ink focus:outline-none focus:ring-2 focus:ring-forest"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-ink"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                className="w-full h-11 px-3 text-sm bg-surface border border-rule rounded text-ink focus:outline-none focus:ring-2 focus:ring-forest"
                aria-describedby="password-rules"
              />
              <p id="password-rules" className="text-xs text-ink-muted">
                At least 8 characters with both letters and numbers.
              </p>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-ink"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                className="w-full h-11 px-3 text-sm bg-surface border border-rule rounded text-ink focus:outline-none focus:ring-2 focus:ring-forest"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full h-11 px-4 text-sm font-medium text-surface bg-forest hover:bg-forest-hover rounded focus:outline-none focus:ring-2 focus:ring-forest transition-colors disabled:opacity-50"
            >
              {isPending ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-rule"></div>
            <span className="flex-shrink mx-3 text-xs text-ink-muted">or</span>
            <div className="flex-grow border-t border-rule"></div>
          </div>

          <GoogleSignInButton returnTo="/app" />

          <div className="pt-2 text-center text-sm text-ink-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-forest font-medium hover:underline focus:outline-none focus:underline"
            >
              Log in
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
