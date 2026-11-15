import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

/** Title only for owners, so the page doesn't reveal itself to anyone else. */
export async function generateMetadata() {
  const user = await getCurrentUser();
  return isAdminEmail(user?.email) ? { title: "Feedback inbox · AbroadAtlas" } : {};
}

interface FeedbackRow {
  id: string;
  user_id: string;
  page: string | null;
  message: string;
  created_at: string;
}

const PAGE_SIZE = 200;

/** Owner-only list of feedback notes. Everyone else gets a 404. */
export default async function FeedbackInboxPage() {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) notFound();

  let rows: FeedbackRow[] = [];
  let senders = new Map<string, string>();
  let problem: string | null = null;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    problem = "SUPABASE_SERVICE_ROLE_KEY isn't set, so feedback from other users can't be read.";
  } else {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("feedback")
      .select("id, user_id, page, message, created_at")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (error) {
      problem =
        error.code === "PGRST205" || error.code === "42P01"
          ? "The feedback table doesn't exist yet. Run the 20261117000000_usage_limits_and_feedback.sql migration."
          : error.message;
    } else {
      rows = data ?? [];
      const ids = [...new Set(rows.map((r) => r.user_id))];
      if (ids.length > 0) {
        const { data: profiles } = await admin.from("profiles").select("id, display_name").in("id", ids);
        senders = new Map((profiles ?? []).map((p) => [p.id, p.display_name || "Unnamed user"]));
      }
    }
  }

  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-extrabold text-ink-deep tracking-tight">Feedback inbox</h1>
        <p className="text-sm text-ink-muted mt-1 max-w-2xl">
          Notes sent with the Feedback button, newest first. Only accounts in ADMIN_EMAILS can see this page.
        </p>
      </div>

      {problem ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{problem}</div>
      ) : rows.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 text-sm text-ink-muted">No feedback yet.</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="glass-card rounded-2xl p-5 space-y-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                <span className="font-bold text-ink-deep">{senders.get(row.user_id) || "Unknown user"}</span>
                <span>{formatter.format(new Date(row.created_at))} UTC</span>
                {row.page && <code className="px-2 py-0.5 rounded-lg bg-slate-100 text-ink-deep">{row.page}</code>}
              </div>
              <p className="text-sm text-ink-deep whitespace-pre-wrap break-words">{row.message}</p>
            </li>
          ))}
        </ul>
      )}
      {rows.length === PAGE_SIZE && (
        <p className="text-xs text-ink-subtle">Showing the latest {PAGE_SIZE} notes.</p>
      )}
    </div>
  );
}
