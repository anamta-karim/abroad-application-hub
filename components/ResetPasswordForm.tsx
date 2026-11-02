"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction, type AuthActionResult } from "@/app/auth/actions";

const initialState: AuthActionResult = {};

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState);

  return (
    <div className="w-full max-w-md glass-stage rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="space-y-1.5">
        <Link
          href="/login"
          className="text-xs font-semibold text-ink-muted hover:text-brand transition-colors inline-block"
        >
          &larr; Back to sign in
        </Link>
        <h1 className="text-2xl font-heading font-extrabold tracking-tight text-ink-deep">
          Reset password
        </h1>
        <p className="text-xs text-ink-muted">
          Enter your email address to receive password reset instructions.
        </p>
      </div>

      {state?.error && (
        <div
          className="p-3 text-xs rounded-xl bg-red-50/80 border border-red-200 text-red-800 font-medium"
          role="alert"
        >
          {state.error}
        </div>
      )}

      {state?.success ? (
        <div className="space-y-4">
          <div
            className="p-3.5 text-xs rounded-xl glass-badge-teal font-medium"
            role="status"
          >
            {state.message}
          </div>
          <Link
            href="/login"
            className="block w-full h-11 text-center py-3 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark hover:from-brand-hover hover:to-brand rounded-xl shadow-md shadow-brand/20 active:scale-95 transition-all"
          >
            Return to Log in
          </Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-bold text-ink-deep font-heading"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full h-11 px-3.5 text-xs glass-input rounded-xl"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-11 px-4 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark hover:from-brand-hover hover:to-brand rounded-xl shadow-md shadow-brand/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isPending ? "Sending reset email..." : "Send reset instructions"}
          </button>
        </form>
      )}
    </div>
  );
}
