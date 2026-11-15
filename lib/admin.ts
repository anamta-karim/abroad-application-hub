/**
 * App owner(s): accounts listed in ADMIN_EMAILS (comma-separated) can open
 * owner-only pages such as the feedback inbox. Empty or unset = nobody.
 */
export function isAdminEmail(email: string | null | undefined, list: string | undefined = process.env.ADMIN_EMAILS): boolean {
  if (!email) return false;
  const admins = (list || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.trim().toLowerCase());
}
