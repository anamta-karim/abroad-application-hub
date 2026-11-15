import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { selectReminders, renderReminderEmail, type ReminderItem } from "@/lib/reminders";
import { isEmailConfigured, sendEmail } from "@/lib/email/resend";
import { todayString } from "@/lib/calendar";

/**
 * Daily email reminders, called by Vercel Cron (see vercel.json).
 *
 * Vercel sends "Authorization: Bearer <CRON_SECRET>"; anything else gets 401.
 * Add ?dryRun=1 to see what would be sent without sending or logging, and
 * &date=YYYY-MM-DD (dry runs only) to preview a future day.
 * Uses the service-role key because it reads every opted-in user's dates;
 * every query below is filtered by that user's id.
 */

export const maxDuration = 60;

const MAX_USERS_PER_RUN = 500;

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

function appUrl(request: NextRequest): string {
  return (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/+$/, "");
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";
  if (!dryRun && !isEmailConfigured()) {
    return NextResponse.json({ error: "Email sending is not configured (RESEND_API_KEY, REMINDER_FROM_EMAIL)." }, { status: 503 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured." }, { status: 503 });
  }
  const db = admin as any;

  const { data: optedIn, error: settingsError } = await db
    .from("reminder_settings")
    .select("user_id")
    .eq("email_enabled", true)
    .limit(MAX_USERS_PER_RUN);
  if (settingsError) {
    return NextResponse.json({ error: `Could not read reminder settings: ${settingsError.message}` }, { status: 500 });
  }

  // Dry runs may simulate another day (?dryRun=1&date=YYYY-MM-DD) to preview future emails
  const simulated = new URL(request.url).searchParams.get("date");
  const today = dryRun && simulated && /^\d{4}-\d{2}-\d{2}$/.test(simulated) ? simulated : todayString();
  const base = appUrl(request);
  const summary = {
    date: today,
    dryRun,
    usersChecked: 0,
    emailsSent: 0,
    usersWithNothingDue: 0,
    failures: [] as string[],
    preview: [] as { to: string; subject: string; items: string[] }[],
  };

  for (const { user_id: userId } of (optedIn || []) as { user_id: string }[]) {
    summary.usersChecked++;

    const [apps, tasks, reqs, openings, log, profile] = await Promise.all([
      db.from("applications").select("id, title, institution_or_provider, deadline, status, archived_at").eq("user_id", userId),
      db.from("tasks").select("id, application_id, title, due_date, status").eq("user_id", userId).not("due_date", "is", null),
      db.from("document_requirements").select("id, application_id, document_type, due_date, status").eq("user_id", userId),
      db.from("opening_reminders").select("id, title, expected_open_date, status").eq("user_id", userId).eq("status", "watching"),
      db.from("reminder_log").select("item_key").eq("user_id", userId),
      db.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    ]);

    const items: ReminderItem[] = selectReminders({
      apps: apps.data || [],
      tasks: tasks.data || [],
      requirements: reqs.data || [],
      openings: openings.data || [],
      today,
      alreadySent: new Set(((log.data || []) as { item_key: string }[]).map((l) => l.item_key)),
    });

    if (items.length === 0) {
      summary.usersWithNothingDue++;
      continue;
    }

    const { data: userData } = await admin.auth.admin.getUserById(userId);
    const email = userData?.user?.email;
    if (!email) {
      summary.failures.push(`${userId.slice(0, 8)}: no email address`);
      continue;
    }

    const message = renderReminderEmail(items, base, profile.data?.display_name);
    if (dryRun) {
      summary.preview.push({ to: maskEmail(email), subject: message.subject, items: items.map((i) => i.title) });
      continue;
    }

    const result = await sendEmail({ to: email, ...message });
    if (!result.ok) {
      summary.failures.push(`${maskEmail(email)}: ${result.error}`);
      continue;
    }
    summary.emailsSent++;

    // Record what was sent so the same reminder is never emailed twice
    const { error: logError } = await db
      .from("reminder_log")
      .upsert(items.map((i) => ({ user_id: userId, item_key: i.key, sent_on: today })), {
        onConflict: "user_id,item_key",
        ignoreDuplicates: true,
      });
    if (logError) summary.failures.push(`${maskEmail(email)}: sent, but log failed (${logError.message})`);
  }

  if (summary.failures.length > 0) console.warn("[reminders]", summary.failures.join(" | "));
  return NextResponse.json(summary);
}
