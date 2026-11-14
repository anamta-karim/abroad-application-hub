/**
 * Runs a server action from an event handler and returns a user-facing error
 * message, or null if it succeeded. Covers both failure modes:
 *  - the action returned { error } (validation, database or permission error)
 *  - the call threw (network drop, server crash, timeout)
 * Next.js navigation signals (redirect / notFound) are re-thrown untouched.
 */
export const NETWORK_ERROR_MESSAGE = "Couldn't reach the server. Check your connection and try again.";

export async function runAction(action: () => Promise<unknown>): Promise<string | null> {
  try {
    const result = await action();
    return extractError(result);
  } catch (err) {
    if (isNextNavigationSignal(err)) throw err;
    return NETWORK_ERROR_MESSAGE;
  }
}

export function extractError(result: unknown): string | null {
  if (result && typeof result === "object" && "error" in result) {
    const message = (result as { error?: unknown }).error;
    if (typeof message === "string" && message.trim()) return message;
  }
  return null;
}

/** redirect() and notFound() throw errors whose digest starts with NEXT_. */
export function isNextNavigationSignal(err: unknown): boolean {
  const digest = (err as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_");
}
