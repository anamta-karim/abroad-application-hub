"use client";

/** Small dismissible error message for failed actions. Renders nothing when message is null. */
export function InlineError({
  message,
  onDismiss,
  className = "",
}: {
  message: string | null;
  onDismiss?: () => void;
  className?: string;
}) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={`flex items-start justify-between gap-3 p-3 text-xs rounded-xl bg-red-50 border border-red-200 text-red-800 font-medium ${className}`}
    >
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="shrink-0 text-red-700 hover:text-red-900 text-sm font-bold leading-none cursor-pointer"
        >
          ×
        </button>
      )}
    </div>
  );
}
