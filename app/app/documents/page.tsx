import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data: documents } = await supabase
    .from("user_documents")
    .select("id, display_name, document_type, expires_on, created_at")
    .order("created_at", { ascending: false });

  const hasDocs = documents && documents.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-ink-deep tracking-tight">
            Official Documents
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Uploaded transcripts, language certificates, and verified source documents.
          </p>
        </div>
      </div>

      {!hasDocs ? (
        <div className="glass-card rounded-3xl p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto my-6">
          <div className="w-14 h-14 rounded-2xl glass-badge-blue flex items-center justify-center font-bold text-xl mx-auto">
            &equiv;
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-heading font-bold text-ink-deep">No documents uploaded yet</h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              When you add applications, you can attach official prospectus guides and requirement PDFs. Extracted evidence will cite specific pages here.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/app/applications/new"
              className="inline-flex items-center justify-center h-10 px-5 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark rounded-xl shadow-md transition-colors"
            >
              Add an application first
            </Link>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden divide-y divide-glass-borderSubtle">
          {documents.map((doc) => (
            <div key={doc.id} className="p-4 flex items-center justify-between text-sm">
              <span className="font-semibold text-ink-deep">{doc.display_name}</span>
              <span className="text-xs text-ink-muted">{doc.document_type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
