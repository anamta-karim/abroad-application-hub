"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updatePasswordAction, type AuthActionResult } from "@/app/auth/actions";

const initialState: AuthActionResult = {};

export function UpdatePasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePasswordAction, initialState);

  return (
    <div className="w-full max-w-md glass-stage rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-heading font-extrabold tracking-tight text-ink-deep">
          Set new password
        </h1>
        <p className="text-xs text-ink-muted">
          Choose a new secure password for your account.
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

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-xs font-bold text-ink-deep font-heading"
          >
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            className="w-full h-11 px-3.5 text-xs glass-input rounded-xl"
            aria-describedby="new-password-rules"
          />
          <p id="new-password-rules" className="text-[11px] text-ink-subtle">
            At least 8 characters with both letters and numbers.
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="confirmPassword"
            className="block text-xs font-bold text-ink-deep font-heading"
          >
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            className="w-full h-11 px-3.5 text-xs glass-input rounded-xl"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full h-11 px-4 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark hover:from-brand-hover hover:to-brand rounded-xl shadow-md shadow-brand/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isPending ? "Updating password..." : "Update password"}
        </button>
      </form>
    </div>
  );
}
