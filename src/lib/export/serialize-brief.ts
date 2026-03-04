type BriefExportInput = {
  brief: {
    id: string
    mode: "simple" | "detailed"
    status: "draft" | "clarifying" | "running" | "complete" | "failed" | "cancelled"
    normalized_brief: unknown
    weights: unknown
    created_at?: string
    updated_at?: string
  }
  run: {
    id: string
    status: "running" | "complete" | "failed" | "cancelled"
    confidence_overall: number | null
    notes: string[]
    search_queries?: string[]
    created_at?: string
  } | null
  results: Array<{
    company_name: string
    website_url: string
    contact_url?: string | null
    contact_email?: string | null
    geography?: string | null
    services?: string[]
    industries?: string[]
    score_overall: number
    score_breakdown: Record<string, number>
    reasoning_summary: string
    confidence: number
  }>
}

type BriefExportEnvelope = {
  version: "connexa.export.v1"
  exported_at: string
  type: "brief"
  data: BriefExportInput
}

function escapeYaml(value: string): string {
  return `"${value.replaceAll("\"", "\\\"")}"`
}

export function toBriefExportEnvelope(input: BriefExportInput): BriefExportEnvelope {
  return {
    version: "connexa.export.v1",
    exported_at: new Date().toISOString(),
    type: "brief",
    data: input,
  }
}

export function serializeBriefAsJson(input: BriefExportInput): string {
  return JSON.stringify(toBriefExportEnvelope(input), null, 2)
}

export function serializeBriefAsMarkdown(input: BriefExportInput): string {
  const envelope = toBriefExportEnvelope(input)
  const run = input.run
  const normalized = JSON.stringify(input.brief.normalized_brief, null, 2)
  const weights = JSON.stringify(input.brief.weights, null, 2)
  const notes = run?.notes ?? []
  const queries = run?.search_queries ?? []

  const resultBlocks = input.results.length
    ? input.results
        .map((result, index) => {
          const services = (result.services ?? []).join(", ")
          const industries = (result.industries ?? []).join(", ")
          return [
            `### ${index + 1}. ${result.company_name}`,
            `- Score: ${result.score_overall}/100`,
            `- Confidence: ${Math.round(result.confidence * 100)}%`,
            `- Website: ${result.website_url}`,
            result.contact_url ? `- Contact URL: ${result.contact_url}` : null,
            result.contact_email ? `- Contact Email: ${result.contact_email}` : null,
            result.geography ? `- Geography: ${result.geography}` : null,
            services ? `- Services: ${services}` : null,
            industries ? `- Industries: ${industries}` : null,
            `- Summary: ${result.reasoning_summary}`,
          ]
            .filter(Boolean)
            .join("\n")
        })
        .join("\n\n")
    : "No results available."

  return [
    "---",
    `version: ${escapeYaml(envelope.version)}`,
    `exported_at: ${escapeYaml(envelope.exported_at)}`,
    `type: ${escapeYaml(envelope.type)}`,
    `brief_id: ${escapeYaml(input.brief.id)}`,
    `brief_mode: ${escapeYaml(input.brief.mode)}`,
    `brief_status: ${escapeYaml(input.brief.status)}`,
    `run_id: ${escapeYaml(run?.id ?? "none")}`,
    `run_status: ${escapeYaml(run?.status ?? "none")}`,
    `results_count: ${input.results.length}`,
    "---",
    "",
    "# Connexa Brief Export",
    "",
    "## Brief",
    "",
    `- ID: ${input.brief.id}`,
    `- Mode: ${input.brief.mode}`,
    `- Status: ${input.brief.status}`,
    "",
    "### Normalized Brief",
    "",
    "```json",
    normalized,
    "```",
    "",
    "### Weights",
    "",
    "```json",
    weights,
    "```",
    "",
    "## Latest Run",
    "",
    run
      ? `- ID: ${run.id}\n- Status: ${run.status}\n- Confidence: ${run.confidence_overall ?? "n/a"}`
      : "No run available.",
    "",
    notes.length > 0 ? "### Run Notes" : "",
    notes.length > 0 ? notes.map((note) => `- ${note}`).join("\n") : "",
    "",
    queries.length > 0 ? "### Search Queries" : "",
    queries.length > 0 ? queries.map((query) => `- ${query}`).join("\n") : "",
    "",
    "## Results",
    "",
    resultBlocks,
  ]
    .filter((line) => line !== null)
    .join("\n")
}
