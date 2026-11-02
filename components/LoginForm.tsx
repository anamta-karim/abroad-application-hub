"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, type AuthActionResult } from "@/app/auth/actions";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

const initialState: AuthActionResult = {};

interface LoginFormProps {
  returnTo?: string;
  bannerMessage?: string | null;
}

export function LoginForm({ returnTo = "/app", bannerMessage }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(signInAction, initialState);

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
          Welcome back
        </h1>
        <p className="text-xs text-ink-muted">
          Sign in to your study-abroad personal workspace.
        </p>
      </div>

      {bannerMessage && (
        <div
          className="p-3 text-xs rounded-xl glass-badge-teal font-medium"
          role="alert"
        >
          {bannerMessage}
        </div>
      )}

      {state?.error && (
        <div
          className="p-3 text-xs rounded-xl bg-red-50/80 border border-red-200 text-red-800 font-medium"
          role="alert"
        >
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="returnTo" value={returnTo} />

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
          <div className="flex justify-between items-center">
            <label
              htmlFor="password"
              className="block text-xs font-bold text-ink-deep font-heading"
            >
              Password
            </label>
            <Link
              href="/reset-password"
              className="text-xs font-semibold text-brand hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full h-11 px-3.5 text-xs glass-input rounded-xl"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full h-11 px-4 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark hover:from-brand-hover hover:to-brand rounded-xl shadow-md shadow-brand/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="relative flex py-1 items-center">
        <div className="flex-grow border-t border-glass-borderSubtle"></div>
        <span className="flex-shrink mx-3 text-xs font-semibold text-ink-subtle">or</span>
        <div className="flex-grow border-t border-glass-borderSubtle"></div>
      </div>

      <GoogleSignInButton returnTo={returnTo} />

      <div className="pt-2 text-center text-xs text-ink-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-brand font-bold hover:underline"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
