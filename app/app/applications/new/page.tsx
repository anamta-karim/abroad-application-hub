import Link from "next/link";
import { NewApplicationForm } from "@/components/NewApplicationForm";

export default function NewApplicationPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <Link
          href="/app"
          className="text-xs font-semibold text-ink-muted hover:text-brand transition-colors inline-block"
        >
          &larr; Back to Dashboard
        </Link>
        <h1 className="text-3xl font-heading font-extrabold text-ink-deep tracking-tight">
          Add Application
        </h1>
        <p className="text-sm text-ink-muted">
          Add a target university program or scholarship application to your workspace.
        </p>
      </div>

      <div className="glass-stage rounded-3xl p-6 sm:p-8">
        <NewApplicationForm />
      </div>
    </div>
  );
}
