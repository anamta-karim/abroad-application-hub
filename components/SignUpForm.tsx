"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction, type AuthActionResult } from "@/app/auth/actions";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

const initialState: AuthActionResult = {};

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUpAction, initialState);

  return (
    <div className="w-full max-w-md glass-stage rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="space-y-1.5">
        <Link
          href="/"
          className="text-xs font-semibold text-ink-muted hover:text-brand transition-colors inline-block"
        >
          &larr; Back to home
        </Link>
        <h1 className="text-2xl font-heading font-extrabold tracking-tight text-ink-deep">
          Create your account
        </h1>
        <p className="text-xs text-ink-muted">
          Your applications and source documents will remain private to this account.
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
            Proceed to Log in
          </Link>
        </div>
      ) : (
        <>
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="displayName"
                className="block text-xs font-bold text-ink-deep font-heading"
              >
                Full name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                required
                autoComplete="name"
                className="w-full h-11 px-3.5 text-xs glass-input rounded-xl"
                placeholder="Jane Doe"
              />
            </div>

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

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-bold text-ink-deep font-heading"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                className="w-full h-11 px-3.5 text-xs glass-input rounded-xl"
                aria-describedby="password-rules"
              />
              <p id="password-rules" className="text-[11px] text-ink-subtle">
                At least 8 characters with both letters and numbers.
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-bold text-ink-deep font-heading"
              >
                Confirm password
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
              {isPending ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-glass-borderSubtle"></div>
            <span className="flex-shrink mx-3 text-xs font-semibold text-ink-subtle">or</span>
            <div className="flex-grow border-t border-glass-borderSubtle"></div>
          </div>

          <GoogleSignInButton />

          <div className="pt-2 text-center text-xs text-ink-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-brand font-bold hover:underline"
            >
              Log in
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
