"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction, type AuthActionResult } from "@/app/auth/actions";

const initialState: AuthActionResult = {};

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState);

  return (
    <div className="w-full max-w-md bg-surface border border-rule rounded p-6 sm:p-8 space-y-6">
      <div className="space-y-1">
        <Link
          href="/login"
          className="text-xs text-ink-muted hover:text-forest focus:outline-none focus:underline"
        >
          Back to log in
        </Link>
        <h1 className="text-2xl font-bold text-ink">Reset password</h1>
        <p className="text-sm text-ink-muted">
          Enter your email address to receive instructions to reset your password.
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
            Return to Log in
          </Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
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

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-11 px-4 text-sm font-medium text-surface bg-forest hover:bg-forest-hover rounded focus:outline-none focus:ring-2 focus:ring-forest transition-colors disabled:opacity-50"
          >
            {isPending ? "Sending reset link..." : "Send reset link"}
          </button>
        </form>
      )}
    </div>
  );
}
