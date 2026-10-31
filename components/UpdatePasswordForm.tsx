"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updatePasswordAction, type AuthActionResult } from "@/app/auth/actions";

const initialState: AuthActionResult = {};

export function UpdatePasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePasswordAction, initialState);

  return (
    <div className="w-full max-w-md bg-surface border border-rule rounded p-6 sm:p-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-ink">Set new password</h1>
        <p className="text-sm text-ink-muted">
          Choose a new password for your account.
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

      <form action={formAction} className="space-y-4">
        <div className="space-y-1">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-ink"
          >
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            className="w-full h-11 px-3 text-sm bg-surface border border-rule rounded text-ink focus:outline-none focus:ring-2 focus:ring-forest"
            aria-describedby="new-password-rules"
          />
          <p id="new-password-rules" className="text-xs text-ink-muted">
            At least 8 characters with both letters and numbers.
          </p>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-ink"
          >
            Confirm new password
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
          {isPending ? "Updating password..." : "Update password and continue"}
        </button>
      </form>

      <div className="pt-2 text-center text-sm text-ink-muted">
        <Link
          href="/login"
          className="text-forest hover:underline focus:outline-none focus:underline"
        >
          Cancel and return to log in
        </Link>
      </div>
    </div>
  );
}
