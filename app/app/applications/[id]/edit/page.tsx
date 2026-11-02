import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditApplicationForm } from "@/components/EditApplicationForm";

interface EditApplicationPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditApplicationPage({ params }: EditApplicationPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: application, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !application) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb Header */}
      <div className="space-y-1">
        <div className="flex items-center space-x-2 text-xs font-semibold text-ink-muted">
          <Link href="/app" className="hover:text-ink-deep transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <Link href={`/app/applications/${application.id}`} className="hover:text-ink-deep transition-colors truncate max-w-[200px]">
            {application.title}
          </Link>
          <span>/</span>
          <span className="text-ink-deep">Edit</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-ink-deep tracking-tight">
          Edit Application
        </h1>
        <p className="text-xs sm:text-sm text-ink-muted">
          Update core metadata, deadline milestones, and target study intake.
        </p>
      </div>

      {/* Frosted Glass Form Container */}
      <div className="glass-card rounded-[28px] p-6 sm:p-10 shadow-lg">
        <EditApplicationForm application={application} />
      </div>
    </div>
  );
}
