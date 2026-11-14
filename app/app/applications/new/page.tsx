import Link from "next/link";
import { NewApplicationForm, type NewApplicationPrefill } from "@/components/NewApplicationForm";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = sp[key];
  const s = (Array.isArray(v) ? v[0] : v)?.trim();
  return s ? s.slice(0, 300) : undefined;
}

export default async function NewApplicationPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  // Optional pre-fill from Discover (e.g. "Add a program here" on a university result)
  const recordType = readParam(sp, "recordType");
  const officialUrl = readParam(sp, "officialUrl");
  const prefill: NewApplicationPrefill = {
    title: readParam(sp, "title"),
    recordType: recordType === "scholarship" || recordType === "program" ? recordType : undefined,
    institution: readParam(sp, "institution"),
    country: readParam(sp, "country"),
    degreeLevel: readParam(sp, "degreeLevel"),
    officialUrl: officialUrl && /^https?:\/\//i.test(officialUrl) ? officialUrl : undefined,
  };
  const hasPrefill = Boolean(prefill.institution || prefill.title);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <Link
          href={hasPrefill ? "/app/discover?tab=universities" : "/app"}
          className="text-xs font-semibold text-ink-muted hover:text-brand transition-colors inline-block"
        >
          &larr; {hasPrefill ? "Back to Discover" : "Back to Dashboard"}
        </Link>
        <h1 className="text-3xl font-heading font-extrabold text-ink-deep tracking-tight">
          Add Application
        </h1>
        <p className="text-sm text-ink-muted">
          {hasPrefill
            ? `Pre-filled from Discover${prefill.institution ? ` for ${prefill.institution}` : ""}. Add the program name and your deadline.`
            : "Add a target university program or scholarship application to your workspace."}
        </p>
      </div>

      <div className="glass-stage rounded-3xl p-6 sm:p-8">
        <NewApplicationForm prefill={prefill} />
      </div>
    </div>
  );
}
