# Update — UX Polish, Timeouts, Animations, Light Mode, Time Estimates

**Scope:** Single-agent sequential update. No database migrations. No new API routes.
**Risk level:** Low — all changes are UI/config-level with no data-model impact.
**Estimated files touched:** ~12

---

## 1. Simplify UX Language Inside Briefs

**Goal:** Remove jargon, make data digestible for non-technical users, and hide internal pipeline details.

### 1A — Result Card (`src/components/results/result-card.tsx`)

| Current wording | New wording |
|---|---|
| `Match Score: {score}` | `{score}% Match` |
| `Match Confidence: {tier.label}` | `Evidence Strength: {tier.label}` |
| `"Website confirmed services"` | `"Services verified on their website"` |
| `"Pricing signal identified"` | `"Pricing info found"` |
| `"Portfolio evidence found"` | `"Past work samples found"` |
| `"Industry match verified"` | `"Industry experience confirmed"` |
| `"Geography signal matched"` | `"Location checks out"` |
| `"Contact signal available"` | `"Contact info available"` |
| `"Limited public evidence extracted"` | `"Limited public info found"` |
| Tooltip title: `"Confidence drivers:"` | `"What we found:"` |
| Confidence summary: `"Strong evidence found for this match."` | `"We found strong supporting info for this match."` |
| Confidence summary: `"Partial evidence found; some fields inferred."` | `"Some info was estimated — review details before reaching out."` |
| Confidence summary: `"Limited evidence found; result may be approximate."` | `"Limited public info — this match may be less accurate."` |
| Section label: `"Pricing Signal"` | `"Pricing Info"` |
| Section label: `"Portfolio Evidence"` | `"Past Work"` |

**File changes:**

- `confidenceDrivers()` — rename strings (lines 48-57)
- `confidenceTier()` — rewrite `.summary` values (lines 21-45)
- Badge labels in JSX (lines 101, 181)
- Section headers (lines 144, 154)

### 1B — Score Breakdown Labels (`src/lib/constants.ts`)

Replace `SCORE_LABELS` (lines 116-123):

```typescript
export const SCORE_LABELS: Record<string, string> = {
  service_match: "Service Fit",
  budget_fit: "Budget Match",
  industry_fit: "Industry Experience",
  timeline_fit: "Timeline Fit",
  geo_fit: "Location Match",
  constraint_fit: "Meets Requirements",
}
```

Changes: `"Budget Alignment"` → `"Budget Match"`, `"Industry Relevance"` → `"Industry Experience"`, `"Timeline Compatibility"` → `"Timeline Fit"`, `"Requirements Met"` → `"Meets Requirements"`.

### 1C — Score Breakdown Visual Context (`src/components/results/score-breakdown.tsx`)

Add a qualitative label next to each numeric score so users understand what the number means:

```typescript
function scoreQualifier(score: number): string {
  if (score >= 90) return "Excellent"
  if (score >= 75) return "Good"
  if (score >= 60) return "Fair"
  if (score >= 40) return "Weak"
  return "Poor"
}
```

Render it next to the score:
```tsx
<span>{scoreQualifier(score)} ({score})</span>
```

### 1D — Low Confidence Tips (`src/components/brief/low-confidence-tips.tsx`)

Replace tips (lines 10-17):

| Current | New |
|---|---|
| `"Add more specific constraints so candidate filtering is tighter."` | `"Add more specific requirements to help narrow down results."` |
| `"Narrow geography to a specific state or metro when possible."` | `"Try narrowing location to a specific state or city."` |
| `"Add portfolio requirements to improve evidence-based matching."` | `"Mention the type of past work you'd like to see from matches."` |

### 1E — Pipeline Steps User-Facing Labels (`src/components/pipeline/pipeline-steps.tsx`)

Replace `PIPELINE_STEP_CONFIG` labels (lines 5-14):

| Current label | New label |
|---|---|
| `"Normalizing brief"` | `"Understanding your needs"` |
| `"Planning search queries"` | `"Planning the search"` |
| `"Searching the web"` | `"Searching for matches"` |
| `"Triaging candidates"` | `"Filtering results"` |
| `"Fetching evidence"` | `"Gathering details"` |
| `"Extracting company data"` | `"Reading company pages"` |
| `"Scoring matches"` | `"Rating each match"` |
| `"Ranking results"` | `"Ranking your top picks"` |

### 1F — Run Status Poller (`src/components/pipeline/run-status-poller.tsx`)

- Replace `"Match confidence: {tier.label}"` → `"Result quality: {tier.label}"` (line 207)
- Replace `"What the AI is searching"` → `"Currently searching for"` (line 226)
- Replace each `"Searching: {query}"` → just `{query}` (line 230) — "Searching:" prefix is redundant under a "Currently searching for" heading
- Replace `"Step {n} of {total}: {label}"` → `"{label}"` only (line 182) — remove "Step X of Y" prefix; the progress bar already conveys position. Keep substep text.

### 1G — Brief Detail Page (`src/app/(dashboard)/brief/[id]/page.tsx`)

- Replace `"Review brief context and ranked provider matches."` → `"Your brief summary and matched providers."` (line 200)
- Replace `"AI duration: {duration}"` → `"Search took {duration}"` (line 173) — `"AI duration"` is too technical
- Replace `"Fewer than 5 results were found. Consider relaxing constraints or widening geography."` → `"Fewer than 5 matches found. Try broadening your requirements or location."` (line 277)
- Replace `"No results yet. If the run is still active, this page will update as status changes."` → `"No results yet. If your search is still running, results will appear here automatically."` (line 264)

### 1H — Brief Summary Card (`src/components/brief/brief-summary-card.tsx`)

- Replace `"No normalized brief data available."` → `"Brief details are not available yet."` (line 49)
- Replace `"No constraints specified."` → `"None specified."` (line 95)
- Section label `"Constraints"` → `"Additional Requirements"` (line 87)

---

## 2. Increase Search Timeout Values

**Goal:** Runs are too slow for the current timeouts. Increase defaults significantly so deep runs don't timeout prematurely.

### File: `src/lib/constants.ts` (lines 50-53)

```typescript
// BEFORE
const DEFAULT_PIPELINE_TIMEOUTS = {
  STANDARD_MS: 3 * 60 * 1000,     // 3 minutes
  DEEP_MS: 15 * 60 * 1000,        // 15 minutes
} as const

// AFTER
const DEFAULT_PIPELINE_TIMEOUTS = {
  STANDARD_MS: 8 * 60 * 1000,     // 8 minutes
  DEEP_MS: 60 * 60 * 1000,        // 60 minutes (1 hour)
} as const
```

**Rationale:**
- Standard (Simple mode): was 3 min, now 8 min. Gives the standard pipeline ~5 minutes of actual execution headroom.
- Deep (Thorough mode): was 15 min, now 60 min (1 hour). Deep crawls 100 pages and processes up to 80 shortlist candidates — this needs serious time.

### File: `src/lib/pipeline/orchestrator.ts`

Adjust step timeout ceilings upward to match:

| Step | Current max | New max |
|---|---|---|
| `query_plan` | `45_000` | `90_000` |
| `search` | `150_000` | `300_000` |
| `triage` | `30_000` | `60_000` |
| `evidence` | `180_000` | `600_000` |
| `extract` | `150_000` | `600_000` |
| `score` | `120_000` | `300_000` |
| `rank` | `20_000` | `40_000` |

The proportional floor calculations (`Math.floor(timeoutMs * X)`) can stay the same — only the `Math.min` caps need to be raised. The exact ceilings will prevent runaway steps while still giving deep runs enough room.

### File: `src/components/pipeline/run-status-poller.tsx`

Update the deep-search banner text (line 211-213):
```tsx
// BEFORE
"Thorough search may take a while. You can come back later."

// AFTER
"Thorough searches can take up to an hour. Feel free to close this page — we'll keep searching."
```

---

## 3. Improved New Brief Loading Animation

**Goal:** Replace the basic `PreparingPipelineCard` spinner with a richer orb + step indicator animation inspired by `dashboard-redesign/app/(app)/new-brief/page.tsx`, but only for the Create New Brief page.

### File: `src/app/(dashboard)/brief/new/page.tsx`

**Replace** the current `PreparingPipelineCard` component (lines 131-178) with a new `PreparingPipelineAnimation` component. Keep it in the same file.

#### Design spec (adapted from dashboard-redesign):

1. **Animated Orb** — centered pulsing circle (w-28 h-28):
   - Outer ring: `animate-pulse` with indigo glow, `scale(1) → scale(1.15)` slow oscillation (3s)
   - Middle ring: slow `rotate` animation (20s infinite linear), indigo-500/20 border
   - Inner gradient orb: `bg-gradient-to-br from-indigo-500 to-violet-600`, subtle `scale` pulse (2.5s)
   - Icon in center: cycle through step icons using a `useEffect` interval matching `activeStepIndex`. Icons: `Search`, `Brain`, `Target`, `Sparkles`, `Shield` (from lucide-react). Use `AnimatePresence` + `motion.div` for icon swap with fade + scale transition.

2. **Step indicators** — row of small circles below the orb:
   - Each step gets a circle: completed = filled emerald, active = filled indigo with 3 bouncing dots animation, pending = hollow gray
   - Labels below each circle in `text-[11px]` with truncated step text
   - Max 5 visible indicators (group the 8 preparation steps into 5 display groups)

3. **Progress bar** — full-width bar below step indicators:
   - Track: `bg-[#1A1A1A]` rounded
   - Fill: `bg-gradient-to-r from-indigo-500 to-violet-500` with width transition
   - Progress = `(activeStepIndex / steps.length) * 100`

4. **Active step text** — below progress bar:
   - Use `AnimatePresence` with `mode="wait"` for slide-up + fade transition
   - Show current `steps[activeStepIndex]` text in `text-sm text-white`

5. **Celebration state** — when `runStarted && runId` transition occurs:
   - Before switching to `RunStatusPoller`, briefly show (600ms):
     - Orb turns emerald gradient
     - Checkmark icon replaces cycling icons
     - Text: "Search started!"
   - Then transition to the `RunStatusPoller` as currently happens

#### Framer Motion variants to use:

```typescript
const orbPulse = {
  animate: {
    scale: [1, 1.15, 1],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
}

const iconSwap = {
  initial: { opacity: 0, scale: 0.6 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.6 },
}
```

#### Styling constraints:
- Keep the same `rounded-2xl border border-[#1F1F1F] bg-[#0D0D0D] p-8` container styling
- Keep dark-theme-only styling (this animation only runs in dark mode contextually — but don't add dark: prefixes; the `bg-[#0D0D0D]` hex values make it dark-native)
- Respect `prefers-reduced-motion` — fall back to the current simple spinner if the user has reduced motion enabled

#### New imports needed:
```typescript
import { Search, Brain, Target, Sparkles, Shield } from "lucide-react"
```

`Brain` is already in lucide-react. If it causes build issues, substitute `Cpu`.

---

## 4. Light Mode Contrast — Logo & UI Elements

**Goal:** When the theme is `light`, the ConnexaAI logo text switches from white to near-black, and any hardcoded dark-theme colors in shared components get light-mode overrides. **DO NOT change any dark mode styles.**

### 4A — Logo Component (`src/components/connexa-logo.tsx`)

**Current** (line 33):
```tsx
<span className="text-xl font-semibold tracking-tight text-white">
```

**New:**
```tsx
<span className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
```

This uses Tailwind's `dark:` variant. In light mode the text will be near-black (`text-gray-900`). In dark mode it stays white.

### 4B — Globals CSS Light-Mode Body Gradient (`src/app/globals.css`)

The `body` background gradient (lines 126-131) uses `var(--primary)` and `#60a5fa` which are appropriate for dark mode. In light mode, these radial gradients can be too strong against the white background.

Add a light-mode-specific override in `@layer base`:

```css
@media (prefers-color-scheme: light) {
  /* Handled by class-based theme, but keep as fallback */
}
```

Actually, since we use `class`-based theming (not `prefers-color-scheme`), we need to scope via `:root` (which IS light mode since `defaultTheme` is dark and dark is `.dark`):

The current gradients use `var(--primary)` at 16%/9% opacity and `#60a5fa` at 14% — these are subtle enough for light mode. **No CSS changes needed here.**

### 4C — Range Slider Light Mode (`src/app/globals.css`)

The range slider styles (lines 208-242) are hardcoded dark:

```css
input[type="range"] {
  background: #333;
}
input[type="range"]::-webkit-slider-thumb {
  border: 2px solid #0D0D0D;
}
```

Add `:root` (light mode) overrides **above** the existing rules:

```css
:root input[type="range"] {
  background: #d1d5db;
}

:root input[type="range"]::-webkit-slider-thumb {
  border: 2px solid #ffffff;
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.25);
}

:root input[type="range"]::-webkit-slider-thumb:hover {
  box-shadow: 0 0 14px rgba(99, 102, 241, 0.4);
}

:root input[type="range"]::-moz-range-thumb {
  border: 2px solid #ffffff;
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.25);
}
```

Then wrap existing dark rules inside `.dark`:

```css
.dark input[type="range"] {
  background: #333;
}
/* ... existing dark styles ... */
```

### 4D — Date Input Calendar Icon (`src/app/globals.css`)

The date picker icon is `filter: invert(1)` (line 247), which turns it white for dark mode but makes it invisible on white backgrounds.

```css
/* Light mode - no inversion needed */
input[type="date"]::-webkit-calendar-picker-indicator {
  cursor: pointer;
}

/* Dark mode - invert to white */
.dark input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
  cursor: pointer;
}
```

### 4E — Hardcoded Color Audit in Shared Components

Several components use hardcoded hex colors that look correct in dark mode but may have poor contrast in light mode. The following need `dark:` prefixed alternatives **only where they appear in light-mode-visible contexts**:

| File | Current class | Light mode addition |
|---|---|---|
| `run-status-poller.tsx` line 191 | `bg-card` (already uses CSS var) | No change needed |
| `brief-summary-card.tsx` | Uses `text-muted-foreground` (CSS var) | No change needed |
| `score-breakdown.tsx` line 24 | `bg-[#30363D]` (bar track) | Add: `bg-gray-200 dark:bg-[#30363D]` |
| `result-card.tsx` line 136 | `text-[#919191]` (geography) | Add: `text-gray-500 dark:text-[#919191]` |
| `result-card.tsx` line 148 | `text-[#919191]` (pricing evidence) | Add: `text-gray-500 dark:text-[#919191]` |

**Important:** Only add `dark:` variants to classes that use hardcoded hex colors. Anything using CSS variables (`text-muted-foreground`, `bg-card`, etc.) already adapts to the theme automatically.

---

## 5. Update Time Estimates on Create New Brief Page

### File: `src/app/(dashboard)/brief/new/page.tsx`

#### 5A — Simple Mode Time Label (line 549-553)

```tsx
// BEFORE
<div className="mt-6 flex items-center gap-2 text-sm text-indigo-400">
  <span>Quick &amp; Easy</span>
  <span className="text-[#333]">•</span>
  <span>1 min</span>
</div>

// AFTER
<div className="mt-6 flex items-center gap-2 text-sm text-indigo-400">
  <span>Quick &amp; Easy</span>
  <span className="text-[#333]">•</span>
  <span>~5 min</span>
</div>
```

#### 5B — Detailed Mode Time Label (lines 573-577)

```tsx
// BEFORE
<div className="mt-6 flex items-center gap-2 text-sm text-indigo-400">
  <span>Precise Results</span>
  <span className="text-[#333]">•</span>
  <span>3-5 min</span>
</div>

// AFTER
<div className="mt-6 flex items-center gap-2 text-sm text-indigo-400">
  <span>Precise Results</span>
  <span className="text-[#333]">•</span>
  <span>10 min — 1 hr</span>
</div>
```

#### 5C — Deep Search Warning Dialog (lines 903-906)

Update the thorough mode warning dialog description to reflect the new time range:

```tsx
// BEFORE
<DialogDescription>
  Thorough mode can take longer and may use significantly more credits.
</DialogDescription>

// AFTER
<DialogDescription>
  Thorough mode searches more broadly and can take 10 minutes to 1 hour. You can close this page and come back later.
</DialogDescription>
```

#### 5D — Quick Search Description (lines 648-649)

```tsx
// BEFORE
<p className="text-xs opacity-80">Faster search with focused coverage.</p>

// AFTER
<p className="text-xs opacity-80">Fast search, usually done in ~5 minutes.</p>
```

#### 5E — Thorough Search Description (lines 659-660)

```tsx
// BEFORE
<p className="text-xs opacity-80">Broader crawl, more candidates, slower search.</p>

// AFTER
<p className="text-xs opacity-80">Deeper search across more sources. Can take up to an hour.</p>
```

---

## File-Level Impact Summary

| # | File | Sections | Change type |
|---|---|---|---|
| 1 | `src/components/results/result-card.tsx` | 1A, 4E | String rewrites, light-mode class additions |
| 2 | `src/lib/constants.ts` | 1B, 2 | Label changes, timeout increases |
| 3 | `src/components/results/score-breakdown.tsx` | 1C, 4E | Add qualifier function, light-mode bar track |
| 4 | `src/components/brief/low-confidence-tips.tsx` | 1D | String rewrites |
| 5 | `src/components/pipeline/pipeline-steps.tsx` | 1E | Label rewrites |
| 6 | `src/components/pipeline/run-status-poller.tsx` | 1F, 2 | Label rewrites, banner text update |
| 7 | `src/app/(dashboard)/brief/[id]/page.tsx` | 1G | String rewrites |
| 8 | `src/components/brief/brief-summary-card.tsx` | 1H | String rewrites |
| 9 | `src/app/(dashboard)/brief/new/page.tsx` | 3, 5 | Animation rebuild, time estimate updates |
| 10 | `src/components/connexa-logo.tsx` | 4A | Add dark: variant for text color |
| 11 | `src/app/globals.css` | 4C, 4D | Scope slider/date styles by theme class |
| 12 | `src/lib/pipeline/orchestrator.ts` | 2 | Raise step timeout ceilings |

---

## Acceptance Criteria

- [ ] All result card labels use plain language — no "signals", "evidence", "drivers"
- [ ] Score breakdown shows qualitative label ("Good", "Fair", etc.) next to numeric scores
- [ ] Pipeline step labels are user-friendly throughout running state
- [ ] Standard pipeline timeout is 8 minutes; Deep is 60 minutes
- [ ] Step-level timeout ceilings are raised proportionally in orchestrator
- [ ] PreparingPipelineCard replaced with animated orb + step indicators + progress bar
- [ ] Animation respects `prefers-reduced-motion` media query
- [ ] ConnexaAI logo text is dark in light mode, white in dark mode
- [ ] Range slider and date picker calendar icon are properly themed for both modes
- [ ] Score breakdown bar track is visible in light mode (`bg-gray-200`)
- [ ] Simple mode shows "~5 min" time estimate
- [ ] Detailed mode shows "10 min — 1 hr" time estimate
- [ ] Thorough search description and warning reflect new time range
- [ ] **Zero dark mode regressions** — all existing `.dark` and hardcoded dark-theme styles untouched

---

## Validation Plan

1. **String audit:** `grep` for any remaining instances of "signal", "evidence", "confidence driver" in user-facing text
2. **Light mode visual check:** Toggle theme to light → verify logo, sliders, score breakdown bars, date picker icons all have adequate contrast
3. **Dark mode regression:** Toggle back to dark → verify nothing changed
4. **Timeout test:** Start a Deep run → confirm it does not timeout at 15 min → let it run past 20+ minutes
5. **Animation test:** Create a new brief → verify orb animation plays during the "preparing" phase → verify it transitions to RunStatusPoller after pipeline starts
6. **Reduced motion test:** Enable `prefers-reduced-motion: reduce` in browser dev tools → verify fallback to simple spinner
7. **Time estimate labels:** Visit Create New Brief page → verify "~5 min" and "10 min — 1 hr" text is displayed
8. **Mobile check:** Verify orb animation is responsive and doesn't overflow on small screens

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Orb animation janky on low-end devices | Poor UX | `prefers-reduced-motion` fallback; use `will-change: transform` on animated elements |
| 60-minute deep timeout allows runaway LLM spend | Cost | Per-step ceilings cap individual steps; OpenRouter has per-request max_tokens limits |
| Light mode color additions break dark mode | Visual regression | All additions use `dark:` prefixed variants; existing hex values remain inside `.dark` scope |
| `Brain` icon not in lucide-react version | Build error | Fallback to `Cpu` icon; both are available in lucide-react ≥0.300 |
