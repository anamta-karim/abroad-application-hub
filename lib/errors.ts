/** Message of a caught value ("" if it has none), for `catch (err)` blocks. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err && typeof err.message === "string") return err.message;
  return typeof err === "string" ? err : "";
}

/** Name of a caught error ("" if it has none), e.g. "AbortError". */
export function errorName(err: unknown): string {
  if (typeof err === "object" && err !== null && "name" in err && typeof err.name === "string") return err.name;
  return "";
}
