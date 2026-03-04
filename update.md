# Connexa Dashboard — Implementation Plan

## 1. Codebase Discovery

### Framework & Stack
- **Next.js 16.1.6** (App Router), **React 19.2.3**, **TypeScript**
- **Supabase** (PostgreSQL + Auth + RLS)
- **shadcn/ui** + **Tailwind CSS v4** (dark theme, indigo accents)
- **Zod** for validation schemas (`src/lib/schemas.ts`)
- **OpenRouter** for LLM calls, **Exa** for search, **Firecrawl** for scraping

### Key Files Map

| Area | File(s) |
|------|---------|
| New Brief page | `src/app/(dashboard)/brief/new/page.tsx` |
| Brief detail page | `src/app/(dashboard)/brief/[id]/page.tsx` |
| History page | `src/app/(dashboard)/history/page.tsx` |
| History row component | `src/components/dashboard/brief-list-item.tsx` |
| Sidebar | `src/components/dashboard/sidebar.tsx` |
| Topbar (header + user dropdown) | `src/components/dashboard/topbar.tsx` |
| Dashboard layout | `src/app/(dashboard)/layout.tsx` |
| Rerun button + dialog | `src/components/pipeline/rerun-button.tsx` |
| Run status poller | `src/components/pipeline/run-status-poller.tsx` |
| Clarification renderer | `src/components/brief/clarification-renderer.tsx` |
| Result card | `src/components/results/result-card.tsx` |
| Score breakdown | `src/components/results/score-breakdown.tsx` |
| Reasoning panel | `src/components/results/reasoning-panel.tsx` |
| Contact suggestion | `src/components/results/contact-suggestion.tsx` |
| Brief summary card | `src/components/brief/brief-summary-card.tsx` |
| Pipeline orchestrator | `src/lib/pipeline/orchestrator.ts` |
| Pipeline start API | `src/app/api/pipeline/start/route.ts` |
| Pipeline status API | `src/app/api/pipeline/status/[runId]/route.ts` |
| Normalize API | `src/app/api/brief/normalize/route.ts` |
| Clarify API | `src/app/api/brief/clarify/route.ts` |
| Clarify submit API | `src/app/api/brief/clarify/submit/route.ts` |
| Schemas (Zod) | `src/lib/schemas.ts` |
| Constants | `src/lib/constants.ts` |
| Type definitions | `src/types/index.ts`, `src/types/database.ts` |
| Supabase clients | `src/lib/supabase/{server,client,admin}.ts` |

### Database Tables (Supabase)

- **briefs**: `id, user_id, mode ("simple"|"detailed"), raw_prompt, normalized_brief (jsonb), weights (jsonb), status ("draft"|"clarifying"|"running"|"complete"|"failed"), created_at, updated_at`
- **runs**: `id, brief_id, status ("running"|"complete"|"failed"), confidence_overall, notes (jsonb), search_queries (jsonb), shortlist (jsonb), created_at`
- **results**: `id, run_id, brief_id, company_name, website_url, contact_url, contact_email, geography, services, industries, pricing_signals, portfolio_signals, evidence_links, score_overall, score_breakdown, reasoning_summary, reasoning_detailed, confidence, created_at`
- **brief_questions**: `id, brief_id, questions (jsonb), answers (jsonb), confidence_before, created_at`
- **profiles**: `id, email, full_name, created_at`

### Authentication
- Supabase Auth with `supabase.auth.signOut()` in topbar dropdown
- Middleware (`src/middleware.ts`) redirects unauthenticated users to `/login`

---

## 2. Proposed Changes

---

### Change 1: Detailed Mode "City" Field Behavior

**Current behavior:**
- City is always visible in Detailed mode as a text input (`src/app/(dashboard)/brief/new/page.tsx:477-489`)
- It is already optional (no validation, not in `canSubmit`)
- Category is selected from a dropdown with predefined options + "Other"
- Category is a free-form concept (stored as part of `raw_prompt`), not a structured enum

**Target behavior:**
- City is conditionally shown based on the selected category
- Categories where physical proximity matters show City; others hide it
- City must not block submission when hidden or empty

**Implementation steps:**

1. **Add a category-to-city-relevance mapping** in `src/app/(dashboard)/brief/new/page.tsx`:
   ```ts
   const CITY_RELEVANT_CATEGORIES = new Set([
     "Marketing Agency",
     "Design Studio",
     "Consulting Firm",
     "Other",
   ])
   ```
   Rationale: Cloud Provider, Analytics Provider, DevOps Partner, Security Vendor, and Development Partner are typically remote/global services. Marketing/Design/Consulting often benefit from local presence. "Other" shows City since intent is unknown.

2. **Conditionally render the City field** in the detailed form grid (line ~476):
   ```tsx
   {CITY_RELEVANT_CATEGORIES.has(category) && (
     <div> ... City input ... </div>
   )}
   ```

3. **Clear city state when hidden**: When category changes and City becomes hidden, reset `city` to `""`:
   ```ts
   onChange={(e) => {
     setCategory(e.target.value)
     if (e.target.value !== "Other") setCustomCategory("")
     if (!CITY_RELEVANT_CATEGORIES.has(e.target.value)) setCity("")
   }}
   ```

4. **No validation changes needed** — City is already excluded from `canSubmit` and only appended to `rawPrompt` if truthy (`city && \`City: ${city}\``).

**Edge cases:**
- User selects "Marketing Agency" (City shown), types a city, then switches to "Cloud Provider" — city must be cleared
- "Other" always shows City since the custom category is unknown
- If no category is selected yet (`category === ""`), City is hidden (not in the set)

**Acceptance criteria:**
- [ ] City field only visible for Marketing Agency, Design Studio, Consulting Firm, Other
- [ ] Switching category clears city value when City becomes hidden
- [ ] Submission works without City regardless of category
- [ ] City value is included in raw_prompt only when non-empty

---

### Change 2: History Page Navigation — Open Brief In-Context

**Current behavior:**
- `BriefListItem` is a `<Link href={/brief/${id}}>` — clicking navigates away from `/history` to `/brief/[id]` (a different page)
- Browser back returns to History, but user loses their place (pagination, filters reset on server re-render)

**Target behavior:**
- Opening a brief from History stays within the History page context
- Approach: **Slide-over panel** (right-side drawer) that overlays the History list, showing brief details
- Browser back closes the panel and returns to the History list

**Implementation steps:**

1. **Convert History page to a client component wrapper**:
   - Create `src/components/dashboard/history-client.tsx` as a `"use client"` wrapper
   - Move the server data-fetching logic into a server component that passes data as props to the client wrapper
   - The client wrapper manages a `selectedBriefId` state

2. **Add a slide-over panel component**:
   - Create `src/components/dashboard/brief-slide-over.tsx`
   - Uses shadcn `Sheet` component (right-side drawer)
   - Fetches brief details via Supabase client when `selectedBriefId` is set
   - Renders: `BriefSummaryCard`, `BriefStatusBadge`, `ResultCard` list, `RerunButton`, `ExportDropdown`

3. **Update BriefListItem**:
   - Change from `<Link>` to a `<button>` or `<div onClick>` that calls `onSelect(briefId)` prop
   - Keep the existing visual styling

4. **URL state for panel**:
   - Use URL search param `?brief=<id>` so that the panel state is bookmarkable
   - When `?brief=` is present, auto-open the panel
   - Closing the panel removes the param (browser back works naturally)

5. **Keep direct `/brief/[id]` route** — it still works for direct links, shared URLs, and "Open in new tab"

**Edge cases:**
- Deep-linked URL with `?brief=<id>` must open panel on initial load
- Panel must handle in-progress briefs (show RunStatusPoller)
- If brief is deleted or not found, close panel and show toast
- Mobile: panel should be full-width overlay

**Acceptance criteria:**
- [ ] Clicking a brief in History opens a right-side panel, does not navigate away
- [ ] History list remains visible behind the panel (desktop) or underneath (mobile)
- [ ] Browser back button closes the panel
- [ ] URL updates with `?brief=<id>` when panel is open
- [ ] Panel shows all brief data: summary, status, results, rerun/export actions
- [ ] Direct URL `/brief/[id]` still works as standalone page

---

### Change 3: Remove Redundant Profile/Settings from User Icon Dropdown

**Current behavior:**
- Topbar dropdown (`src/components/dashboard/topbar.tsx:77-92`) has: Profile (non-functional), Settings (link to `/settings`), Logout
- Sidebar already has: Settings (link to `/settings`)
- Profile item has no action/route

**Target behavior:**
- Remove Profile and Settings from the dropdown (both are redundant — Profile has no page, Settings exists in sidebar)
- Logout will also move to sidebar (see Change 10), so the dropdown can be simplified to show only the user's name/email or be removed entirely

**Implementation steps:**

1. **In `src/components/dashboard/topbar.tsx`**:
   - Remove `DropdownMenu` and all its children (lines 71-93)
   - Replace with a static avatar button that is non-interactive (purely decorative identity indicator), OR link it to `/settings`
   - Remove unused imports: `DropdownMenu*`, `Settings2`, `LogOut`, `User`

2. **Keep the avatar display** (initials, gradient) as a visual element — no dropdown needed once logout moves to sidebar

**Edge cases:**
- Ensure no functionality is lost: Settings is in sidebar, Logout will be in sidebar (Change 10)
- If Change 10 (sidebar logout) is not implemented simultaneously, temporarily keep Logout in the dropdown

**Acceptance criteria:**
- [ ] No dropdown menu on user avatar (once Change 10 is also implemented)
- [ ] User initials/avatar still visible in top-right
- [ ] Settings accessible via sidebar
- [ ] Logout accessible via sidebar (after Change 10)

---

### Change 4: Naming Briefs

**Current behavior:**
- Briefs have no `name` field
- History list shows `service_type` from `normalized_brief` as the primary identifier (`brief-list-item.tsx:33`)
- Falls back to `"Untitled brief"` when `service_type` is missing (`history/page.tsx:177`)
- Brief detail page header says "Brief Detail" (generic, `brief/[id]/page.tsx:188`)

**Target behavior:**
- Users can name briefs at creation time and rename them later
- History list shows the brief name as primary text (falling back to service_type, then "Untitled")
- Brief detail header shows the name

**Implementation steps:**

1. **Database migration** — Add `name` column to `briefs` table:
   ```sql
   ALTER TABLE briefs ADD COLUMN name text DEFAULT NULL;
   ```

2. **Backfill existing briefs**:
   ```sql
   UPDATE briefs
   SET name = COALESCE(
     normalized_brief->>'service_type',
     'Untitled — ' || to_char(created_at, 'Mon DD, YYYY')
   )
   WHERE name IS NULL;
   ```

3. **Update TypeScript types** — Add `name: string | null` to brief type in `src/types/database.ts`

4. **New Brief page** (`src/app/(dashboard)/brief/new/page.tsx`):
   - Add a `briefName` state and a text input at the top of both Simple and Detailed forms
   - Label: "Brief Name (optional)"
   - Placeholder: "e.g. Q2 SEO Agency Search"
   - Pass `name: briefName || null` in the `supabase.from("briefs").insert(...)` call (line ~149)

5. **History page** (`src/app/(dashboard)/history/page.tsx`):
   - Add `name` to the `.select()` query (line 97)
   - Pass `name` to `BriefListItem`

6. **BriefListItem** (`src/components/dashboard/brief-list-item.tsx`):
   - Add `name?: string | null` prop
   - Display `name || serviceType || "Untitled brief"` as the primary text (line 33)
   - Show `serviceType` as secondary text below the name when both exist

7. **Brief detail page** (`src/app/(dashboard)/brief/[id]/page.tsx`):
   - Display `brief.name` in the `<h1>` instead of "Brief Detail"
   - Add an inline-editable name (click to edit, blur/enter to save)
   - Save via `supabase.from("briefs").update({ name }).eq("id", briefId)`

8. **Rerun button** — no changes needed (rerun doesn't change name)

**Edge cases:**
- Name is optional — null means fallback to service_type display
- Empty string should be treated as null (trim and coerce)
- History search (`q` param) should also search the `name` column: add `name.ilike.${pattern}` to the `.or()` filter

**Acceptance criteria:**
- [ ] Optional "Brief Name" input on New Brief form (both modes)
- [ ] Name displayed as primary text in History list rows
- [ ] Name editable on brief detail page
- [ ] Existing briefs backfilled with service_type or "Untitled — <date>"
- [ ] History search includes name field
- [ ] Empty name treated as null (falls back gracefully)

---

### Change 5: Simple Mode — Hide Search Depth

**Current behavior:**
- Search Depth selector (Standard/Deep) is shown in **both** Simple and Detailed modes
- It appears at the top of the form (`src/app/(dashboard)/brief/new/page.tsx:357-385`)
- Default is `"standard"` (`useState<SearchDepth>("standard")`, line 67)

**Target behavior:**
- Simple mode does NOT show Search Depth — always uses `"standard"` (the current default)
- Detailed mode continues to show the Search Depth selector

**Implementation steps:**

1. **In `src/app/(dashboard)/brief/new/page.tsx`**:
   - Wrap the Search Depth UI block (lines 357-385) with `{mode === "detailed" && ( ... )}`
   - When `mode === "simple"`, `searchDepth` state remains `"standard"` (default) and is still passed to `applySearchDepth()` — no API changes needed

2. **Ensure searchDepth resets on mode change**:
   - In `handleModeSelect`, if switching to simple: `setSearchDepth("standard")`
   - This prevents a stale "deep" value if user toggled to detailed, set deep, then went back

**Edge cases:**
- User starts in detailed mode, selects deep, goes back to mode selection, picks simple — depth must reset to standard
- API payload remains valid because `search_depth` is always set in `optional`

**Acceptance criteria:**
- [ ] Search Depth selector not visible in Simple mode
- [ ] Simple mode always submits with `search_depth: "standard"`
- [ ] Detailed mode still shows and allows toggling Search Depth
- [ ] Switching from Detailed (deep selected) to Simple resets depth to standard

---

### Change 6: Rerun Restrictions

**Current behavior:**
- Rerun button is always visible on brief detail page (`src/app/(dashboard)/brief/[id]/page.tsx:215-219`)
- Rerun dialog allows switching mode (`rerun-button.tsx:169-178`): Select with Simple/Detailed options
- No check for brief status before allowing rerun (button shows for draft, running, failed, complete)
- Mode is stored in `briefs.mode` column

**Target behavior:**
- **Rerun only available when brief status is `"complete"` or `"failed"`** (not during `draft`, `clarifying`, `running`)
- **Mode selector removed from rerun dialog** — rerun must use the original mode

**Implementation steps:**

1. **Pass `status` to RerunButton** (`src/app/(dashboard)/brief/[id]/page.tsx`):
   - Add `status={brief.status}` prop to `<RerunButton>`

2. **Update RerunButton component** (`src/components/pipeline/rerun-button.tsx`):
   - Add `status: string` to `RerunButtonProps`
   - Disable the trigger button when `status !== "complete" && status !== "failed"`:
     ```tsx
     <Button variant="outline" disabled={status !== "complete" && status !== "failed"}>
       Re-run
     </Button>
     ```
   - **Remove the Mode selector** (lines 168-178) from the dialog
   - Remove `modeValue` state and stop sending `overrides.mode`
   - Remove the mode comparison in `handleRerun` (line 81)

3. **Server-side enforcement** (`src/app/api/pipeline/start/route.ts`):
   - After fetching brief (line 323-332), add status check:
     ```ts
     if (brief.status !== "complete" && brief.status !== "failed") {
       return NextResponse.json(
         { error: "Brief must be completed or failed before re-running." },
         { status: 400 }
       )
     }
     ```
   - Remove mode override handling from `withOverrides` / remove `overrides.mode` from `RerunOverridesSchema`

4. **Update RerunOverridesSchema** (`src/lib/schemas.ts`):
   - Remove `mode` from `RerunOverridesSchema` (line 141)

**Edge cases:**
- If user has the detail page open and the brief completes while they're viewing, the page refreshes (RunStatusPoller calls `router.refresh()`) — rerun button will become enabled
- Failed briefs should also allow rerun (already covered)
- Cancelled briefs (Change 12) should NOT allow rerun (define in Change 12)

**Acceptance criteria:**
- [ ] Rerun button disabled when brief is draft, clarifying, or running
- [ ] Rerun dialog does NOT show mode selector
- [ ] Rerun preserves the original brief mode
- [ ] Server rejects rerun for non-complete/non-failed briefs
- [ ] RerunOverridesSchema no longer includes `mode`

---

### Change 7: Fix Rerun Clarifying Questions Validation Bug

**Current behavior:**
- When rerun with `force_clarify: true`, the pipeline start API generates questions and returns them
- `RerunButton` parses them with `QuestionsPayloadSchema.safeParse(payload.questions)` (line 106)
- If parsing fails, it shows `"Clarification questions were invalid."` (line 108)
- After user answers and submits, `clarify/submit` route re-validates with `QuestionsPayloadSchema.safeParse(questionRow.questions)` (line 73) — if THIS fails, it returns `"Clarification questions are invalid."` (line 75)

**Root cause hypotheses (from code analysis):**

1. **Double-wrapping**: The `pipeline/start` route stores the full `QuestionsPayload` object in `brief_questions.questions` (line 362-365). But it stores the entire payload (with `type` and `questions` keys) as the `questions` column value. When `clarify/submit` reads it back (line 73), it calls `QuestionsPayloadSchema.safeParse(questionRow.questions)` which expects `{ type: "connexa.clarifications.v1", questions: [...] }`. This works IF the stored value matches. However, the `/api/brief/clarify/route.ts` stores the payload the same way (line 175-179) — so this is consistent.

2. **LLM-generated questions with invalid structure**: The `generateClarifications` function in `pipeline/start/route.ts` (line 242-301) calls the LLM and parses with `QuestionsPayloadSchema.parse()`. If the LLM returns a question with `type: "multiple_choice"` but fewer than 2 options, or an empty `id`, parsing at generation time would throw and fall back to `fallbackClarifications`. BUT, the schema uses `.superRefine()` which adds a custom issue for missing options — this means `safeParse` might succeed at the top level but the inner validation on options could fail on re-parse if the stored data was mutated.

3. **Most likely root cause — `options` deduplication or stale cache**: The `geo_preference` fallback question (line 206-214 in `pipeline/start`) includes `brief.geography.region` as the first option. If this value is empty string `""`, the option `z.string().min(1)` validation will fail. This creates a question that was stored in the DB but fails re-validation. Specifically:
   ```ts
   options: [brief.geography.region, "United States", "North America", "Europe", "Global"],
   ```
   If `brief.geography.region` is `""` or if there are duplicate entries (e.g., region is "United States"), validation could fail.

4. **Stale cached questions**: The `/api/brief/clarify/route.ts` uses a cache check comparing `updated_at` vs `created_at`. If a rerun updates the brief's `normalized_brief` and then force-clarifies, but the timestamp comparison is off (same-second update), stale questions with mismatched `fieldPath` values could be returned.

**Implementation steps:**

1. **Fix fallback question options** in `src/app/api/pipeline/start/route.ts` (line 206-214):
   - Deduplicate and filter empty strings from `options`:
     ```ts
     options: [...new Set([
       brief.geography.region,
       "United States", "North America", "Europe", "Global"
     ].filter(opt => opt && opt.trim().length > 0))],
     ```
   - Ensure at least 2 options remain (if dedup reduces below 2, add "Any region")

2. **Add defensive re-validation** in `RerunButton` (`rerun-button.tsx`):
   - When `QuestionsPayloadSchema.safeParse` fails (line 107), log the Zod error details to console for debugging
   - Show a more informative error: `"Could not parse clarification questions. Try re-running without 'Ask clarifying questions'."`

3. **Add normalization in clarify/submit** (`src/app/api/brief/clarify/submit/route.ts`):
   - After reading `questionRow.questions` (line 73), if `safeParse` fails, attempt to coerce:
     ```ts
     if (!payload.success) {
       // Try normalizing: filter out invalid questions
       const raw = questionRow.questions as { type?: string; questions?: unknown[] }
       if (raw?.questions && Array.isArray(raw.questions)) {
         const cleaned = {
           type: "connexa.clarifications.v1",
           questions: raw.questions.filter(q =>
             q && typeof q === "object" && "id" in q && "fieldPath" in q
           )
         }
         const retry = QuestionsPayloadSchema.safeParse(cleaned)
         if (retry.success) payload = retry
       }
     }
     ```

4. **Fix the fallback clarifications in `/api/brief/clarify/route.ts`** (line 15-45):
   - Same dedup/filter pattern for any options arrays

**Edge cases:**
- LLM returns questions with `type: "select"` but no `options` — schema catches this, falls back to hardcoded
- Empty `id` field from LLM — schema catches this (`z.string().min(1)`)
- Duplicate option values in select/multiple_choice — frontend `RadioGroupItem` uses option as key, duplicates cause React key warnings

**Acceptance criteria:**
- [ ] Rerun with force_clarify no longer shows "invalid" error for fallback questions
- [ ] Fallback question options are deduplicated and non-empty
- [ ] clarify/submit route handles slightly malformed stored questions gracefully
- [ ] Error messages are actionable (suggest retrying without clarify)
- [ ] Add a test: generate fallback questions where `geography.region` is empty or duplicated — verify no validation error

---

### Change 8: Help Button Feedback Email

**Current behavior:**
- Sidebar has a Help item linking to `#` (no-op): `{ id: "help", label: "HELP", icon: HelpCircle, href: "#" }` (`sidebar.tsx:16`)

**Target behavior:**
- Help button opens a small popover or triggers a `mailto:` link with the company email

**Implementation steps:**

1. **In `src/components/dashboard/sidebar.tsx`**:
   - Change the Help item from a `<Link>` to a `<button>` or use an `<a>` with `href="mailto:feedback@connexa.com"` (replace with actual email)
   - Alternatively, show a small tooltip/popover on click:
     ```
     Need help? Email us at feedback@connexa.com
     [Copy Email] [Send Email]
     ```

2. **Recommended approach — simple mailto link**:
   - Change `href: "#"` to `href: "mailto:feedback@connexa.com?subject=Connexa Dashboard Feedback"`
   - Change the `<Link>` to `<a>` for the help item since it's an external action, not a route

3. **Alternative — popover with copy-to-clipboard**:
   - Use shadcn `Popover` component
   - Show email text + copy button (using `navigator.clipboard.writeText`)
   - This is more polished but adds complexity

**Edge cases:**
- On devices without email client, `mailto:` may not work — the popover approach with copy-to-clipboard is safer
- Mobile browsers handle `mailto:` differently

**Acceptance criteria:**
- [ ] Help button in sidebar triggers email action (mailto or copy)
- [ ] Email address is correct and consistent
- [ ] No dead `#` link

---

### Change 9: Improve Brief Results UI

**Current behavior:**
- `ResultCard` (`src/components/results/result-card.tsx`) displays:
  - Rank + company name + overall score badge
  - Website URL link
  - Services as secondary badges
  - Geography as plain gray text
  - Reasoning summary as plain text
  - Confidence tier badge with tooltip (drivers list)
  - Score breakdown bars (detailed mode only) — raw keys like `service_match`, `budget_fit`
  - Reasoning panel (detailed mode) — collapsible `<details>` with raw criterion keys
  - Contact suggestion (email/URL/website fallback)
- Score breakdown labels are raw `key.replaceAll("_", " ")` — e.g. "service match", "budget fit"
- Colors: score-based (emerald/indigo/blue/amber), but most of the card is monochrome
- No industries displayed (data exists but not rendered)
- Pricing signals and portfolio signals exist but are not shown in the card

**Target behavior:**
- Add more visual information using existing real data
- Better labels (user-facing, not internal jargon)
- More color and visual hierarchy
- Show industries, pricing signals, and portfolio evidence when available

**Implementation steps:**

1. **User-facing labels for score breakdown** (`src/components/results/score-breakdown.tsx`):
   - Add a label map:
     ```ts
     const SCORE_LABELS: Record<string, string> = {
       service_match: "Service Fit",
       budget_fit: "Budget Alignment",
       industry_fit: "Industry Relevance",
       timeline_fit: "Timeline Compatibility",
       geo_fit: "Location Match",
       constraint_fit: "Requirements Met",
     }
     ```
   - Replace `key.replaceAll("_", " ")` with `SCORE_LABELS[key] ?? key.replaceAll("_", " ")`

2. **Show industries** in `ResultCard` (after services badges):
   ```tsx
   {result.industries.length > 0 && (
     <div className="flex flex-wrap gap-2">
       {result.industries.map((ind) => (
         <Badge key={ind} variant="outline" className="border-indigo-500/30 text-indigo-300">
           {ind}
         </Badge>
       ))}
     </div>
   )}
   ```

3. **Show pricing signals** when available:
   ```tsx
   {result.pricing_signals && (
     <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
       <p className="text-xs font-medium text-emerald-400 mb-1">Pricing Signal</p>
       <p className="text-sm text-white">
         {result.pricing_signals.type}: {result.pricing_signals.value}
       </p>
       <p className="text-xs text-[#919191] mt-1">{result.pricing_signals.evidence}</p>
     </div>
   )}
   ```
   Note: `pricing_signals` is typed as `PricingSignalSchema` with `type`, `value`, `evidence` fields.

4. **Show portfolio signals** as a collapsible list:
   ```tsx
   {(result.portfolio_signals ?? []).length > 0 && (
     <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-3">
       <p className="text-xs font-medium text-indigo-400 mb-1">Portfolio Evidence</p>
       <ul className="text-sm text-[#c0c0c0] space-y-1">
         {result.portfolio_signals!.map((signal, i) => (
           <li key={i}>- {signal}</li>
         ))}
       </ul>
     </div>
   )}
   ```

5. **Add color to the overall score badge** — already colored, but make the rank number also colored:
   ```tsx
   <CardTitle className="text-lg">
     <span className={scoreClass(result.score_overall).replace("bg-", "text-").replace("/20", "")}>
       #{rank}
     </span>{" "}
     {result.company_name}
   </CardTitle>
   ```

6. **Improve Geography display**:
   ```tsx
   {result.geography && (
     <div className="flex items-center gap-2 text-sm text-[#919191]">
       <MapPin className="h-4 w-4 text-indigo-400" />
       <span>{result.geography}</span>
     </div>
   )}
   ```

7. **Reasoning panel labels** (`src/components/results/reasoning-panel.tsx`):
   - Use the same `SCORE_LABELS` map for criterion names
   - Extract the map to a shared location (e.g., `src/lib/constants.ts`) or co-locate in results

8. **Evidence links** — show evidence count badge:
   ```tsx
   {result.evidence_links.length > 0 && (
     <p className="text-xs text-[#919191]">
       Based on {result.evidence_links.length} source{result.evidence_links.length > 1 ? "s" : ""}
     </p>
   )}
   ```

**Edge cases:**
- `pricing_signals` can be null/undefined — guard with optional chaining
- `portfolio_signals` can be null — guard with `?? []`
- `pricing_signals` is typed as `z.unknown()` in `ScoredResultSchema` — may need runtime type check before accessing `.type`, `.value`, `.evidence`
- Industries might duplicate services — acceptable, different data dimension

**Acceptance criteria:**
- [ ] Score breakdown uses human-readable labels
- [ ] Industries displayed as colored outline badges
- [ ] Pricing signals shown in a highlighted card when available
- [ ] Portfolio signals shown as a list when available
- [ ] Evidence source count displayed
- [ ] Geography shown with icon
- [ ] No placeholder/fake data — all fields sourced from existing `results` table columns
- [ ] Reasoning panel uses readable labels

---

### Change 10: Sidebar Logout Button

**Current behavior:**
- Logout is in the topbar user dropdown (`src/components/dashboard/topbar.tsx:88-91`)
- Calls `supabase.auth.signOut()`, then `router.push("/login")` and `router.refresh()`
- Sidebar has no logout item (`src/components/dashboard/sidebar.tsx`)

**Target behavior:**
- Add Logout to sidebar bottom items, below Settings
- Remove logout from topbar dropdown (coordinated with Change 3)

**Implementation steps:**

1. **Convert sidebar to client component** (it already is — `"use client"` at top)

2. **Add logout handler** to sidebar. Since sidebar currently uses simple `<Link>` elements, the logout item needs an `onClick` handler:
   - Import `createClient` from `@/lib/supabase/client`, `useRouter` from `next/navigation`, and `toast` from `sonner`
   - Add state for the logout action

3. **Add logout item to `bottomItems`** or handle separately:
   ```ts
   // After the bottomItems map, add:
   <button
     onClick={handleLogout}
     className="flex items-center gap-4 transition-colors cursor-pointer text-[#919191] hover:text-white"
   >
     <LogOut className="h-5 w-5" />
     <span className="text-sm font-medium tracking-wide">LOG OUT</span>
   </button>
   ```

4. **Add confirmation** — follow existing pattern (none currently exists; logout is instant). For safety, add a simple `window.confirm("Are you sure you want to log out?")` or use shadcn `AlertDialog`.

5. **Remove logout from topbar** (coordinated with Change 3)

**Edge cases:**
- Logout error should show toast (already handled in topbar; replicate pattern)
- Mobile: sidebar is hidden on mobile — ensure topbar still has logout accessible on mobile (or add mobile bottom nav)
- If sidebar is hidden on mobile, keep a minimal dropdown in topbar for mobile-only logout

**Acceptance criteria:**
- [ ] Logout button visible in sidebar below Settings
- [ ] Clicking triggers `supabase.auth.signOut()` with redirect to `/login`
- [ ] Confirmation prompt before logout
- [ ] Topbar dropdown no longer contains logout (after Change 3)
- [ ] Mobile fallback: logout accessible somehow on mobile screens

---

### Change 11: Track and Display AI Duration Per Brief

**Current behavior:**
- Pipeline orchestrator captures `startedAtMs = Date.now()` at the start (`orchestrator.ts:150`)
- At the end, calculates `durationSeconds = Math.round((Date.now() - startedAtMs) / 1000)` (line 314)
- Stores it as a note string: `Pipeline duration: ${durationSeconds}s` (line 315)
- This is stored in `runs.notes` (jsonb array of strings)
- Not displayed anywhere in the UI
- No dedicated `started_at` or `completed_at` columns on `runs`

**Target behavior:**
- Display AI duration in History list and brief detail page
- Format as human-readable: "2m 13s", "45s", etc.

**Implementation steps:**

1. **Database migration** — Add timing columns to `runs`:
   ```sql
   ALTER TABLE runs ADD COLUMN started_at timestamptz DEFAULT NULL;
   ALTER TABLE runs ADD COLUMN completed_at timestamptz DEFAULT NULL;
   ```

2. **Update orchestrator** (`src/lib/pipeline/orchestrator.ts`):
   - After `const startedAtMs = Date.now()` (line 150), write `started_at`:
     ```ts
     await admin.from("runs").update({ started_at: new Date(startedAtMs).toISOString() }).eq("id", runId)
     ```
   - Before final `updateRun` calls (success line 317, failure line 328):
     ```ts
     await admin.from("runs").update({ completed_at: new Date().toISOString() }).eq("id", runId)
     ```

3. **Add a duration utility** to `src/lib/utils.ts`:
   ```ts
   export function formatDuration(startedAt: string | null, completedAt: string | null): string | null {
     if (!startedAt || !completedAt) return null
     const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
     if (ms < 0) return null
     const totalSeconds = Math.round(ms / 1000)
     const minutes = Math.floor(totalSeconds / 60)
     const seconds = totalSeconds % 60
     if (minutes === 0) return `${seconds}s`
     return `${minutes}m ${seconds}s`
   }
   ```

4. **History page** (`src/app/(dashboard)/history/page.tsx`):
   - For each brief, fetch the latest run's `started_at` and `completed_at`
   - Pass duration to `BriefListItem`
   - Display as a small label: "Duration: 1m 45s"

5. **Brief detail page** (`src/app/(dashboard)/brief/[id]/page.tsx`):
   - Fetch `started_at` and `completed_at` from the latest run
   - Display in the header area or in the Brief Summary Card

6. **Fallback for existing runs**: Parse duration from `notes` array:
   ```ts
   function parseDurationFromNotes(notes: string[]): string | null {
     const match = notes.find(n => n.startsWith("Pipeline duration:"))
     if (!match) return null
     const seconds = parseInt(match.replace("Pipeline duration: ", "").replace("s", ""))
     if (isNaN(seconds)) return null
     const minutes = Math.floor(seconds / 60)
     const secs = seconds % 60
     if (minutes === 0) return `${secs}s`
     return `${minutes}m ${secs}s`
   }
   ```

**Edge cases:**
- In-progress runs have `started_at` but no `completed_at` — show "Running..." or elapsed time
- Failed runs still get `completed_at` (the orchestrator's catch block should also set it)
- Runs before migration have neither column — fall back to parsing notes string

**Acceptance criteria:**
- [ ] `started_at` and `completed_at` written to `runs` table during pipeline execution
- [ ] Duration displayed in History list items
- [ ] Duration displayed on brief detail page
- [ ] Format: "45s" or "2m 13s"
- [ ] Fallback for pre-migration runs using notes string
- [ ] In-progress runs show running indicator, not duration

---

### Change 12: Cancel Brief

**Current behavior:**
- No cancel functionality exists
- Pipeline runs as a fire-and-forget async function: `void runPipeline(briefId, runId)` (`pipeline/start/route.ts:402`)
- The orchestrator runs sequentially through steps, updating the `runs` table as it progresses
- No abort signal, no cancellation check
- Status values: `"draft" | "clarifying" | "running" | "complete" | "failed"`

**Target behavior:**
- User can cancel a brief from:
  - The loading screen (New Brief page, during pipeline run)
  - The brief detail page (while status is "running")
- Cancellation stops the pipeline gracefully and marks the brief as cancelled
- Partial results (if any) are preserved

**Implementation steps:**

1. **Add `"cancelled"` status** to the brief and run status:
   - Database migration:
     ```sql
     -- No enum constraint exists in the schema (status is text), so no migration needed
     -- Just start using "cancelled" as a value
     ```
   - Update TypeScript types in `src/types/database.ts` and any type unions
   - Update `BriefStatusBadge` component to handle "cancelled" status (gray badge)

2. **Create cancel API endpoint** at `src/app/api/pipeline/cancel/route.ts`:
   ```ts
   export async function POST(request: Request) {
     const { brief_id } = await request.json()
     // Verify ownership
     // Update briefs.status = "cancelled"
     // Update latest run.status = "cancelled"
     // Return success
   }
   ```

3. **Add cancellation check to orchestrator** (`src/lib/pipeline/orchestrator.ts`):
   - Before each major step (query_plan, search, triage, evidence, extract, score, rank), check if the run has been cancelled:
     ```ts
     const checkCancelled = async (): Promise<boolean> => {
       const { data } = await admin.from("runs").select("status").eq("id", runId).single()
       return data?.status === "cancelled"
     }
     ```
   - If cancelled, stop processing and return early:
     ```ts
     if (await checkCancelled()) {
       appendNote("Pipeline cancelled by user.")
       await admin.from("briefs").update({ status: "cancelled" }).eq("id", briefId)
       return
     }
     ```

4. **Loading screen cancel button** (`src/app/(dashboard)/brief/new/page.tsx`):
   - In the loading step (lines 557-577), add a cancel button below the `RunStatusPoller`:
     ```tsx
     <Button variant="outline" onClick={handleCancel}>Cancel</Button>
     ```
   - `handleCancel` calls `POST /api/pipeline/cancel` with `brief_id`

5. **Brief detail page cancel button** (`src/app/(dashboard)/brief/[id]/page.tsx`):
   - Show a "Cancel" button next to the Rerun button when `brief.status === "running"`
   - Use shadcn `AlertDialog` for confirmation: "Cancel this brief? Partial results will be saved."

6. **Update History display**:
   - `BriefStatusBadge` should show "Cancelled" with a neutral/gray badge
   - History filters: add "cancelled" to the status filter options

7. **Rerun rules for cancelled briefs**:
   - Cancelled briefs SHOULD allow rerun (user may want to retry)
   - Update rerun status check to include `"cancelled"`: `status === "complete" || status === "failed" || status === "cancelled"`

8. **RunStatusPoller**: When status becomes "cancelled", stop polling and show cancelled state

**Edge cases:**
- Cancel request arrives after pipeline already completed — idempotency: if brief is already `complete`/`failed`, return success without changes
- Cancel during the search step — partial search results may exist, preserve them
- Multiple cancel requests — must be idempotent
- Race condition: pipeline completes between cancel request and DB update — use optimistic locking or accept last-write-wins (acceptable for this use case)

**Acceptance criteria:**
- [ ] Cancel button on loading screen during pipeline run
- [ ] Cancel button on brief detail page when status is "running"
- [ ] Confirmation dialog before cancellation
- [ ] Pipeline stops at next step boundary after cancellation
- [ ] Brief status set to "cancelled"
- [ ] Partial results preserved (any results already inserted remain)
- [ ] Cancelled briefs can be rerun
- [ ] History page shows "Cancelled" status badge
- [ ] Cancel API is idempotent

---

### Change 13: History Category Display for "Other"

**Current behavior:**
- In Detailed mode, user selects a category from dropdown. "Other" allows custom text
- Category is embedded in `raw_prompt` as `Category: <value>` (`brief/new/page.tsx:137`)
- During normalization (`/api/brief/normalize`), the LLM or heuristic extracts `service_type`
- History shows `normalized_brief.service_type` (`history/page.tsx:177`)
- When "Other" is selected, the custom category goes into `raw_prompt` but the normalizer may not preserve it faithfully — it can output a generic `service_type` like "b2b service provider" instead of the user's custom category
- The heuristic normalizer (`normalize/route.ts:13-42`) only recognizes "marketing" and "development" — everything else becomes "b2b service provider"

**Root cause:**
- The heuristic normalizer doesn't extract the `Category:` field from the prompt
- The LLM normalizer may or may not preserve it
- The user's intended category is lost during normalization

**Target behavior:**
- When "Other" is selected, the custom category text should be preserved and displayed in History
- For predefined categories, the category should also be preserved

**Implementation steps:**

1. **Store category separately** — Add `category` column to `briefs` table:
   ```sql
   ALTER TABLE briefs ADD COLUMN category text DEFAULT NULL;
   ```

2. **Save category at creation** (`src/app/(dashboard)/brief/new/page.tsx`):
   - In the `insert` call (line 147-156), add:
     ```ts
     category: mode === "detailed"
       ? (category === "Other" ? customCategory : category) || null
       : null,
     ```

3. **Update History display** (`src/app/(dashboard)/history/page.tsx`):
   - Add `category` to the `.select()` query
   - Pass `category` to `BriefListItem`

4. **Update BriefListItem** (`src/components/dashboard/brief-list-item.tsx`):
   - Show `category` as a secondary badge or label when it differs from `serviceType`:
     ```tsx
     {category && category !== serviceType && (
       <Badge variant="outline">{category}</Badge>
     )}
     ```

5. **Backfill existing briefs**:
   - Parse `raw_prompt` for `Category: <value>` line:
     ```sql
     UPDATE briefs
     SET category = (
       SELECT trim(substring(raw_prompt from 'Category: ([^\n]+)'))
     )
     WHERE mode = 'detailed' AND category IS NULL AND raw_prompt LIKE '%Category:%';
     ```

**Edge cases:**
- Simple mode briefs have no category — column is null, display unaffected
- User types "Other" but leaves custom category empty — validation should require it (currently has `required` attribute)
- Category may be very long — truncate display to reasonable length

**Acceptance criteria:**
- [ ] Category stored in dedicated column at creation
- [ ] History displays the actual category (not LLM-reinterpreted service_type)
- [ ] "Other" custom categories preserved and displayed correctly
- [ ] Predefined categories display their exact name
- [ ] Existing briefs backfilled from raw_prompt
- [ ] Simple mode briefs unaffected (no category shown)

---

### Change 14: Deep Mode Warning Popup

**Current behavior:**
- In Detailed mode (and currently Simple mode too — removed in Change 5), user can select "Deep" search depth
- Deep mode uses significantly more resources: 40 queries vs 12, 300 raw results vs 100, 5-minute timeout vs 90s
- No warning is shown

**Target behavior:**
- When selecting "Deep" in Detailed mode, show a warning dialog/popup
- Message: "Warning: deep mode can take a very long time and uses significantly more credits."
- User can confirm (proceed with Deep) or cancel (revert to Standard)

**Implementation steps:**

1. **In `src/app/(dashboard)/brief/new/page.tsx`**:
   - Add state: `const [showDeepWarning, setShowDeepWarning] = useState(false)`
   - Modify the Deep button click handler (line 374):
     ```tsx
     onClick={() => {
       if (searchDepth !== "deep") {
         setShowDeepWarning(true)
       } else {
         setSearchDepth("standard") // toggle off
       }
     }}
     ```
   - Clicking Standard always sets directly without warning

2. **Add warning dialog** using shadcn `AlertDialog`:
   ```tsx
   <AlertDialog open={showDeepWarning} onOpenChange={setShowDeepWarning}>
     <AlertDialogContent>
       <AlertDialogHeader>
         <AlertDialogTitle>Enable Deep Search?</AlertDialogTitle>
         <AlertDialogDescription>
           Deep mode can take a very long time and uses significantly more credits.
           It searches more broadly with up to 40 queries and 300 candidates.
         </AlertDialogDescription>
       </AlertDialogHeader>
       <AlertDialogFooter>
         <AlertDialogCancel onClick={() => setShowDeepWarning(false)}>
           Stay with Standard
         </AlertDialogCancel>
         <AlertDialogAction onClick={() => { setSearchDepth("deep"); setShowDeepWarning(false) }}>
           Enable Deep Search
         </AlertDialogAction>
       </AlertDialogFooter>
     </AlertDialogContent>
   </AlertDialog>
   ```

3. **Also apply to Rerun dialog** (`src/components/pipeline/rerun-button.tsx`):
   - Same pattern when user changes search depth to "deep" in the rerun dialog
   - Can reuse the same AlertDialog pattern

4. **No "don't show again" preference** — there is no existing user preferences system in the DB, so omit this to avoid over-engineering

**Edge cases:**
- If user is already on Deep and clicks Deep again (toggle off) — no warning needed
- If user clicks Standard → Deep → Standard → Deep — warning shows each time (acceptable without preferences system)
- Rerun dialog: warning should be inside the rerun dialog flow, not a separate floating dialog

**Acceptance criteria:**
- [ ] Warning dialog appears when selecting Deep in Detailed mode
- [ ] Dialog clearly states time and credit implications
- [ ] "Stay with Standard" reverts selection
- [ ] "Enable Deep Search" confirms selection
- [ ] No warning when selecting Standard
- [ ] Warning also applies in Rerun dialog
- [ ] No "don't show again" (no preferences system exists)

---

## 3. Test Plan

### Unit Tests

| Change | Test |
|--------|------|
| 1 (City) | Test `CITY_RELEVANT_CATEGORIES` mapping; verify city cleared when category changes to irrelevant |
| 4 (Naming) | Test name fallback logic: `name ?? serviceType ?? "Untitled brief"` |
| 5 (Search Depth) | Test that searchDepth resets to "standard" when mode changes to simple |
| 6 (Rerun) | Test rerun button disabled for non-terminal statuses |
| 7 (Clarify bug) | Test `fallbackClarifications` with empty/duplicate geography.region; verify valid QuestionsPayload produced |
| 9 (Results UI) | Test `SCORE_LABELS` mapping covers all score_breakdown keys |
| 11 (Duration) | Test `formatDuration()` with various inputs: null, same timestamps, <60s, >60s |
| 12 (Cancel) | Test cancel API idempotency: cancel already-completed brief returns success |
| 13 (Category) | Test category storage and retrieval for "Other" with custom text |

### Integration Tests

| Change | Test |
|--------|------|
| 4 (Naming) | Create brief with name → verify appears in History list and detail page |
| 6 (Rerun) | Attempt rerun on running brief → verify 400 error |
| 7 (Clarify bug) | Force clarify on rerun → submit answers → verify pipeline starts |
| 11 (Duration) | Run pipeline → verify started_at and completed_at populated in runs table |
| 12 (Cancel) | Start pipeline → cancel → verify status is "cancelled" and pipeline stops |

### E2E Tests (Suggested Playwright/Cypress)

| Scenario | Steps |
|----------|-------|
| Simple mode no depth | Select Simple → verify Search Depth not visible → submit → verify payload has standard |
| Detailed mode city visibility | Select Detailed → choose "Cloud Provider" → verify City hidden → choose "Marketing Agency" → verify City visible |
| History panel | Go to History → click brief → verify panel opens → verify URL has ?brief= → click back → verify panel closes |
| Rerun restrictions | Open completed brief → verify rerun enabled → open running brief → verify rerun disabled |
| Cancel brief | Start brief → click Cancel → confirm → verify "Cancelled" status |
| Deep warning | Select Detailed → click Deep → verify warning dialog → confirm → verify Deep selected |
| Brief naming | Create brief with name → go to History → verify name displayed → click brief → verify name in header |
| Help button | Click Help in sidebar → verify mailto opens or email shown |
| Logout in sidebar | Click Logout in sidebar → confirm → verify redirect to /login |

---

## 4. Risk / Regression Notes

1. **Change 2 (History panel)**: Most complex change. Converting History to a client wrapper while keeping server-side data fetching requires careful architecture. Risk: pagination/filter state may need to be managed differently. Mitigation: keep server component for data fetching, pass as props.

2. **Change 3 + 10 (Dropdown removal + Sidebar logout)**: Must be deployed together. If only one ships, logout becomes inaccessible. Mitigation: implement both in same PR, or keep dropdown temporarily with just Logout until sidebar logout is ready. **Mobile concern**: sidebar is hidden on mobile — must ensure mobile users can still logout (keep minimal dropdown on mobile, or add mobile bottom nav).

3. **Change 4 (Naming)**: Database migration required. Backfill query must be tested on staging first. Risk: `raw_prompt` parsing regex may not match all formats. Mitigation: use `COALESCE` with date fallback.

4. **Change 6 (Rerun mode lock)**: Removing `mode` from `RerunOverridesSchema` is a breaking change if any client still sends it. Mitigation: server should ignore unknown fields (Zod strips them with `.safeParse()`).

5. **Change 7 (Clarify bug)**: Root cause is probabilistic (LLM-generated questions). Fix addresses known fallback issues and adds defensive parsing. Monitor error rates after deploy.

6. **Change 11 (Duration)**: New DB columns. No default migration needed (nullable). Existing runs won't have values — fallback to notes parsing handles this.

7. **Change 12 (Cancel)**: Cancellation is cooperative (checked between steps). Long-running steps (search, evidence scraping) won't be interrupted mid-step. Risk: user expects immediate cancellation but pipeline continues until next checkpoint. Mitigation: document this behavior, check more frequently within batch steps.

8. **Change 13 (Category)**: New DB column. Backfill depends on `raw_prompt` format consistency. Simple mode briefs are unaffected.

9. **General**: All DB migrations should be applied via Supabase migration files in `supabase/migrations/`. Test on staging before production. No data loss expected from any migration (all are additive: new columns, no drops).
