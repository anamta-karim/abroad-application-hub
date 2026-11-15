"use client";

import { useState, useTransition } from "react";
import { createSampleApplicationAction } from "@/app/app/applications/sample-actions";
import { runAction } from "@/lib/client/runAction";
import { InlineError } from "@/components/InlineError";

/** One-click sample application (fictional data) for exploring the app. */
export function SampleApplicationButton({ variant = "secondary" }: { variant?: "secondary" | "link" }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function create() {
    setError(null);
    startTransition(async () => {
      // On success the action redirects to the new sample application
      const err = await runAction(() => createSampleApplicationAction());
      if (err) setError(err);
    });
  }

  return (
    <span className="inline-flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={create}
        disabled={isPending}
        className={
          variant === "link"
            ? "text-xs font-bold text-brand hover:text-brand-dark disabled:opacity-60 cursor-pointer"
            : "inline-flex items-center justify-center h-12 px-6 text-sm font-bold text-brand-dark bg-white/80 border border-brand/30 hover:bg-brand-soft rounded-xl transition-colors disabled:opacity-60 cursor-pointer"
        }
      >
        {isPending ? "Creating sample…" : "Try a sample application"}
      </button>
      <InlineError message={error} onDismiss={() => setError(null)} />
    </span>
  );
}
