# Connexa Dashboard — UX & Output-Quality Improvement Plan

## 1. Executive Summary

This plan addresses eight interconnected improvements to the brief-run-results lifecycle in the Connexa dashboard. The core issues are: (1) results require a full page reload to appear after a run completes because the brief detail page is a Next.js server component with no client-side re-fetch mechanism, (2) clarifying questions are gated behind a confidence threshold that is too generous—most briefs exceed 0.75 and skip straight to the pipeline, (3) confidence scores are dominated by the `extraction_confidence` field from the LLM extraction step which defaults to 0.5 and is rarely calibrated, (4) the "Improve Brief" tips card is static and not mode-aware, (5) the brief summary renders raw JSON key-value pairs, and (6) re-run has no modal for adjusting parameters. The plan sequences changes smallest-risk-first: UI-only deletions and copy changes first, then state/data-flow fixes, then new features (re-run modal, weak-model summary).

---

## 2. Repo Findings

### Key Files & Components

**Brief creation flow:**
- `src/app/(dashboard)/brief/new/page.tsx` — mode selector entry point
- `src/components/brief/mode-selector.tsx` — Simple / Detailed tab switcher
- `src/components/brief/simple-brief-form.tsx` — freeform prompt → normalize → (optional clarify) → pipeline start
- `src/components/brief/detailed-brief-form.tsx` — structured form → normalize → (optional clarify) → pipeline start
- `src/components/brief/clarification-renderer.tsx` — renders clarification questions as radio groups
- `src/components/brief/low-confidence-tips.tsx` — static "Improve This Brief" card (amber)
- `src/components/brief/brief-status-badge.tsx` — status pill (draft/clarifying/running/complete/failed)

**API routes:**
- `src/app/api/brief/normalize/route.ts` — POST: LLM normalize + heuristic fallback + confidence estimation
- `src/app/api/brief/clarify/route.ts` — POST: generate 1-5 clarification questions via LLM
- `src/app/api/pipeline/start/route.ts` — POST: create run record, fire-and-forget `runPipeline()`
- `src/app/api/pipeline/status/[runId]/route.ts` — GET: poll run status, confidence, notes, queries

**Pipeline (server-only):**
- `src/lib/pipeline/orchestrator.ts` — `runPipeline()` — 8-step async pipeline
- `src/lib/pipeline/query-plan.ts` — LLM generates Tavily search queries
- `src/lib/pipeline/tavily.ts` — `tavilySearch()` / `tavilyExtract()` wrappers
- `src/lib/pipeline/triage.ts` — dedup + domain-block + shortlist
- `src/lib/pipeline/extract.ts` — LLM structured extraction (STRONG model)
- `src/lib/pipeline/score.ts` — `scoreCandidates()` — breakdown + weighted score + confidence
- `src/lib/pipeline/rank.ts` — sort + top-5 selection

**Results display:**
- `src/app/(dashboard)/brief/[id]/page.tsx` — **server component** — fetches brief, latest run, results from Supabase; renders everything server-side
- `src/components/results/result-card.tsx` — per-result card (score badge, services, reasoning, contact)
- `src/components/results/score-breakdown.tsx` — horizontal bar chart per dimension
- `src/components/results/reasoning-panel.tsx` — expandable detailed reasoning (detailed mode only)
- `src/components/results/contact-suggestion.tsx` — email / contact URL / website fallback

**Pipeline execution UI:**
- `src/components/pipeline/run-status-poller.tsx` — client component; polls `/api/pipeline/status/` every 2.5s
- `src/components/pipeline/rerun-button.tsx` — calls POST `/api/pipeline/start`, then `router.refresh()`
- `src/components/pipeline/pipeline-steps.tsx` — step checklist with icons

**Shared:**
- `src/lib/schemas.ts` — all Zod schemas (`NormalizedBriefSchema`, `ScoredResultSchema`, etc.)
- `src/lib/constants.ts` — `MODELS`, `CONFIDENCE`, `DEFAULT_BRIEF_WEIGHTS`, `MISS_REASONS`
- `src/lib/openrouter.ts` — `callOpenRouter()` wrapper
- `src/types/index.ts` — inferred TypeScript types from schemas

### Current Flow (text diagram)

```
[User] --submit--> SimpleBriefForm / DetailedBriefForm
         |
         v
   POST /api/brief/normalize  (LLM or heuristic → NormalizedBrief + confidence)
         |
         |-- confidence >= 0.75 --> POST /api/pipeline/start --> runPipeline() (fire-and-forget)
         |                                                          |
         |                                                          v
         |                                                   [8-step pipeline]
         |                                                          |
         |                                                   Writes results to DB
         |                                                          |
         |                                                   Updates run.status = "complete"/"failed"
         |
         |-- confidence < 0.75 --> POST /api/brief/clarify --> ClarificationRenderer
                                                                    |
                                                              User answers questions
                                                                    |
                                                              Merge answers into normalized_brief
                                                                    |
                                                              POST /api/pipeline/start --> ...

[Brief Detail Page] (server component)
   - Fetches brief, latest run, results on initial render
   - RunStatusPoller polls run status every 2.5s (client)
   - Results only update on full page reload (router.refresh)
   - RerunButton: POST /api/pipeline/start → router.refresh()
```

### Key Diagnostic Findings

1. **Clarifying questions rarely appear** because `estimateConfidence()` in `normalize/route.ts` has a base of 0.45 and easily reaches 0.75+ with any moderately-specified prompt. The detailed form adds +0.05 for `structured_input`, pushing it even higher. The threshold `CONFIDENCE.NORMALIZE_MIN_FOR_DIRECT_RUN = 0.75` is too easy to clear.

2. **Confidence on results is low** because `extraction_confidence` from `extract.ts` defaults to 0.5 in the `CandidateSchema` and the LLM extraction prompt doesn't instruct the model to produce calibrated confidence. In `score.ts` line 116, `confidence = Math.max(0.2, Math.min(1, candidate.extraction_confidence))` just passes through this uncalibrated value. The pipeline-level confidence (orchestrator line 107-110) averages these per-result values, so if most extractions default to 0.5, the overall will hover near 0.5—right at the `MIN_FOR_SUCCESS` boundary, causing frequent "failed" statuses.

3. **Results don't auto-refresh** because `brief/[id]/page.tsx` is a server component. The `RunStatusPoller` tracks run progress but has no callback to signal "run finished, re-fetch results." The page data is only re-fetched when `router.refresh()` is called manually.

4. **"State" field is missing** from the detailed form entirely. The `NormalizedBriefSchema` has `geography.region` (a string) but no US-state-level granularity. The detailed form's "Region" input is freeform text.

5. **Brief summary** uses `renderBriefSummary()` in `brief/[id]/page.tsx` lines 66-81 which iterates `Object.entries(normalizedBrief)` and renders raw JSON via `JSON.stringify(value)` for non-string values.

6. **`OPENROUTER_WEAK_MODEL`** does not exist in the codebase. Only `MODELS.CHEAP` and `MODELS.STRONG` are defined in `constants.ts`. A new model constant is needed.

---

## 3. Proposed Changes

### A) Re-run Popup (Post-Run)

**Current:** `RerunButton` (`src/components/pipeline/rerun-button.tsx`) is a plain button that calls `POST /api/pipeline/start` with the existing `brief_id`. No options, no modal. The pipeline re-uses the existing `normalized_brief` and `weights` from the briefs table.

**Target:** Clicking "Re-run" opens a Dialog with adjustable options before starting the pipeline:
1. **Mode override** — switch between simple/detailed (updates `brief.mode` before re-running).
2. **Tone / verbosity** — toggle "Ask clarifying questions" (forces clarification flow even if confidence is high).
3. **Constraint tweaks** — editable constraints list (pre-populated from `normalized_brief.constraints`).
4. **Geography override** — text input pre-populated from `normalized_brief.geography.region`.

**Files impacted:**
- `src/components/pipeline/rerun-button.tsx` — replace simple button with Dialog trigger; rename to or co-locate with new `RerunDialog`.
- `src/app/api/pipeline/start/route.ts` — accept optional `overrides: { mode?, force_clarify?, constraints?, geography_region? }` in request body. Apply overrides to brief before starting pipeline.
- `src/lib/schemas.ts` — add `RerunOverridesSchema` for validation.

**Steps:**
1. Create `RerunOverridesSchema` in `schemas.ts` with optional fields: `mode`, `force_clarify`, `constraints`, `geography_region`.
2. Modify `rerun-button.tsx`: wrap existing button in a `Dialog` from `@/components/ui/dialog`. Show form fields pre-populated from the brief's current values. On submit, POST to `/api/pipeline/start` with `{ brief_id, overrides }`.
3. Modify `start/route.ts`: if `overrides` present, update the briefs row (mode, normalized_brief fields) before calling `runPipeline()`. If `force_clarify` is true, redirect through the clarification flow instead of starting the pipeline directly.
4. Pass `normalizedBrief` and `mode` as props to `RerunButton` from `brief/[id]/page.tsx` so the dialog can pre-populate.

**Acceptance criteria:**
- Clicking "Re-run" opens a modal with pre-filled values from the current brief.
- Submitting the modal with changed values updates the brief row and starts a new pipeline run.
- Submitting with no changes behaves identically to the current re-run.
- "Force clarification" toggle causes the clarification flow to appear (navigates to a clarification step or shows inline).

**Risks:**
- Overriding mode from "simple" to "detailed" on a brief that was originally simple may produce a sparse `normalized_brief`. Mitigation: only allow mode override if the brief has sufficient structured data; otherwise show a warning.

---

### B) Clarifying Questions Asked More Often

**Current:** Clarification questions are generated only when `normalizePayload.confidence < CONFIDENCE.NORMALIZE_MIN_FOR_DIRECT_RUN (0.75)`. The `estimateConfidence()` function in `normalize/route.ts` (lines 67-75) has a base of 0.45 and adds +0.1 for each of 5 signals plus +0.05 for structured input. A detailed brief with all fields filled easily reaches 0.85-0.95. Result: clarifications almost never trigger.

**Diagnosis:** The threshold is correct in concept, but the confidence estimator is too generous. With industry, service_type > 3 chars, budget spread, non-Global geography, and prompt > 120 chars, you get 0.45 + 0.5 = 0.95. Even a minimal simple prompt of 121 chars with "healthcare" gets 0.45 + 0.1 + 0.1 + 0.1 = 0.75 — exactly at the boundary.

**Target:** Clarification questions should appear in ~40-60% of submissions, not ~5%.

**Fix — two changes:**

1. **Lower the threshold** in `constants.ts`: change `NORMALIZE_MIN_FOR_DIRECT_RUN` from `0.75` to `0.85`. This raises the bar for skipping clarification.

2. **Tighten the confidence estimator** in `normalize/route.ts` `estimateConfidence()`:
   - Reduce base from 0.45 to 0.35.
   - Add a check: if `constraints.length === 0`, subtract 0.05 (no constraints = less confident).
   - Add a check: if `optional` is empty or missing company context, subtract 0.05.
   - Result: a well-specified detailed brief might reach 0.80, still below the new 0.85 threshold, triggering clarification. A rich brief with constraints and company context reaches 0.85+, skipping clarification.

3. **Policy rule** (enforced in prompt + server):
   - "Ask up to 3 clarifying questions when confidence < 0.85 or when any of: constraints are empty, budget range is default/wide (spread > 5x), or geography is 'Global'."
   - "Skip questions when confidence >= 0.85 AND constraints are non-empty AND budget is specific."
   - Enforce in both `simple-brief-form.tsx` (line 108) and `detailed-brief-form.tsx` (line 215) — these already check the threshold, so just changing the constant propagates.

**Files impacted:**
- `src/lib/constants.ts` — change `NORMALIZE_MIN_FOR_DIRECT_RUN` to 0.85.
- `src/app/api/brief/normalize/route.ts` — modify `estimateConfidence()` to be stricter.

**Acceptance criteria:**
- A simple brief with only a service type and industry triggers clarification.
- A detailed brief with all fields filled but no constraints triggers clarification.
- A detailed brief with constraints, specific budget, specific geography, and company context skips clarification.

**Risks:**
- Over-correction: too many clarification prompts annoy users. Mitigation: monitor via the `brief_questions` table; if >80% of briefs trigger clarification, raise the threshold slightly.

---

### C) "Detailed" Should Include "State" as an Option

**Current:** The detailed form (`detailed-brief-form.tsx`) has a "Region" text input (line 348-355) that maps to `geography.region` in `NormalizedBriefSchema`. There is no "State" field. Users type freeform text like "United States" or "North America."

**Target:** Add a "State (US)" select dropdown to the detailed form. It should:
- Appear only when region contains "United States" or "US".
- Store the value in `geography.state` (new field) or `optional.us_state`.
- Flow into the pipeline prompt so geo scoring can use it.

**Preferred approach:** Use `optional.us_state` to avoid changing `NormalizedBriefSchema.geography` shape (which would require migration of existing briefs).

**Files impacted:**
- `src/components/brief/detailed-brief-form.tsx` — add state Select below Region, conditionally visible. Add `const [usState, setUsState] = useState("")`. In `buildNormalizedFromForm()`, add `us_state` to `optional`. In `buildPrompt()`, add `State: ${usState || "Not specified"}`.
- `src/lib/pipeline/query-plan.ts` — include `optional.us_state` in the search query prompt if present.
- `src/lib/pipeline/score.ts` — in `scoreGeoFit()`, if `brief.optional.us_state` is set, boost score when candidate geography contains that state name.

**Steps:**
1. Add a `usState` state variable and a `Select` component with all 50 US states + DC to the detailed form, shown only when `region` includes "United States" or "US".
2. In `buildNormalizedFromForm()`, set `optional.us_state: usState || null`.
3. In `buildPrompt()`, append `US State: ${usState}` when set.
4. In `query-plan.ts`, check for `normalized.optional?.us_state` and include it in search queries.
5. In `score.ts` `scoreGeoFit()`, if `brief.optional?.us_state` is a string, check if candidate geography includes it for a tighter geo match.

**Acceptance criteria:**
- State dropdown appears only in Detailed mode when region is US-related.
- Selected state flows into normalized brief, search queries, and geo scoring.
- Existing briefs without `optional.us_state` continue to work unchanged.

**Risks:**
- Minor: state-level filtering may reduce candidate pool significantly. This is expected behavior.

---

### D) Low-Confidence Output Problem

**Current:**
- Per-result confidence comes from `candidate.extraction_confidence` (schema default: 0.5), clamped to [0.2, 1.0] in `score.ts` line 116.
- The `CandidateSchema` in `schemas.ts` line 85 has `.default(0.5)` for `extraction_confidence`.
- The LLM extraction prompt (`extract.ts`) asks the model to extract structured data but gives no guidance on how to set `extraction_confidence`.
- Pipeline-level confidence = average of per-result confidences (orchestrator lines 107-110).
- If average < 0.5, the entire run is marked "failed" (orchestrator line 134-136).
- Result: most results have confidence ~0.5, and runs frequently fall below the 0.5 threshold.

**Target — two-pronged fix:**

**Product-level change:**
1. Replace the single confidence number with a **confidence tier** system:
   - **High** (0.75-1.0): "Strong evidence found for this match"
   - **Medium** (0.50-0.74): "Partial evidence; some fields inferred"
   - **Low** (0.20-0.49): "Limited evidence; results may be approximate"
2. Display as a colored badge (green/amber/red) instead of a raw percentage.
3. Add a "Confidence drivers" tooltip showing which signals contributed (e.g., "Website confirmed services", "Pricing found", "Industry match verified").

**Prompt/pipeline change:**
1. In `extract.ts`, update the extraction prompt to include explicit guidance for `extraction_confidence`:
   ```
   Set extraction_confidence between 0 and 1 based on:
   - 0.9+ : Company name, services, AND pricing/portfolio confirmed on page
   - 0.7-0.89 : Company name and services confirmed, other fields inferred
   - 0.5-0.69 : Only company name confirmed, services partially inferred
   - 0.3-0.49 : Most fields inferred from limited page content
   - Below 0.3 : Very little evidence found
   ```
2. In `score.ts`, compute a **deterministic confidence boost** based on field completeness:
   ```
   base = candidate.extraction_confidence
   if (candidate.services.length > 0) base += 0.05
   if (candidate.pricing_signals) base += 0.05
   if (candidate.portfolio_signals?.length > 0) base += 0.05
   if (candidate.geography) base += 0.03
   if (candidate.contact?.email || candidate.contact?.contact_url) base += 0.02
   confidence = clamp(base, 0.2, 1.0)
   ```
3. Lower `CONFIDENCE.MIN_FOR_SUCCESS` from `0.5` to `0.40`. This prevents well-scored runs from being marked "failed" solely because extraction confidence was default.

**Files impacted:**
- `src/lib/constants.ts` — lower `MIN_FOR_SUCCESS` to 0.40.
- `src/lib/pipeline/extract.ts` — add confidence calibration rubric to the LLM prompt.
- `src/lib/pipeline/score.ts` — add deterministic confidence boost logic in `scoreCandidates()`.
- `src/components/results/result-card.tsx` — replace raw percentage with tier badge + tooltip.
- `src/components/pipeline/run-status-poller.tsx` — update confidence display to use tier label.

**Acceptance criteria:**
- Extraction confidence varies meaningfully across results (not all ~0.5).
- Runs with partial but useful results are marked "complete" not "failed".
- UI shows confidence as "High/Medium/Low" badge with color coding.

**Risks:**
- Prompt change may not immediately produce well-calibrated values across all models. Mitigation: the deterministic boost provides a floor; monitor and adjust the rubric.

---

### E) Remove the "Low Confidence — This Search is Marked as Failed" Card

**Current:** In `brief/[id]/page.tsx` lines 202-208, an amber `Card` with text "Low confidence - this search is marked as failed." is rendered when `isLowConfidenceFailure` is true. Below it, `LowConfidenceTips` (lines 210) shows a separate improvement tips card.

**Target:** Remove the amber "marked as failed" card entirely. Keep the `LowConfidenceTips` component but restyle it as a subtle inline hint (not a full card).

**Files impacted:**
- `src/app/(dashboard)/brief/[id]/page.tsx` — delete lines 202-208 (the amber Card). Keep `isLowConfidenceFailure` for the tips and the results opacity.
- `src/components/brief/low-confidence-tips.tsx` — change from Card to a compact inline `div` with a smaller font and no amber background. Use `text-muted-foreground` styling.

**Steps:**
1. In `brief/[id]/page.tsx`, remove the `{isLowConfidenceFailure ? (<Card ...> ... </Card>) : null}` block (lines 202-208).
2. In `low-confidence-tips.tsx`, replace the `Card` wrapper with a `div className="rounded-md border border-dashed p-3"`. Change text color from `text-amber-900` to `text-muted-foreground`. Keep the `AlertTriangle` icon but make it smaller.

**Acceptance criteria:**
- The "Low confidence - this search is marked as failed" card no longer appears anywhere.
- The tips still appear below the status section as a subtle hint when confidence is low.
- The `BriefStatusBadge` still shows "failed" status — that behavior is unchanged.

**Risks:** None. Pure UI deletion.

---

### F) Improve Brief Copy Differs by Mode

**Current:** `LowConfidenceTips` (`low-confidence-tips.tsx`) is a static component. It always shows 4 bullets including "If you used Simple mode, try Detailed mode for more control." regardless of the current brief's mode.

**Target:**
- **Simple mode:** Show only "If you used Simple mode, try Detailed mode for more control."
- **Detailed mode:** Do not show that bullet. Show mode-appropriate tips like "Try adding more specific constraints" and "Narrow your geography to a specific state."

**Files impacted:**
- `src/components/brief/low-confidence-tips.tsx` — accept a `mode: BriefMode` prop. Conditionally render tips.
- `src/app/(dashboard)/brief/[id]/page.tsx` — pass `brief.mode` to `<LowConfidenceTips mode={brief.mode} />`.

**Steps:**
1. Add `mode: BriefMode` to `LowConfidenceTips` props.
2. In the component body:
   - If `mode === "simple"`: render only the single bullet "If you used Simple mode, try Detailed mode for more control."
   - If `mode === "detailed"`: render tips like "Add more specific constraints", "Narrow geography to a state", "Provide portfolio requirements."
3. Update the call site in `brief/[id]/page.tsx` line 210: `<LowConfidenceTips mode={brief.mode} />`.

**Acceptance criteria:**
- Simple-mode failed briefs show the "try Detailed mode" message only.
- Detailed-mode failed briefs show actionable tips without the "try Detailed mode" line.

**Risks:** None. Copy-only change.

---

### G) Brief Summary Card: Human-Readable + Weak-Model Summary

**Current:** The "Brief Summary" card in `brief/[id]/page.tsx` uses `renderBriefSummary()` (lines 66-81) which iterates `Object.entries(normalizedBrief)` and renders each value with `JSON.stringify(value)` for non-strings. Nested objects like `budget_range` and `timeline` appear as raw JSON.

**Target:**
1. Replace `renderBriefSummary()` with a human-readable card layout that formats each field nicely (e.g., budget as "$10,000 - $100,000 USD", timeline as "3 months (duration)", geography as "United States, remote OK").
2. Add a 2-5 sentence AI summary below the structured fields, generated by `OPENROUTER_WEAK_MODEL` (a new env var; defaults to the same as `MODELS.CHEAP`).
3. The summary must take in the entire `normalized_brief` and produce human-readable prose.
4. Summary loads progressively with a skeleton state. Cached by brief ID to avoid repeated calls.

**Files impacted:**
- `src/lib/constants.ts` — add `MODELS.WEAK: process.env.OPENROUTER_WEAK_MODEL ?? process.env.OPENROUTER_CHEAP_MODEL ?? "openai/gpt-4o-mini"`.
- `src/app/api/brief/summarize/route.ts` — **new** API route: POST, accepts `{ brief_id, normalized_brief }`, calls weak model, returns `{ summary: string }`. Caches summary in the `briefs` table (add `ai_summary` column or use `optional.ai_summary`).
- `src/app/(dashboard)/brief/[id]/page.tsx` — replace `renderBriefSummary()` with a new `BriefSummaryCard` component. Add an inline client component for the AI summary with loading state.
- `src/components/brief/brief-summary-card.tsx` — **new** server component that formats `NormalizedBrief` fields into human-readable layout.
- `src/components/brief/ai-summary.tsx` — **new** client component that fetches `/api/brief/summarize` on mount, shows skeleton while loading, then displays the summary text. Uses brief ID as cache key.

**Steps:**
1. Add `WEAK` to `MODELS` in `constants.ts`.
2. Create `POST /api/brief/summarize` route:
   - Accept `{ brief_id, normalized_brief }`.
   - Check if brief already has `ai_summary` in its `optional` field (cache hit).
   - If not, call `callOpenRouter()` with `MODELS.WEAK` and a prompt: "Summarize this B2B sourcing brief in 2-5 sentences for a human reader: {JSON}".
   - Store result in `briefs.normalized_brief.optional.ai_summary`.
   - Return `{ summary }`.
3. Create `BriefSummaryCard` component:
   - Accept `normalizedBrief: NormalizedBrief`.
   - Format fields: service_type as title, budget as currency range, timeline as human text, industries as badge list, geography as "Region, remote OK/not OK", constraints as bullet list.
4. Create `AiSummary` client component:
   - Accept `briefId: string, normalizedBrief: unknown`.
   - On mount, POST to `/api/brief/summarize`.
   - Show `Skeleton` while loading, then display summary paragraph.
5. Replace the current Brief Summary Card section in `brief/[id]/page.tsx` with `<BriefSummaryCard>` + `<AiSummary>`.

**Acceptance criteria:**
- Brief summary shows formatted fields (no raw JSON visible).
- AI summary appears within 2-3 seconds with a skeleton placeholder.
- Reloading the page returns the cached summary instantly (no re-call to the weak model).
- Budget displays as "$10,000 - $100,000 USD", not `{"min":10000,"max":100000,"currency":"USD"}`.

**Risks:**
- Weak model API call adds latency to the page. Mitigation: runs in a client component (non-blocking), caches result in DB.
- No `OPENROUTER_WEAK_MODEL` env var set. Mitigation: defaults to `MODELS.CHEAP`.

---

### H) Results Section Auto-Refresh on Run Completion

**Current:** `brief/[id]/page.tsx` is a server component. Results are fetched server-side at render time. `RunStatusPoller` polls status every 2.5s but has no mechanism to trigger a re-fetch of results when the run transitions to "complete" or "failed." The user must manually refresh the page.

**Target:** When the run status transitions from "running" to "complete"/"failed", results appear automatically without a full page reload.

**Approach:** The `RunStatusPoller` already detects when `status` changes from "running" to a terminal state. Add a callback prop `onRunFinished` that triggers `router.refresh()` (Next.js App Router server component re-render). This is the simplest change because the page is a server component—`router.refresh()` re-runs the server component data fetching without a full browser reload.

**Files impacted:**
- `src/components/pipeline/run-status-poller.tsx` — add `onRunFinished?: () => void` prop. In the `useEffect` that updates status, detect the transition from "running" to terminal and call `onRunFinished()`.
- `src/app/(dashboard)/brief/[id]/page.tsx` — wrap results section in a client boundary. Create a small client wrapper component (`BriefDetailClient`) that holds `RunStatusPoller` and calls `router.refresh()` on run completion.

**Detailed approach:**
1. Extract the client-interactive parts of `brief/[id]/page.tsx` into a new client component `src/components/brief/brief-detail-client.tsx`:
   - Receives `briefId`, `latestRun`, `initialResults`, `brief` as props.
   - Renders `RunStatusPoller` with `onRunFinished` callback.
   - Renders `RerunButton`.
   - When `onRunFinished` fires, calls `router.refresh()` which triggers the server component to re-render with fresh data.
2. Modify `RunStatusPoller`:
   - Add prop `onRunFinished?: () => void`.
   - Track previous status in a ref. When status transitions from "running" to "complete"/"failed", call `onRunFinished?.()`.
   - Add a small delay (500ms) before calling to allow the DB write to propagate.

**Steps:**
1. In `run-status-poller.tsx`, add `onRunFinished` prop and transition detection:
   ```ts
   const prevStatusRef = useRef(initialStatus)
   useEffect(() => {
     if (prevStatusRef.current === "running" && status !== "running") {
       setTimeout(() => onRunFinished?.(), 500)
     }
     prevStatusRef.current = status
   }, [status, onRunFinished])
   ```
2. Create `src/components/brief/brief-detail-client.tsx` — a `"use client"` component that wraps `RunStatusPoller` and `RerunButton`, calls `router.refresh()` on run completion.
3. In `brief/[id]/page.tsx`, replace the inline `RunStatusPoller` and `RerunButton` usage with `<BriefDetailClient>`.

**Acceptance criteria:**
- When a pipeline run completes, the results section updates within ~3 seconds without any user action.
- No full browser page reload occurs (no white flash, scroll position preserved).
- Works for both initial runs and re-runs.

**Risks:**
- `router.refresh()` re-renders the entire server component tree, which may cause a brief flicker. Mitigation: React's streaming/Suspense should handle this gracefully. Test and add a transition if needed.
- Race condition: `router.refresh()` fires before results are committed to DB. Mitigation: the 500ms delay + the pipeline writes results before updating run status.

---

## 4. Sequencing

### Phase 1 — Low-risk UI changes (E, F)
**Rationale:** Pure UI deletions and copy changes. No backend changes. Can be verified visually.
1. **(E)** Remove the "low confidence failed" card.
2. **(F)** Make "Improve Brief" tips mode-aware.

### Phase 2 — Data flow fix (H)
**Rationale:** Fixes the most impactful UX issue (manual page refresh). Required foundation for testing subsequent changes.
3. **(H)** Auto-refresh results on run completion.

### Phase 3 — Confidence calibration (D, B)
**Rationale:** These are coupled—fixing confidence scoring (D) changes which runs are "failed," and fixing clarification frequency (B) changes how many runs reach the pipeline. Do them together.
4. **(D)** Fix low-confidence output problem.
5. **(B)** Make clarifying questions appear more often.

### Phase 4 — New features (C, A, G)
**Rationale:** Additive features that build on the improved pipeline.
6. **(C)** Add "State" field to Detailed mode.
7. **(A)** Build re-run popup modal.
8. **(G)** Human-readable brief summary + weak-model AI summary.

---

## 5. Test Plan

### Unit Tests
- **Confidence estimator** (`normalize/route.ts`): test that a minimal prompt scores below 0.85; test that a fully-specified detailed brief with constraints scores above 0.85.
- **Deterministic confidence boost** (`score.ts`): test that a candidate with all fields populated gets a higher confidence than one with defaults.
- **Confidence tier mapping**: test High/Medium/Low badge assignment for boundary values (0.74 → Medium, 0.75 → High, etc.).

### Integration Tests
- **Clarification flow**: submit a simple brief with <100 chars → verify clarification questions appear. Submit a detailed brief with all fields + constraints → verify pipeline starts directly.
- **Re-run modal**: open modal, change geography, submit → verify new run uses updated geography.
- **Brief summary API**: POST to `/api/brief/summarize` with a valid brief → verify summary is 2-5 sentences. POST again → verify cached response (no second LLM call).

### E2E Tests
- **Auto-refresh flow**: create a brief → submit → wait for pipeline to complete → verify results appear without any manual action. Use a mock pipeline that completes in 5 seconds.
- **Clarifying questions → submit → results**: full end-to-end with clarifications.
- **Mode-aware tips**: create a simple brief that fails → verify "try Detailed mode" tip. Create a detailed brief that fails → verify state-specific tips.

### Manual QA Checklist
- [ ] "Re-run" button opens modal with correct pre-populated values.
- [ ] Submitting re-run modal starts new pipeline and results appear automatically.
- [ ] Brief summary card shows no raw JSON.
- [ ] AI summary loads with skeleton and displays within 3 seconds.
- [ ] "Low confidence - this search is marked as failed" card is gone.
- [ ] Tips card in Simple mode shows "try Detailed" only.
- [ ] Tips card in Detailed mode shows actionable tips (no "try Detailed").
- [ ] State dropdown appears in Detailed form when region includes "United States."
- [ ] Clarification questions appear for sparse briefs.
- [ ] Confidence displays as High/Medium/Low badge.

---

## 6. Rollback Plan

Each phase is independently reversible:

- **Phase 1 (E, F):** Revert the two component files (`low-confidence-tips.tsx`, `brief/[id]/page.tsx`). No data changes.
- **Phase 2 (H):** Revert `run-status-poller.tsx` and remove `brief-detail-client.tsx`. The page returns to requiring manual refresh.
- **Phase 3 (D, B):** Revert `constants.ts`, `normalize/route.ts`, `extract.ts`, `score.ts`, `result-card.tsx`. Runs will go back to the old confidence model. Previously "complete" runs that were "failed" under the old model won't change retroactively (DB data persists).
- **Phase 4 (C, A, G):** Remove the state Select from `detailed-brief-form.tsx`. Remove the re-run Dialog from `rerun-button.tsx`. Delete `api/brief/summarize/route.ts`, `brief-summary-card.tsx`, `ai-summary.tsx`. Revert `brief/[id]/page.tsx` to use the old `renderBriefSummary()`.

**Git strategy:** One feature branch per phase. Merge to main only after QA passes. Tag each merge for easy revert with `git revert`.
