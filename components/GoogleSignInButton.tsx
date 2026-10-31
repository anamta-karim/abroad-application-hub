"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface GoogleSignInButtonProps {
  returnTo?: string;
}

export function GoogleSignInButton({ returnTo = "/app" }: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const supabase = createClient();
      const origin = window.location.origin;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(returnTo)}`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Authentication failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isLoading}
        className="w-full h-11 px-4 text-sm font-medium text-ink bg-surface border border-rule rounded hover:bg-paper focus:outline-none focus:ring-2 focus:ring-forest transition-colors disabled:opacity-50 text-center"
      >
        {isLoading ? "Connecting to Google..." : "Continue with Google"}
      </button>
      {errorMessage && (
        <p className="mt-2 text-xs text-error" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
