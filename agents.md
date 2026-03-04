# ConnexaAI Dashboard — Agent Reference

> This file is the single source of truth for AI agents working on this codebase.
> Read this before making any changes.

---

## What This Project Is

ConnexaAI is a B2B sourcing engine. Clients submit briefs (natural language or structured form), the system discovers providers via Tavily web search, normalizes/scores candidates with LLMs via OpenRouter, and returns ranked top-5 results with explainability.

**Phase 1 scope**: External discovery only — no internal provider database, no automated outreach.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, TypeScript) | 16.x |
| React | React | 19.x |
| Auth + DB | Supabase (Postgres + RLS + Auth) | @supabase/ssr 0.9, @supabase/supabase-js 2.98 |
| UI | shadcn/ui (new-york style) + Tailwind CSS v4 | shadcn 3.x |
| Forms | react-hook-form + @hookform/resolvers | 7.x |
| Validation | Zod | 4.x |
| Icons | lucide-react | 0.576 |
| Toasts | sonner | 2.x |
| LLM | OpenRouter (OpenAI-compatible API) | — |
| Web Search | Tavily (Search + Extract APIs) | — |
| Theming | next-themes | 0.4 |
| Colors | oklch color space via CSS variables | — |

---

## Project Structure

```
connexa-dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx                     # Root layout (Geist fonts, ThemeProvider)
│   │   ├── globals.css                    # Tailwind v4 imports, CSS variables, light/dark theme
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── reset-password/page.tsx
│   │   │   └── callback/route.ts          # OAuth code → session exchange
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                 # Sidebar + Topbar shell (server component)
│   │   │   ├── page.tsx                   # Dashboard home (recent briefs list)
│   │   │   ├── brief/
│   │   │   │   ├── new/page.tsx           # New brief (mode selector → form)
│   │   │   │   └── [id]/page.tsx          # Brief detail + results
│   │   │   ├── history/page.tsx           # All past briefs
│   │   │   └── settings/page.tsx          # Profile + account management
│   │   └── api/
│   │       ├── pipeline/
│   │       │   ├── start/route.ts         # POST: kick off discovery run
│   │       │   └── status/[runId]/route.ts # GET: poll run status
│   │       ├── brief/
│   │       │   ├── normalize/route.ts     # POST: NL → structured brief
│   │       │   └── clarify/route.ts       # POST: generate clarification questions
│   │       └── account/
│   │           └── delete/route.ts        # DELETE: account deletion
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                  # Browser client (createBrowserClient)
│   │   │   ├── server.ts                  # Server component client (cookie-aware)
│   │   │   ├── admin.ts                   # Service-role client (bypasses RLS)
│   │   │   └── ensure-profile.ts          # Syncs auth user → profiles table
│   │   ├── pipeline/
│   │   │   ├── orchestrator.ts            # Main runPipeline() coordinator
│   │   │   ├── query-plan.ts              # Stage 1: generate search queries
│   │   │   ├── tavily.ts                  # Stage 2: search + extract wrappers
│   │   │   ├── triage.ts                  # Stage 2.1: dedup + shortlist
│   │   │   ├── extract.ts                 # Stage 4: LLM structured extraction
│   │   │   ├── score.ts                   # Stage 5: weighted scoring
│   │   │   └── rank.ts                    # Stage 6: ranking + top-5 selection
│   │   ├── openrouter.ts                  # OpenRouter API wrapper
│   │   ├── schemas.ts                     # All Zod schemas
│   │   ├── constants.ts                   # Limits, weights, blocklists, model config
│   │   └── utils.ts                       # cn() helper (clsx + tailwind-merge)
│   ├── types/
│   │   ├── index.ts                       # App types (inferred from Zod schemas)
│   │   └── database.ts                    # Supabase-generated table types
│   ├── components/
│   │   ├── ui/                            # shadcn components (DO NOT edit manually)
│   │   ├── auth/                          # login-form, signup-form, oauth-button
│   │   ├── brief/                         # mode-selector, simple/detailed forms, clarification-renderer
│   │   ├── results/                       # result-card, score-breakdown, reasoning-panel, contact-suggestion
│   │   ├── dashboard/                     # sidebar, topbar, brief-list-item, empty-state
│   │   ├── pipeline/                      # run-status-poller
│   │   └── settings/                      # profile-form, delete-account-dialog
│   └── middleware.ts                      # Auth guard (redirects unauthenticated users)
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql         # Full schema: profiles, briefs, brief_questions, runs, results
├── public/                                # Static assets
├── components.json                        # shadcn config (new-york, RSC, lucide)
├── package.json
├── tsconfig.json                          # Strict mode, @/* path alias
├── next.config.ts
└── postcss.config.mjs                     # @tailwindcss/postcss v4
```

---

## Conventions

### File Naming
- Components: **kebab-case** filenames, **PascalCase** exports (`login-form.tsx` → `export function LoginForm`)
- Non-component modules: **kebab-case** (`query-plan.ts`, `ensure-profile.ts`)

### Client vs Server Components
- Pages under `(dashboard)/` are **server components** by default (async, fetch data directly)
- Interactive components use `"use client"` directive at top of file
- Forms, buttons with onClick, useRouter, useState/useEffect → client components
- Data-fetching layouts and pages → server components

### Imports
```tsx
// Always use the @/ alias — never relative paths across directories
import { SomeComponent } from "@/components/feature/some-component"
import { someUtil } from "@/lib/utils"
import type { SomeType } from "@/types"
```

### Styling
- **Tailwind utility classes only** — no inline styles, no CSS modules
- Use `cn()` from `@/lib/utils` for conditional class merging
- Theme colors via CSS variables: `bg-primary`, `text-muted-foreground`, `border-border`, etc.
- oklch color space in `globals.css` — light/dark themes defined there
- Radius tokens: `rounded-sm`, `rounded-md`, `rounded-lg` (all derived from `--radius`)

### Forms
- `react-hook-form` for form state management
- Zod schemas for validation (via `@hookform/resolvers/zod`)
- `sonner` for toast feedback: `toast.success()`, `toast.error()`, `toast.info()`
- Submit handlers disable the button and show loading state during API calls

### Types
- All domain types are **inferred from Zod schemas** in `src/types/index.ts`
- Database row types are in `src/types/database.ts` (manually maintained to match Supabase schema)
- Never duplicate type definitions — if a Zod schema exists, infer from it

### API Routes
- All under `src/app/api/`
- Return `NextResponse.json()` with `{ data }` on success, `{ error: string }` on failure
- Use appropriate HTTP status codes
- Pipeline writes use `createAdminClient()` (service role, bypasses RLS)
- User-facing reads use `createClient()` from `@/lib/supabase/server` (respects RLS)

---

## Supabase

### Three Client Types
| Client | File | When to Use |
|--------|------|-------------|
| Browser | `lib/supabase/client.ts` | Client components (`"use client"`) |
| Server | `lib/supabase/server.ts` | Server components, API routes (user-scoped) |
| Admin | `lib/supabase/admin.ts` | Pipeline writes, admin operations (bypasses RLS) |

### Row Level Security
- **profiles**: users read/update their own row only
- **briefs**: users CRUD their own briefs only
- **brief_questions**: users CRUD questions for their own briefs
- **runs**: users can READ runs for their own briefs; only admin client can INSERT/UPDATE
- **results**: users can READ results for their own briefs; only admin client can INSERT/UPDATE

### Database Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User profile (synced from auth.users via trigger) |
| `briefs` | Sourcing briefs (simple or detailed mode) |
| `brief_questions` | Clarification Q&A for low-confidence simple briefs |
| `runs` | Pipeline execution records |
| `results` | Ranked provider results per run |

### Key Enums
- `brief_mode`: simple, detailed
- `brief_status`: draft, clarifying, running, complete, failed
- `run_status`: running, complete, failed

---

## Pipeline Architecture

The discovery pipeline runs asynchronously after a brief is submitted. It is fire-and-forget from the API route (the frontend polls for status).

### Stages
1. **Query Plan** (`query-plan.ts`) — LLM generates 5-12 Tavily search queries from the normalized brief
2. **Search** (`tavily.ts`) — Concurrent Tavily API calls, max 12 queries, 8 results each
3. **Triage** (`triage.ts`) — Dedup by domain, filter blocklist, shortlist top 20 candidates
4. **Evidence Fetch** (`tavily.ts` extract) — Tavily Extract API fetches full page content for shortlisted URLs
5. **Extraction** (`extract.ts`) — LLM extracts structured company data from page content
6. **Scoring** (`score.ts`) — Weighted multi-criteria scoring (6 dimensions, 0-100 each)
7. **Ranking** (`rank.ts`) — Sort by overall score, return top 5

### Hard Limits (from `constants.ts`)
```
MAX_TAVILY_QUERIES: 12
MAX_RESULTS_PER_QUERY: 8
MAX_TOTAL_RAW_RESULTS: 80
MAX_SHORTLIST_CANDIDATES: 20
MAX_PAGE_FETCHES: 20
MAX_TOKENS_PER_PAGE: 1800
TOP_RESULTS: 5
```

### Scoring Weights (default)
```
service_match:  0.30
industry_fit:   0.20
budget_fit:     0.15
geo_fit:        0.15
timeline_fit:   0.10
constraint_fit: 0.10
```

### LLM Models (via OpenRouter)
- **CHEAP** — Configurable via `OPENROUTER_CHEAP_MODEL` env var (default: `openai/gpt-4o-mini`). Used for query planning, normalization, clarification generation.
- **STRONG** — Configurable via `OPENROUTER_STRONG_MODEL` env var (default: `openai/gpt-4o`). Used for extraction, scoring, reasoning.

---

## Auth Flow

1. **Middleware** (`src/middleware.ts`) refreshes the Supabase session on every request and redirects unauthenticated users to `/login`
2. **Login**: email/password via `signInWithPassword()` or Google OAuth via `signInWithOAuth()`
3. **Signup**: `signUp()` with `full_name` in user metadata
4. **OAuth callback**: `/callback/route.ts` exchanges the code for a session
5. **Profile sync**: `ensure-profile.ts` creates/updates the `profiles` row from auth user data

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=         # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=        # Service role key (server-only, bypasses RLS)

# OpenRouter
OPENROUTER_API_KEY=               # OpenRouter API key
OPENROUTER_CHEAP_MODEL=           # Optional: override cheap model (default: openai/gpt-4o-mini)
OPENROUTER_STRONG_MODEL=          # Optional: override strong model (default: openai/gpt-4o)

# Tavily
TAVILY_API_KEY=                   # Tavily search API key

# App
NEXT_PUBLIC_APP_URL=              # Base URL (http://localhost:3000 for dev)
```

---

## shadcn/ui Components

Installed components (in `src/components/ui/`):
avatar, badge, button, card, dialog, dropdown-menu, form, input, label, progress, select, separator, skeleton, sonner, tabs, textarea

To add more: `npx shadcn@latest add <component-name>`

**Do not manually edit files in `src/components/ui/`** — they are managed by shadcn CLI. If you need to customize, create a wrapper component in the appropriate feature directory.

---

## Design System Notes

The current UI is **intentionally generic** — a functional scaffold designed to be easily reskinned later. When updating the design:

- All theme colors are in `src/app/globals.css` as CSS custom properties (oklch values)
- Light and dark modes are both defined — changes to one should be mirrored in the other
- The `--radius` variable controls all border-radius values globally
- shadcn's `new-york` style variant is used (more opinionated than `default`)
- Sidebar and topbar are in `src/components/dashboard/` — layout structure is in `(dashboard)/layout.tsx`
- There is no custom brand typography yet — uses Geist Sans/Mono from Next.js

---

## Common Tasks for Future Development

### Adding a new page
1. Create `src/app/(dashboard)/your-page/page.tsx`
2. If it needs auth data, make it an async server component and use `createClient()` from `@/lib/supabase/server`
3. Add nav link in `src/components/dashboard/sidebar.tsx`

### Adding a new API route
1. Create `src/app/api/your-route/route.ts`
2. Export named functions: `GET`, `POST`, `DELETE`, etc.
3. For user-scoped data: use `createClient()` from server
4. For admin operations: use `createAdminClient()` from admin

### Adding a new shadcn component
```bash
npx shadcn@latest add <component-name>
```

### Adding a new database table
1. Create a new migration file in `supabase/migrations/`
2. Add RLS policies matching the existing pattern (users access their own data)
3. Update `src/types/database.ts` with the new table types
4. If the table has a Zod schema, add it to `src/lib/schemas.ts` and export the inferred type from `src/types/index.ts`

### Modifying the pipeline
- Each stage is a separate module in `src/lib/pipeline/`
- The orchestrator calls them in sequence — add new stages there
- Update `constants.ts` if adding new limits
- Pipeline failures should always set `runs.status = 'failed'` with a descriptive note

---

## Things to Watch Out For

- **Zod v4**: This project uses Zod 4 (not v3). Some API differences exist — `z.infer` works the same, but check Zod 4 docs for edge cases.
- **Tailwind v4**: Uses the new PostCSS-based setup (`@tailwindcss/postcss`), not the legacy `tailwind.config.js`. Theme configuration is in `globals.css`, not a config file.
- **Next.js 16**: Uses latest App Router conventions. No `getServerSideProps` — use async server components or route handlers.
- **React 19**: Supports server components natively. `use client` directive is required for any component using hooks, event handlers, or browser APIs.
- **Pipeline runs async**: The `/api/pipeline/start` route fires the pipeline and returns immediately. The frontend polls `/api/pipeline/status/[runId]` until completion.
- **Admin client for pipeline writes**: The pipeline orchestrator uses the service-role client because regular users don't have INSERT/UPDATE policies on `runs` and `results` tables.
