import { notFound } from "next/navigation"

import { PrintTrigger } from "@/components/export/print-trigger"
import { createClient } from "@/lib/supabase/server"

export default async function ExportBriefPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: brief } = await supabase
    .from("briefs")
    .select("id, mode, status, normalized_brief, weights, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!brief) notFound()

  const { data: runs } = await supabase
    .from("runs")
    .select("id, status, confidence_overall, notes, search_queries, created_at")
    .eq("brief_id", brief.id)
    .order("created_at", { ascending: false })
    .limit(1)

  const latestRun = runs?.[0] ?? null

  const { data: results } = latestRun
    ? await supabase
        .from("results")
        .select(
          "company_name, website_url, score_overall, confidence, reasoning_summary, services, industries, geography",
        )
        .eq("run_id", latestRun.id)
        .order("score_overall", { ascending: false })
    : { data: [] as Array<Record<string, unknown>> }

  const serviceType =
    brief.normalized_brief && typeof brief.normalized_brief === "object" && "service_type" in brief.normalized_brief
      ? String((brief.normalized_brief as { service_type?: unknown }).service_type ?? "Brief")
      : "Brief"

  return (
    <div className="export-print-root mx-auto max-w-4xl space-y-6 bg-white p-8 text-black">
      <PrintTrigger />
      <div className="no-print rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Print dialog should open automatically. If it does not, use your browser&apos;s Print command.
      </div>

      <header className="space-y-2 border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold">Connexa Brief Export</h1>
        <p className="text-sm text-slate-600">{serviceType}</p>
        <p className="text-xs text-slate-500">Brief ID: {brief.id}</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Brief Metadata</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <p>Mode: {brief.mode}</p>
          <p>Status: {brief.status}</p>
          <p>Created: {new Date(brief.created_at).toLocaleString()}</p>
          <p>Updated: {new Date(brief.updated_at).toLocaleString()}</p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Latest Run</h2>
        {latestRun ? (
          <div className="space-y-2 text-sm">
            <p>Run ID: {latestRun.id}</p>
            <p>Status: {latestRun.status}</p>
            <p>Confidence: {latestRun.confidence_overall ?? "n/a"}</p>
            {Array.isArray(latestRun.notes) && latestRun.notes.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5">
                {latestRun.notes
                  .filter((note): note is string => typeof note === "string")
                  .map((note) => (
                    <li key={note}>{note}</li>
                  ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-600">No run available.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Results</h2>
        {results && results.length > 0 ? (
          <div className="space-y-3">
            {results.map((result, index) => (
              <article key={`${String(result.company_name)}-${index}`} className="rounded-md border border-slate-200 p-3">
                <h3 className="font-medium">{String(result.company_name)}</h3>
                <p className="text-sm text-slate-600">{String(result.website_url)}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700">
                  <p>Score: {String(result.score_overall)}</p>
                  <p>Confidence: {String(result.confidence)}</p>
                  <p>Geography: {String(result.geography ?? "n/a")}</p>
                </div>
                <p className="mt-2 text-sm">{String(result.reasoning_summary ?? "")}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600">No results available.</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Normalized Brief JSON</h2>
        <pre className="overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
          {JSON.stringify(brief.normalized_brief, null, 2)}
        </pre>
      </section>
    </div>
  )
}
