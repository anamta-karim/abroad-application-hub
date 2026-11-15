"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { submitFeedbackAction } from "@/app/app/feedback/actions";
import { runAction } from "@/lib/client/runAction";
import { InlineError } from "@/components/InlineError";

/** Floating "Feedback" button with a small form; notes go to the owner's inbox. */
export function FeedbackButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    textareaRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function openPanel() {
    setSent(false);
    setError(null);
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const err = await runAction(() => submitFeedbackAction(message, pathname));
      if (err) {
        setError(err);
      } else {
        setSent(true);
        setMessage("");
      }
    });
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div
          role="dialog"
          aria-label="Send feedback"
          className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl bg-white shadow-2xl border border-slate-200 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-heading font-bold text-ink-deep">Send feedback</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close feedback"
              className="w-7 h-7 rounded-full hover:bg-slate-100 text-ink-muted cursor-pointer"
            >
              ×
            </button>
          </div>

          {sent ? (
            <div className="space-y-3">
              <p className="text-sm text-teal-800">Thanks! Your feedback has been sent.</p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="text-xs font-bold text-brand hover:text-brand-dark cursor-pointer"
              >
                Send more
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <label htmlFor="feedback-message" className="block text-xs text-ink-muted">
                What&apos;s confusing, broken or missing? The page you&apos;re on is included automatically.
              </label>
              <textarea
                id="feedback-message"
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={2000}
                className="w-full p-3 text-sm glass-input rounded-xl text-ink-deep border border-slate-200"
              />
              <InlineError message={error} onDismiss={() => setError(null)} />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-ink-subtle">{message.length}/2000</span>
                <button
                  type="submit"
                  disabled={isPending || message.trim().length < 3}
                  className="h-9 px-4 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? "Sending…" : "Send"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-expanded={open}
        className="h-10 px-4 rounded-full text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark shadow-lg shadow-brand/30 hover:brightness-110 cursor-pointer"
      >
        {open ? "Close" : "Feedback"}
      </button>
    </div>
  );
}
