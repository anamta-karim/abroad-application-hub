import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { AccountDataManagement } from "@/components/AccountDataManagement";
import { CalendarFeedSettings } from "@/components/CalendarFeedSettings";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, updated_at")
    .eq("id", user?.id || "")
    .single();

  // Private calendar feed (table added by 20261115000000_calendar_feeds.sql)
  const { data: feedData, error: feedError } = await supabase
    .from("calendar_feeds" as any)
    .select("token")
    .eq("user_id", user?.id || "")
    .maybeSingle();
  const feed = feedData as { token: string } | null;
  const feedMigrationMissing = Boolean(
    feedError && (feedError.code === "PGRST205" || feedError.code === "42P01")
  );

  // Public origin for the feed link (respects the deployment's host)
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="pb-2">
        <h1 className="text-3xl font-heading font-extrabold text-ink-deep tracking-tight">
          Account Settings
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          Manage your personal workspace profile, offline data archive, and privacy controls.
        </p>
      </div>

      <div className="glass-stage rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="space-y-4">
          <h2 className="font-heading font-bold text-base text-ink-deep">User Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-xl glass-input">
              <span className="text-xs text-ink-muted block">Display Name</span>
              <span className="font-bold text-ink-deep mt-0.5 block">
                {profile?.display_name || user?.user_metadata?.full_name || "Applicant"}
              </span>
            </div>
            <div className="p-4 rounded-xl glass-input">
              <span className="text-xs text-ink-muted block">Email Address</span>
              <span className="font-bold text-ink-deep mt-0.5 block truncate">
                {user?.email}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-glass-borderSubtle space-y-4">
          <h2 className="font-heading font-bold text-base text-ink-deep">Calendar Sync</h2>
          <CalendarFeedSettings
            initialToken={feed?.token ?? null}
            origin={origin}
            migrationMissing={feedMigrationMissing}
          />
        </div>

        <div className="pt-6 border-t border-glass-borderSubtle space-y-4">
          <h2 className="font-heading font-bold text-base text-ink-deep">Data Retention &amp; Management</h2>
          <AccountDataManagement />
        </div>

        <div className="pt-6 border-t border-glass-borderSubtle space-y-3">
          <h2 className="font-heading font-bold text-base text-ink-deep">Data Privacy Architecture</h2>
          <p className="text-xs text-ink-muted leading-relaxed">
            Every application, uploaded document, and extracted fact is strictly isolated to your user account using PostgreSQL Row Level Security. All processing runs within free-tier limits without commercial third-party trackers. Private files are protected with short-lived signed URLs.
          </p>
        </div>
      </div>
    </div>
  );
}
