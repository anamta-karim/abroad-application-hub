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
    <div className="w-full max-w-md bg-surface border border-rule rounded p-6 sm:p-8 space-y-6">
      <div className="space-y-1">
        <Link
          href="/"
          className="text-xs text-ink-muted hover:text-forest focus:outline-none focus:underline"
        >
          Back to home
        </Link>
        <h1 className="text-2xl font-bold text-ink">Log in to your workspace</h1>
        <p className="text-sm text-ink-muted">
          Enter your email and password to access your applications.
        </p>
      </div>

      {bannerMessage && (
        <div
          className="p-3 text-xs bg-paper border border-warning text-ink rounded"
          role="alert"
        >
          {bannerMessage}
        </div>
      )}

      {state?.error && (
        <div
          className="p-3 text-xs bg-paper border border-error text-error rounded"
          role="alert"
        >
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="returnTo" value={returnTo} />

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
          <div className="flex justify-between items-center">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-ink"
            >
              Password
            </label>
            <Link
              href="/reset-password"
              className="text-xs text-forest hover:underline focus:outline-none focus:underline"
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
            className="w-full h-11 px-3 text-sm bg-surface border border-rule rounded text-ink focus:outline-none focus:ring-2 focus:ring-forest"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full h-11 px-4 text-sm font-medium text-surface bg-forest hover:bg-forest-hover rounded focus:outline-none focus:ring-2 focus:ring-forest transition-colors disabled:opacity-50"
        >
          {isPending ? "Logging in..." : "Log in"}
        </button>
      </form>

      <div className="relative flex py-1 items-center">
        <div className="flex-grow border-t border-rule"></div>
        <span className="flex-shrink mx-3 text-xs text-ink-muted">or</span>
        <div className="flex-grow border-t border-rule"></div>
      </div>

      <GoogleSignInButton returnTo={returnTo} />

      <div className="pt-2 text-center text-sm text-ink-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-forest font-medium hover:underline focus:outline-none focus:underline"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
