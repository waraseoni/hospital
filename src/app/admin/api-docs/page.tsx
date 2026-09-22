import { PageContainer, PageHeader } from "@/components/ui/page";
import { BookOpen } from "lucide-react";
import openapi from "../../../../public/openapi.json";

interface OpenApiDoc {
  openapi: string;
  info: { title: string; version: string };
  tags: { name: string; description?: string }[];
  paths: Record<string, Record<string, { summary?: string; tags?: string[] }>>;
}

const spec = openapi as unknown as OpenApiDoc;

const methodColors: Record<string, string> = {
  get: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  post: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  put: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  patch: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  delete: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

export default function AdminApiDocsPage() {
  const paths = Object.entries(spec.paths);

  return (
    <PageContainer>
      <PageHeader
        title="API Documentation"
        actions={
          <a
            href="/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20"
          >
            <BookOpen size={14} />
            openapi.json
          </a>
        }
      />
      <p className="mb-6 text-sm text-muted-foreground">
        OpenAPI 3.0.3 spec — {Object.keys(spec.paths).length} endpoints. Auth: session cookie (Supabase SSO).
        `/api/fhir/*` ko machine access ke liye static token (`FHIR_API_TOKEN`) se bhi guard kiya ja sakta hai.
      </p>

      <div className="hidden md:flex items-center gap-3 rounded-t-xl border border-border bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground">
        <span className="w-16 shrink-0">Method</span>
        <span className="w-1/3">Path</span>
        <span className="flex-1">Summary</span>
        <span className="w-32 shrink-0">Tag</span>
      </div>

      <div className="rounded-xl border border-border bg-card md:border-t-0 md:rounded-t-none divide-y divide-border max-h-[70vh] overflow-y-auto">
        {paths.map(([path, methods]) =>
          Object.entries(methods).map(([method, op]) => (
            <div key={`${method}-${path}`} className="flex flex-col md:flex-row md:items-center gap-1.5 px-4 py-3">
              <span className={`inline-flex w-16 shrink-0 justify-center rounded-md px-2 py-0.5 text-xs font-bold uppercase ${methodColors[method] || "bg-gray-500/15 text-gray-500"}`}>
                {method}
              </span>
              <code className="w-1/3 shrink-0 truncate font-mono text-sm">{path}</code>
              <span className="flex-1 text-sm text-muted-foreground">{op.summary || ""}</span>
              <span className="w-32 shrink-0 text-xs text-muted-foreground">{op.tags?.[0] || ""}</span>
            </div>
          ))
        )}
      </div>
    </PageContainer>
  );
}