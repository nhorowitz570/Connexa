# Implementation Plan — ConnexaAI Dashboard Updates

> This file contains actionable implementation instructions for an AI coding agent.
> Read this document top-to-bottom before starting any work.
> Each phase is self-contained with objectives, affected files, steps, edge cases, and dependencies.

---

## Phase 1: Resume Pending Clarification Questions from History

### Objective
When a user leaves or refreshes while the AI has pending clarification questions (brief status = `clarifying`), and later reopens that brief from History, the system must detect the pending questions and present them so the user can respond. Currently, the clarification state is ephemeral — it lives only in React state in `NewBriefPage`, so navigating away loses it entirely, leaving the brief stuck in `clarifying` status forever.

### Files / Systems Affected
- `src/app/(dashboard)/brief/[id]/page.tsx` — brief detail page (server component)
- `src/components/brief/brief-detail-client.tsx` — client-side brief detail logic
- `src/components/brief/clarification-renderer.tsx` — renders clarification questions
- `src/app/api/brief/clarify/submit/route.ts` — handles clarification answer submission
- `src/app/(dashboard)/history/page.tsx` — history list (for visual indicator)
- `src/components/dashboard/history-client.tsx` — history list client component
- `src/components/dashboard/brief-slide-over.tsx` — slide-over panel from history/dashboard
- `src/components/pipeline/rerun-button.tsx` — already has `force_clarify` option (lines 213-220)
- `src/components/brief/brief-status-badge.tsx` — status badge display

### Implementation Steps

1. **Brief detail page (`brief/[id]/page.tsx`)**: When loading a brief with `status === "clarifying"`, query the `brief_questions` table for the latest unanswered question row (where `answers IS NULL`) for that brief. Pass the questions payload to a new or existing client component.

2. **New component or extend `BriefDetailClient`**: If the brief is in `clarifying` status and has unanswered questions, render the `ClarificationRenderer` component with the persisted questions payload and a submit handler.

3. **Submit handler for resumed clarifications**: The submit handler should call `/api/brief/clarify/submit` with `{ brief_id, answers }`. This route already exists and correctly merges answers into the normalized brief, creates a run, and starts the pipeline. No backend changes needed for submission.

4. **UI messaging**: Show a banner/alert above the clarification form when resuming:
   > "This brief has pending questions from a previous session. Please answer them to continue."

5. **History page visual indicator**: In `history-client.tsx`, briefs with `status === "clarifying"` should show a distinct visual cue (e.g., amber badge, "Needs your input" label) so users know action is required.

6. **Prevent stuck briefs**: Add a safety check in the brief detail page: if a brief is `clarifying` but has NO question rows in `brief_questions`, treat it as a stuck state and either:
   - Reset the brief status to `draft` and show a "Start over" button, OR
   - Auto-trigger clarification generation by calling `/api/brief/clarify` again.

7. **Brief slide-over panel** (`brief-slide-over.tsx`): When a brief with `clarifying` status is opened in the slide-over from the dashboard or history, show a prominent "Resume Clarification" button that navigates to the brief detail page where the full clarification form is rendered. The slide-over (lines 354-356) currently only shows Cancel for `running` and RerunButton for `complete`/`error`/`cancelled` — add handling for `clarifying`.

8. **Leverage existing `force_clarify` infrastructure**: The rerun button (`rerun-button.tsx` lines 213-220) already has "Ask clarifying questions before this run" checkbox that calls `/api/pipeline/start` with `force_clarify: true`. The pipeline start route (lines 251-290) generates new questions and returns `clarify_required: true`. For the resume flow, you can either reuse this path or directly load cached questions from `brief_questions` — the latter is preferable to avoid regenerating questions the user already saw.

### Edge Cases / Risks
- **Partial answers**: If the user answered some questions before leaving, `answers` column might be partially populated. Check if `answers IS NULL` vs checking individual question completeness.
- **Multiple question rows**: The clarify route can create multiple rows over time. Always use the latest row (`ORDER BY created_at DESC LIMIT 1`).
- **Race condition on rerun**: If a user clicks "Rerun" on a clarifying brief, the pipeline start route should handle the state transition properly. Currently `pipeline/start` checks for normalized_brief but doesn't gate on `clarifying` status.
- **Brief opened mid-generation**: If clarification generation is still in-progress (rare edge), the brief might be in `clarifying` status but have no question row yet. Handle gracefully with a loading state.

### Dependencies
- No database schema changes needed. `brief_questions.answers` column already exists and is nullable.
- No new API routes needed. `/api/brief/clarify/submit` handles everything.

---

## Phase 2: Inject Current Date/Time into AI Prompts

### Objective
Ensure the AI knows the current year, date, and time when generating follow-up/clarification questions, normalizing briefs, and in the assistant chat. Without this, the AI may ask about deadlines in the past or make temporally irrelevant suggestions.

### Files / Systems Affected
- `src/app/api/brief/clarify/route.ts` — clarification question generation (system prompt at line 43)
- `src/app/api/brief/normalize/route.ts` — brief normalization (system prompt at line 143)
- `src/app/api/brief/summarize/route.ts` — brief summarization (system prompt at line 75)
- `src/app/api/assistant/chat/route.ts` — assistant chat (system prompt at line 327)
- `src/lib/pipeline/query-plan.ts` — query plan generation (system prompt at line 99)
- `src/lib/pipeline/extract.ts` — extraction prompts (system prompt at line 72)
- `src/app/api/pipeline/start/route.ts` — duplicate clarification prompt (lines 73-104, generates questions during re-runs with `force_clarify`)
- `src/app/api/recommendations/route.ts` — recommendation generation (system prompt at line 201; note: has `quarterPrompt()` function at lines 93-102 that computes current quarter but does NOT pass it to the LLM)
- `src/app/api/analytics/compute/route.ts` — analytics optimization recommendations (system prompt at line 175; receives `targetDate` in payload but no instructions to use it)

### Current State
**None of the system prompts currently include date/time context.** The clarify prompt says "Generate dynamic clarification questions" but has no awareness of what year it is. The normalize prompt says "Normalize this B2B sourcing request" with no temporal grounding. The assistant chat prompt says "You are ConnexaAI Assistant" with user context but no date.

### Implementation Steps

1. **Create a shared utility** in `src/lib/temporal-context.ts`:
   ```ts
   export function getTemporalContext(): string {
     const now = new Date()
     return `Current date: ${now.toISOString().split("T")[0]} (${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}). Current year: ${now.getFullYear()}.`
   }
   ```

2. **Inject into clarify route** (`clarify/route.ts`, line 43): Append the temporal context to the system prompt, e.g.:
   ```
   ${getTemporalContext()}
   - Do not ask about deadlines or timelines that have already passed.
   - Frame timeline questions relative to today's date.
   ```

3. **Inject into normalize route** (`normalize/route.ts`, line 143): Append temporal context:
   ```
   ${getTemporalContext()}
   - Interpret relative time references (e.g., "next quarter", "in 3 months") relative to today.
   ```

4. **Inject into assistant chat** (`assistant/chat/route.ts`, line 329): Add temporal context to the system prompt string or include it in the `systemContext` JSON object.

5. **Inject into query-plan** (`pipeline/query-plan.ts`, line 99): Add temporal context so search queries are grounded in the current time.

6. **Inject into extract prompts** (`extract.ts`, line 72): Add "Content extraction date: YYYY-MM-DD" to help the AI assess information freshness.

7. **Inject into pipeline start route** (`pipeline/start/route.ts`, lines 73-104): This has a duplicate clarification generation flow used during re-runs with `force_clarify`. Add the same temporal context as the main clarify route.

8. **Inject into recommendations route** (`recommendations/route.ts`, line 201): The code already computes the current quarter via `quarterPrompt()` (lines 93-102) but this logic is only used in rule generation, not shared with the LLM. Pass the current date and quarter info to the system prompt so the LLM can reason about seasonal relevance.

9. **Inject into analytics compute route** (`analytics/compute/route.ts`, line 175): The payload already includes `date: targetDate` but the system prompt doesn't instruct the LLM to use it. Add "Analysis date: YYYY-MM-DD" and instruct the LLM to contextualize recommendations relative to that date.

### Edge Cases / Risks
- **Server timezone**: `new Date()` uses the server's timezone. Use UTC or include timezone info explicitly.
- **Caching**: The clarify route caches questions in `brief_questions`. If temporal context changes the generation, ensure cache invalidation still works (it currently checks `briefUpdatedAt` vs `cachedCreatedAt`, which is fine).
- **Token usage**: Adding ~30 tokens of temporal context per prompt is negligible.

### Dependencies
- None. Pure additive change to existing prompts.

---

## Phase 3: Light Mode Contrast Audit & Fix

### Objective
Light Mode has very poor contrast. Investigate root causes and fix them systematically across the design system rather than patching individual components.

### Investigation Section

#### Root Causes Identified from Codebase Analysis

1. **Pure white backgrounds**: Light mode `:root` sets `--background: oklch(1 0 0)` (pure white), `--card: oklch(1 0 0)` (pure white), `--popover: oklch(1 0 0)` (pure white). These provide zero visual separation between surfaces.

2. **Low-contrast muted foreground**: `--muted-foreground: oklch(0.556 0 0)` in light mode is a medium gray on pure white. This is used extensively for secondary text (`text-muted-foreground`). The contrast ratio of `oklch(0.556 0 0)` on `oklch(1 0 0)` is approximately 4.1:1 — barely passing WCAG AA for normal text and failing for small text.

3. **Near-invisible borders**: `--border: oklch(0.922 0 0)` and `--input: oklch(0.922 0 0)` are very light gray on white. Cards, inputs, and separators nearly disappear.

4. **Massive hardcoded dark-mode colors throughout components**: The new brief page (`brief/new/page.tsx`) is riddled with hardcoded dark-mode colors:
   - `bg-[#0D0D0D]`, `border-[#1F1F1F]`, `bg-[#1A1A1A]`, `text-white`, `text-[#919191]`, `border-[#333]`, `placeholder-[#666]`, `bg-[#111]`
   - These appear on lines 438, 462, 520, 527, 533, 538, 544, 570, 575, 592, 629, 633, etc.
   - The sidebar (`sidebar.tsx`) uses `text-[#9ca3b4]`, `text-[#7f8798]`
   - The topbar uses `bg-[#1A1A1A]`, `border-[#333]`, `text-[#919191]`
   - History page uses `text-[#919191]`
   - Dashboard components (`recommendation-cards.tsx`, `performance-chart.tsx`, `brief-slide-over.tsx`) are full of hardcoded hex colors

   **These hardcoded colors do NOT respond to theme switching.** In light mode, you get dark backgrounds with light text sitting on a white page, or elements that are invisible.

5. **Glass card utility**: The `glass-card` class uses `color-mix(in oklab, var(--card) 78%, transparent)` which produces a semi-transparent white on white in light mode — zero visual definition.

6. **Body background gradient**: The `body` background uses `color-mix(in oklab, var(--primary) 16%, transparent)` which in light mode mixes near-black at 16% opacity — potentially creating a faint muddy gradient that looks unintentional.

7. **Appearance section itself uses hardcoded dark colors**: `appearance-section.tsx` uses `text-white`, `border-white/10`, `bg-black/20` — the settings page for changing themes doesn't even work in light mode.

### Files / Systems Affected
- `src/app/globals.css` — theme token definitions (lines 50-83 for `:root`)
- `src/app/(dashboard)/brief/new/page.tsx` — heavily hardcoded dark colors
- `src/components/dashboard/sidebar.tsx` — hardcoded colors
- `src/components/dashboard/topbar.tsx` — hardcoded colors
- `src/components/dashboard/header.tsx` — hardcoded colors
- `src/components/dashboard/brief-slide-over.tsx` — hardcoded colors
- `src/components/dashboard/recommendation-cards.tsx` — hardcoded colors
- `src/components/dashboard/performance-chart.tsx` — hardcoded colors
- `src/components/dashboard/history-client.tsx` — likely hardcoded colors
- `src/components/dashboard/dashboard-shell.tsx` — hardcoded colors
- `src/components/settings/appearance-section.tsx` — hardcoded colors
- `src/components/brief/clarification-renderer.tsx` — uses theme tokens (fine)
- `src/app/(dashboard)/history/page.tsx` — hardcoded `text-[#919191]`
- Any other component using `text-[#...]`, `bg-[#...]`, `border-[#...]` hex literals

**CRITICAL: shadcn UI components have been manually edited with hardcoded dark colors** (despite `agents.md` saying "DO NOT edit manually"):
- `src/components/ui/card.tsx` — `border-[#1F1F1F] bg-[#0D0D0D]` (line 10)
- `src/components/ui/dialog.tsx` — `border-[#1F1F1F] bg-[#0D0D0D]` (line 64)
- `src/components/ui/button.tsx` — `bg-[#161B22] border-[#30363D]` for outline/secondary variants (lines 16, 18)
- `src/components/ui/input.tsx` — `border-[#333] bg-[#1A1A1A]` (line 11)
- `src/components/ui/textarea.tsx` — `border-[#333] bg-[#1A1A1A]` (line 10)
- `src/components/ui/tabs.tsx` — `bg-[#1A1A1A]` (line 33)
- `src/components/ui/tooltip.tsx` — `bg-[#1A1A1A] border-[#333]` (line 45)
- `src/components/connexa-logo.tsx` — hardcoded white SVG strokes (invisible on white background)

These shadcn overrides are the PRIMARY reason light mode looks broken — every card, dialog, input, button, and tooltip renders with a dark background regardless of theme.

### Implementation Steps

#### Step 1: Fix Light Mode Theme Tokens in `globals.css`
Update the `:root` (light mode) CSS variables:
- `--background`: Change from `oklch(1 0 0)` to a warm off-white (see Phase 5)
- `--card`: Slightly lighter or same as background, with visible distinction
- `--muted-foreground`: Darken to at least `oklch(0.45 0 0)` for better text contrast
- `--border`: Darken to at least `oklch(0.85 0 0)` for visible borders
- `--input`: Match or slightly darker than `--border`
- `--sidebar`: Should be distinguishable from `--background`
- `--sidebar-border`: Must be visible

#### Step 2: Audit and Replace Hardcoded Colors
Search the entire `src/` directory for these patterns and replace with theme-aware equivalents:
- `text-white` → `text-foreground` (or wrap in `dark:text-white text-foreground`)
- `text-[#919191]` → `text-muted-foreground`
- `text-[#9ca3b4]` → `text-muted-foreground`
- `text-[#666]` → `text-muted-foreground`
- `bg-[#0D0D0D]` → `bg-card`
- `bg-[#1A1A1A]` → `bg-muted` or `bg-input`
- `bg-[#111]` → `bg-muted`
- `border-[#1F1F1F]` → `border-border`
- `border-[#333]` → `border-border` or `border-input`
- `border-white/10` → `border-border`
- `bg-white/5` → `bg-accent` or `bg-muted`
- `bg-black/20` → `bg-muted`
- `placeholder-[#666]` → `placeholder:text-muted-foreground`

**Important**: Do NOT blindly find-and-replace. Review each instance in context. Some dark-only sections (like the search progress animation area) might intentionally be dark-themed. For those, use `dark:` prefix utilities.

#### Step 3: Fix shadcn UI Component Overrides
The shadcn UI components have been manually customized with hardcoded dark hex colors. These need to be changed to use CSS variable-based classes:

- `card.tsx`: Replace `border-[#1F1F1F] bg-[#0D0D0D]` → `border-border bg-card`
- `dialog.tsx`: Replace `border-[#1F1F1F] bg-[#0D0D0D]` → `border-border bg-card` (or `bg-popover`)
- `button.tsx` (outline): Replace `bg-[#161B22] border-[#30363D]` → `bg-secondary border-border`
- `button.tsx` (secondary): Replace `bg-[#161B22] border-[#30363D]` → `bg-secondary border-border`
- `input.tsx`: Replace `border-[#333] bg-[#1A1A1A]` → `border-input bg-input` (or `bg-muted`)
- `textarea.tsx`: Replace `border-[#333] bg-[#1A1A1A]` → `border-input bg-input`
- `tabs.tsx`: Replace `bg-[#1A1A1A]` → `bg-muted`
- `tooltip.tsx`: Replace `bg-[#1A1A1A] border-[#333]` → `bg-popover border-border`

Note: While `agents.md` says "DO NOT edit manually", these components have ALREADY been manually edited to add hardcoded dark colors. The fix is to replace those hardcoded values with theme tokens, which actually restores the theme-aware behavior shadcn intended.

#### Step 3b: Fix ConnexaLogo
`src/components/connexa-logo.tsx` has hardcoded `stroke="white"` and `fill="white"` in SVG elements. These are invisible on a white/light background. Change to use `currentColor` or add `dark:` variants.

#### Step 4: Fix the glass-card utility
Update `globals.css` to ensure `glass-card` has adequate contrast in light mode. Consider adding a subtle border or box-shadow in light mode instead of relying purely on transparency.

#### Step 4: Validate across all pages
Manually check or have the agent verify that these pages render correctly in both themes:
- Dashboard home
- Brief creation (mode select, simple form, detailed form, searching state)
- Brief detail / results
- History
- Settings
- Assistant chat
- Analytics

### Edge Cases / Risks
- **Some components may intentionally be dark**: The search progress area (`step === "searching"`) uses dark backgrounds with glow effects. These may need to stay dark in both themes or be redesigned for light mode. Consider wrapping them in a `dark` class container.
- **Hardcoded `indigo-*` Tailwind colors**: These are theme-independent and should generally work in both modes. No change needed.
- **Glass card backdrop-filter**: Works differently visually on light vs dark backgrounds. May need different opacity values per theme.
- **Chart components**: May use hardcoded colors for data visualization that need theme-aware alternatives.

### Dependencies
- Phase 5 (off-white background) should be implemented as part of this phase's token updates.
- Phase 4 (theme transition) can be implemented independently.

---

## Phase 4: Theme Switch Transition Animation

### Objective
Add a smooth CSS transition when switching between Light Mode and Dark Mode so the color change feels polished rather than jarring.

### Files / Systems Affected
- `src/components/theme-provider.tsx` — currently has `disableTransitionOnChange` set to `true`
- `src/app/globals.css` — add transition rules

### Current State
The `ThemeProvider` component (line 17) sets `disableTransitionOnChange` to `true`, which means `next-themes` adds a `<style>` tag that temporarily disables all CSS transitions during theme changes. This was likely done to avoid partial-transition glitches, but it completely prevents any animation.

### Implementation Steps

1. **Remove `disableTransitionOnChange`** from `ThemeProvider` (or set it to `false`). This allows CSS transitions to fire during theme switches.

2. **Add global transition rule** in `globals.css` at the `@layer base` level:
   ```css
   @layer base {
     *,
     *::before,
     *::after {
       transition-property: color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, box-shadow;
       transition-timing-function: ease-in-out;
       transition-duration: 200ms;
     }
   }
   ```

3. **Exclude elements that should NOT animate**:
   - Elements with existing `transition-*` classes may conflict. Use specificity or `!important` sparingly.
   - Exclude performance-heavy elements:
   ```css
   .no-theme-transition,
   .no-theme-transition *,
   canvas,
   video,
   iframe {
     transition-property: none !important;
   }
   ```

4. **Prevent layout-triggering transitions**: Only transition color-related properties. Never transition `transform`, `width`, `height`, `opacity` via this global rule — those should remain component-specific.

5. **Test for visual glitches**: Common issues include:
   - Dropdown menus or popovers mid-animation looking broken
   - Scroll position jumping
   - Images flashing
   - Skeleton/loading states transitioning oddly

### Edge Cases / Risks
- **Performance on large pages**: Transitioning `background-color` on hundreds of elements simultaneously can cause jank. The 200ms duration is short enough to mitigate this. If performance is an issue, consider applying the transition only to key layout elements (body, cards, sidebar, header) instead of `*`.
- **Framer Motion conflicts**: Components using `framer-motion` for animations may interfere. Test the brief creation page especially.
- **SSR hydration**: `next-themes` handles the `dark` class on the server. The transition should only fire on user-initiated theme changes, not on initial page load. Verify this by checking that `suppressHydrationWarning` on `<html>` is still present (it is, at line 24 of `layout.tsx`).

### Dependencies
- Should be implemented AFTER Phase 3 (contrast fixes), so that the transition animates between two well-designed themes.

---

## Phase 5: Off-White Light Mode Background

### Objective
Shift Light Mode from pure white (`oklch(1 0 0)`) to a warmer, off-white/cream-toned background for better aesthetics and reduced eye strain.

### Files / Systems Affected
- `src/app/globals.css` — `:root` theme variables

### Implementation Steps

1. **Update `:root` variables** in `globals.css`. Suggested palette (adjust to taste):

   | Variable | Current | Proposed | Rationale |
   |----------|---------|----------|-----------|
   | `--background` | `oklch(1 0 0)` | `oklch(0.975 0.005 80)` | Warm off-white, slight cream hue |
   | `--card` | `oklch(1 0 0)` | `oklch(0.985 0.003 80)` | Slightly lighter than background for card elevation |
   | `--popover` | `oklch(1 0 0)` | `oklch(0.985 0.003 80)` | Match card |
   | `--secondary` | `oklch(0.97 0 0)` | `oklch(0.955 0.005 80)` | Slightly darker warm tone |
   | `--muted` | `oklch(0.97 0 0)` | `oklch(0.955 0.005 80)` | Match secondary |
   | `--accent` | `oklch(0.97 0 0)` | `oklch(0.955 0.005 80)` | Match secondary |
   | `--sidebar` | `oklch(0.985 0 0)` | `oklch(0.965 0.005 80)` | Slightly darker for sidebar distinction |
   | `--border` | `oklch(0.922 0 0)` | `oklch(0.88 0.005 80)` | Warmer, more visible border |
   | `--input` | `oklch(0.922 0 0)` | `oklch(0.90 0.005 80)` | Slightly more visible input borders |
   | `--muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.44 0.01 80)` | Darker, warmer for better readability |

2. **Update body background gradient**: The gradient in `globals.css` line 126-130 uses `var(--primary)` which in light mode is near-black (`oklch(0.205 0 0)`). At 16% mix this creates a subtle dark wash. Consider using a warm accent color at low opacity for light mode, or conditionally applying the gradient only in dark mode:
   ```css
   .dark body {
     background-image: radial-gradient(...);
   }
   ```
   For light mode, either remove the gradient or use a very subtle warm gradient.

3. **Ensure coherence**: After changing background tokens, verify that:
   - Cards are visually distinct from the page background
   - Inputs are distinguishable from their container
   - Borders provide adequate separation
   - Hover states (`accent`) are visible against their parent
   - The sidebar is distinguishable from the main content area

### Edge Cases / Risks
- **Print styles**: The `@media print` block (line 356) hardcodes `background: #ffffff`. This is fine — print should remain pure white.
- **Color harmony**: The hue angle `80` in oklch gives a warm yellow-cream. If the design intent is cooler, use hue `240` for a blue-tinted off-white. Adjust to match branding preferences.
- **Range slider styling**: The `:root input[type="range"]` block (line 208) hardcodes `background: #d1d5db`. This should be updated to use the theme variable or a warm-toned gray.

### Dependencies
- This is part of Phase 3 (Light Mode contrast audit). Implement the token changes during Phase 3, Step 1.

---

## Phase 6: Brief Attachments (Detailed Mode Only)

### Objective
Add a button that allows users to attach files (images, documents, company files) to briefs in Detailed Mode. Attachments should be stored, associated with the brief, and optionally surfaced to the AI/pipeline.

### Files / Systems Affected

**Frontend:**
- `src/app/(dashboard)/brief/new/page.tsx` — add attachment UI in detailed mode form
- `src/components/brief/detailed-brief-form.tsx` — the actual detailed form component (12 structured fields, no file uploads currently)
- `src/app/(dashboard)/brief/[id]/page.tsx` — display attachments on brief detail
- `src/components/brief/brief-summary-card.tsx` — show attachment count/list
- `src/components/assistant/file-upload-button.tsx` — existing upload button component (reusable pattern)
- New component: `src/components/brief/attachment-uploader.tsx`
- New component: `src/components/brief/attachment-list.tsx`

**Backend/API:**
- New route: `src/app/api/brief/[briefId]/attachments/route.ts` — GET/POST for brief attachments
- Existing reference: `src/app/api/assistant/upload/route.ts` — use as pattern for upload logic

**Database:**
- New migration: `supabase/migrations/011_brief_attachments.sql`
- Update: `src/types/database.ts` — add `brief_attachments` table type

**Storage:**
- New Supabase storage bucket: `brief-attachments` (separate from existing `chat-attachments`)

### Existing Upload Infrastructure
The assistant upload route (`src/app/api/assistant/upload/route.ts`) already has:
- 10MB file size limit
- Allowed types: PDF, DOC, DOCX, TXT, CSV, PNG, JPG, JPEG
- File name sanitization
- Upload to Supabase storage (`chat-attachments` bucket)
- Signed URL generation (7-day expiry)
- Text content extraction for TXT/CSV files

This pattern should be reused for brief attachments.

### Implementation Steps

#### Step 1: Database Schema
Create `supabase/migrations/011_brief_attachments.sql`:

```sql
CREATE TABLE public.brief_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  brief_id uuid NOT NULL REFERENCES public.briefs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  storage_path text NOT NULL,
  text_content text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_brief_attachments_brief_id ON public.brief_attachments(brief_id);

ALTER TABLE public.brief_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own brief attachments"
  ON public.brief_attachments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own brief attachments"
  ON public.brief_attachments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND brief_id IN (SELECT id FROM public.briefs WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own brief attachments"
  ON public.brief_attachments FOR DELETE
  USING (user_id = auth.uid());
```

#### Step 2: Update TypeScript Types
Add `brief_attachments` table to `src/types/database.ts` following the existing pattern.

#### Step 3: Create Storage Bucket
The `brief-attachments` bucket needs to be created in Supabase. Document this as a manual step or add it to a setup script. The bucket should be private (not public).

#### Step 4: API Route
Create `src/app/api/brief/[briefId]/attachments/route.ts`:

- **POST**: Upload a file
  - Validate user owns the brief
  - Validate brief mode is `detailed`
  - Validate file type and size (reuse constants from assistant upload)
  - Upload to `brief-attachments/{user_id}/{brief_id}/{timestamp}-{uuid}-{sanitized_name}`
  - Insert row into `brief_attachments` table
  - Extract text content for TXT/CSV files
  - Return attachment metadata

- **GET**: List attachments for a brief
  - Validate user owns the brief
  - Return all attachments with signed URLs

#### Step 5: Frontend — Attachment Uploader Component
Create `src/components/brief/attachment-uploader.tsx`:
- Drag-and-drop zone + file picker button
- Show upload progress
- Display list of attached files with remove option
- Accept: PDF, DOC, DOCX, TXT, CSV, PNG, JPG, JPEG
- Max file size: 10MB
- Max attachments per brief: 10 (configurable in constants)

#### Step 6: Integrate into Brief Form
In `src/app/(dashboard)/brief/new/page.tsx`:
- Only render the attachment uploader when `mode === "detailed"`
- Place it after the "Project Description" textarea
- Store attachment IDs in component state
- On brief submission, attachments are already associated via `brief_id` (uploaded during form filling, not on submit)
- **Important**: Since the brief is created (inserted) before the form is fully submitted (line 282-296), attachments can be uploaded after the brief insert but before pipeline start. Alternatively, implement a two-phase approach:
  1. Upload files to a temporary location before brief creation
  2. Associate them with the brief after insert

  The simpler approach: create the brief first (which already happens), then allow attachment uploads targeting that brief_id.

#### Step 7: Display on Brief Detail Page
In `src/app/(dashboard)/brief/[id]/page.tsx`:
- Query `brief_attachments` for the brief
- Display in `BriefSummaryCard` or a new section
- Show file names, types, sizes, and download links (signed URLs)

#### Step 8: Pipeline Integration (Optional/Future)
If attachments should inform the AI:
- For text-extractable files (TXT, CSV), include `text_content` in the normalized brief's `optional` field
- For PDFs, consider adding text extraction (pdfjs or server-side)
- For images, consider adding image description via vision model
- This can be a follow-up phase — for now, attachments are stored and displayed but not fed to the pipeline

### Behavior on Reruns, History Views, and Resumed Briefs
- **Reruns**: Attachments remain associated with the brief. A rerun should use the same attachments.
- **History views**: Show attachment count in the history list item if > 0.
- **Resumed briefs (Phase 1)**: If a brief is in `clarifying` status and has attachments, the attachments should still be visible and accessible when resuming.
- **Brief deletion**: `ON DELETE CASCADE` ensures attachments are cleaned up in the database. Storage cleanup should be handled separately (Supabase lifecycle rules or a cleanup function).

### Edge Cases / Risks
- **Orphaned storage files**: If a brief is deleted, the database row cascades but the storage file remains. Consider adding a database trigger or a scheduled cleanup job.
- **File validation bypass**: Validate file type on both client and server. Don't trust `file.type` alone — also check the file extension (the assistant upload already does this).
- **Large files blocking the form**: Upload asynchronously so the user can continue filling out the form while files upload.
- **Signed URL expiry**: URLs expire after 7 days. If a user views a brief after 7 days, regenerate signed URLs on the fly (the GET route should always return fresh signed URLs).
- **Concurrent uploads**: If the user uploads multiple files simultaneously, ensure the API handles concurrent writes correctly (each upload is its own request, so this should be fine with Supabase).
- **Brief not yet created**: The current form flow creates the brief on submit. Attachments need a brief_id. Options:
  1. Create the brief in `draft` status when the user first adds an attachment, then update on submit
  2. Upload to a temp area and move on submit
  3. Hold files in browser memory until submit, then upload all at once

  Option 1 is simplest and aligns with the existing pattern where the brief is created before normalization.

### Dependencies
- Supabase storage bucket `brief-attachments` must be created
- New SQL migration must be applied
- `src/types/database.ts` must be updated
- No external package dependencies needed — file upload uses native browser APIs and Supabase storage

---

## Execution Order

The recommended execution order is:

1. **Phase 2** (Temporal context) — Smallest change, no risk, pure additive
2. **Phase 5** (Off-white background) — Token-only change in globals.css
3. **Phase 3** (Light Mode contrast) — Depends on Phase 5 tokens being set first
4. **Phase 4** (Theme transition) — Should come after contrast is fixed
5. **Phase 1** (Resume clarifications) — Independent, can be done in parallel with theme work
6. **Phase 6** (Attachments) — Largest scope, independent of other phases

Phases 1-4 can reasonably be shipped together. Phase 6 is a standalone feature that can be developed and shipped independently.
