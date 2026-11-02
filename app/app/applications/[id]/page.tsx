import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusSelect } from "@/components/StatusSelect";
import { RequirementList } from "@/components/RequirementList";
import { TaskList } from "@/components/TaskList";
import { LinkedApplications } from "@/components/LinkedApplications";
import { DeleteApplicationButton } from "@/components/DeleteApplicationButton";
import { ArchiveButton } from "@/components/ArchiveButton";
import { SourceManager } from "@/components/SourceManager";
import { FactReviewPanel } from "@/components/FactReviewPanel";
import { ApplicationPrepHub } from "@/components/ApplicationPrepHub";

interface ApplicationDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch application record
  const { data: application, error: appError } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .single();

  if (appError || !application) {
    notFound();
  }

  // 2. Fetch document requirements
  const { data: requirements } = await supabase
    .from("document_requirements")
    .select("id, document_type, notes, due_date, status")
    .eq("application_id", id)
    .order("created_at", { ascending: true });

  // 3. Fetch tasks
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, description, due_date, status")
    .eq("application_id", id)
    .order("created_at", { ascending: true });

  // 4. Fetch status history
  const { data: statusHistory } = await supabase
    .from("status_history")
    .select("id, from_status, to_status, note, changed_at")
    .eq("application_id", id)
    .order("changed_at", { ascending: false });

  // 5. Fetch linked applications
  const isProgram = application.record_type === "program";

  let linkedAppsFormatted: any[] = [];
  if (isProgram) {
    const { data: links } = await supabase
      .from("application_links")
      .select("id, relationship_note, scholarship:scholarship_application_id (id, title, record_type, institution_or_provider, status)")
      .eq("program_application_id", id);

    if (links) {
      linkedAppsFormatted = links.map((l: any) => ({
        linkId: l.id,
        id: l.scholarship?.id,
        title: l.scholarship?.title,
        record_type: l.scholarship?.record_type,
        institution_or_provider: l.scholarship?.institution_or_provider,
        status: l.scholarship?.status,
        relationship_note: l.relationship_note,
      })).filter((x: any) => x.id);
    }
  } else {
    const { data: links } = await supabase
      .from("application_links")
      .select("id, relationship_note, program:program_application_id (id, title, record_type, institution_or_provider, status)")
      .eq("scholarship_application_id", id);

    if (links) {
      linkedAppsFormatted = links.map((l: any) => ({
        linkId: l.id,
        id: l.program?.id,
        title: l.program?.title,
        record_type: l.program?.record_type,
        institution_or_provider: l.program?.institution_or_provider,
        status: l.program?.status,
        relationship_note: l.relationship_note,
      })).filter((x: any) => x.id);
    }
  }

  // 6. Fetch sources and extracted facts
  const { data: sourcesData } = await supabase
    .from("sources")
    .select("id, source_type, display_name, source_url, storage_path, file_size_bytes, ingestion_status, error_code, created_at")
    .eq("application_id", id)
    .order("created_at", { ascending: false });

  const sources = (sourcesData || []) as any[];

  const { data: factsData } = await supabase
    .from("extracted_facts")
    .select("id, fact_type, label, value, confidence, review_state, created_at")
    .eq("application_id", id)
    .order("created_at", { ascending: false });

  const facts = (factsData || []) as any[];

  // 7. Fetch available apps to link (opposite record type)
  const targetRecordType = isProgram ? "scholarship" : "program";
  const { data: oppositeApps } = await supabase
    .from("applications")
    .select("id, title, record_type, institution_or_provider")
    .eq("record_type", targetRecordType);

  const linkedIds = new Set(linkedAppsFormatted.map((a) => a.id));
  const availableAppsToLink = (oppositeApps || []).filter((a) => !linkedIds.has(a.id));

  // Compute deadline countdown
  let deadlineCountdown = null;
  if (application.deadline) {
    const now = new Date();
    const dDate = new Date(application.deadline);
    const diffDays = Math.ceil((dDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    deadlineCountdown =
      diffDays === 0
        ? "Due today"
        : diffDays === 1
        ? "Due tomorrow"
        : diffDays > 1
        ? `${diffDays} days remaining`
        : `${Math.abs(diffDays)} days ago`;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* ── Breadcrumb & Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-glass-borderSubtle">
        <Link
          href="/app"
          className="text-xs font-semibold text-ink-muted hover:text-brand transition-colors inline-flex items-center gap-1.5"
        >
          &larr; Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <ArchiveButton
            applicationId={id}
            isArchived={Boolean(application.archived_at)}
          />
          <Link
            href={`/app/applications/${id}/edit`}
            className="px-3.5 py-1.5 text-xs font-bold text-ink-deep glass-input rounded-xl hover:bg-white transition-colors"
          >
            Edit Application
          </Link>
          <DeleteApplicationButton
            applicationId={id}
            applicationTitle={application.title}
          />
        </div>
      </div>

      {/* ── Header Hero Surface ── */}
      <section className="glass-stage rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span
                className={`badge ${
                  isProgram ? "glass-badge-blue" : "glass-badge-teal"
                } text-xs font-bold uppercase tracking-wider`}
              >
                {application.record_type}
              </span>
              <span className="text-xs text-ink-muted font-medium">
                Added {new Date(application.created_at).toLocaleDateString()}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-ink-deep tracking-tight">
              {application.title}
            </h1>

            {application.institution_or_provider && (
              <p className="text-base text-ink font-semibold">
                {application.institution_or_provider}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-muted pt-1">
              {application.degree_level && (
                <span><strong>Degree:</strong> {application.degree_level}</span>
              )}
              {application.field_of_study && (
                <span><strong>Field:</strong> {application.field_of_study}</span>
              )}
              {application.country && (
                <span><strong>Country:</strong> {application.country}</span>
              )}
              {application.study_period && (
                <span><strong>Intake / Period:</strong> {application.study_period}</span>
              )}
            </div>
          </div>

          {/* Deadline Pill */}
          {application.deadline && (
            <div className="glass-card rounded-2xl p-4 text-center sm:text-right flex-shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle block font-heading">
                Deadline
              </span>
              <div className="text-xl font-heading font-extrabold text-brand-dark mt-0.5">
                {new Date(application.deadline).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <span className="text-xs font-bold text-ink-deep mt-0.5 block">
                {deadlineCountdown}
              </span>
            </div>
          )}
        </div>

        {/* Status Switcher Row */}
        <div className="pt-4 border-t border-glass-borderSubtle flex flex-wrap items-center justify-between gap-4">
          <StatusSelect
            applicationId={id}
            currentStatus={application.status}
          />

          {application.official_url && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-muted">Official Portal:</span>
              <a
                href={application.official_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1"
              >
                <span>Open Official Site</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          )}
        </div>
      </section>

      {/* ── User Notes / Summary ── */}
      {application.user_notes && (
        <section className="glass-card rounded-2xl p-5 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted font-heading">
            Personal Notes
          </h2>
          <p className="text-sm text-ink-deep leading-relaxed whitespace-pre-line">
            {application.user_notes}
          </p>
        </section>
      )}

      {/* ── Official Source Materials ── */}
      <section className="glass-stage rounded-3xl p-6 sm:p-8">
        <SourceManager
          applicationId={id}
          sources={sources}
        />
      </section>

      {/* ── Grounded Prep Studio & Q&A ── */}
      <section className="glass-stage rounded-3xl p-6 sm:p-8">
        <ApplicationPrepHub
          applicationId={id}
          hasSources={sources.length > 0}
        />
      </section>

      {/* ── Source-Grounded Facts & Verification ── */}
      <section className="glass-stage rounded-3xl p-6 sm:p-8">
        <FactReviewPanel
          applicationId={id}
          facts={facts}
        />
      </section>

      {/* ── Document Requirements Checklist ── */}
      <section className="glass-stage rounded-3xl p-6 sm:p-8">
        <RequirementList
          applicationId={id}
          initialRequirements={requirements || []}
        />
      </section>

      {/* ── Tasks Checklist ── */}
      <section className="glass-stage rounded-3xl p-6 sm:p-8">
        <TaskList
          applicationId={id}
          initialTasks={tasks || []}
        />
      </section>

      {/* ── Linked Programs / Scholarships ── */}
      <section className="glass-stage rounded-3xl p-6 sm:p-8">
        <LinkedApplications
          currentAppId={id}
          currentRecordType={application.record_type}
          linkedApps={linkedAppsFormatted}
          availableAppsToLink={availableAppsToLink}
        />
      </section>

      {/* ── Status History Log ── */}
      {statusHistory && statusHistory.length > 0 && (
        <section className="glass-card rounded-2xl p-5 sm:p-6 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted font-heading">
            Status History
          </h2>
          <div className="divide-y divide-glass-borderSubtle">
            {statusHistory.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-ink-deep capitalize">
                    {item.to_status.replace("_", " ")}
                  </span>
                  {item.note && (
                    <span className="text-ink-muted ml-2">&bull; {item.note}</span>
                  )}
                </div>
                <span className="text-ink-subtle">
                  {new Date(item.changed_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
