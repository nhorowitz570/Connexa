# UI Redesign & Consistency Plan -- Connexa Dashboard

---

## 1. Design Direction & Moodboard Summary

The Connexa redesign adopts a **dark-first, enterprise-grade SaaS aesthetic** built around a deep charcoal canvas (`#0D1117`) with indigo (`#6366f1` / `#4F6EF7`) as the primary accent color. The design philosophy centers on: **generous whitespace** with 24px card padding and `gap-6` section rhythm; **ultra-low-contrast surface layering** (`#0D0D0D` cards on `#0D1117` backgrounds with `#161B22` elevated surfaces); **indigo as the single accent thread** tying together CTAs, active states, chart gradients, focus rings, rank badges, and the ConnexaAI logo; **restrained typography** using Space Grotesk at a limited scale (14px body, 20-30px headings, 48px hero metrics) with font-medium/semibold only; and **smooth micro-interactions** (200-300ms transitions, `hover:border-indigo-500/50` on cards, `animate-in fade-in` page entries, pulsing active indicators). Both the dashboard and login flow will share this exact design language so that navigating between authentication and the main app feels seamless -- same dark surfaces, same indigo highlights, same typographic scale, same component DNA.

---

## 2. Global Style Guide Updates (New Design System)

### 2.1 Color Palette

| Token | Light (Keep for accessibility) | Dark (Primary -- design target) | Hex Approx |
|---|---|---|---|
| `--background` | `oklch(1 0 0)` | **Page bg: hardcoded `#0D1117`** | `#0D1117` |
| `--card` | `oklch(1 0 0)` | **Card bg: hardcoded `#0D0D0D`** | `#0D0D0D` |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | White |
| `--muted-foreground` | `oklch(0.556 0 0)` | **`#919191`** | Medium gray |
| `--border` | `oklch(0.922 0 0)` | **`#1F1F1F`** (cards) / **`#30363D`** (sidebar/elevated) | Dark borders |
| `--input` | `oklch(0.922 0 0)` | **`#1A1A1A`** bg + **`#333`** border | Dark input |
| **Indigo Primary** | N/A | **`#6366f1`** / **`#4F6EF7`** | Indigo-500/600 |
| **Indigo Hover** | N/A | **`#4f46e5`** (indigo-700) | Darker indigo |
| **Indigo Ghost** | N/A | **`indigo-500/10`** to **`indigo-500/20`** | Transparent indigo |
| Elevated Surface | N/A | **`#161B22`** | Sidebar, result cards |
| Hover Row | N/A | **`#1A1A1A`** | Table hover |

**Semantic Status Colors (Dark Mode)**

| Status | Background | Text |
|---|---|---|
| Draft | `bg-[#333]` | `text-[#919191]` |
| Clarifying | `bg-amber-500/20` | `text-amber-400` |
| Running | `bg-blue-500/20` | `text-blue-400` |
| Complete | `bg-emerald-500/20` | `text-emerald-400` |
| Failed | `bg-red-500/20` | `text-red-400` |

**Score Colors (Dark Mode)**

| Tier | Text | Bar/Badge bg |
|---|---|---|
| >= 90 | `text-emerald-400` | `bg-emerald-500` |
| 80-89 | `text-indigo-400` | `bg-indigo-500` |
| 70-79 | `text-blue-400` | `bg-blue-500` |
| < 70 | `text-amber-400` | `bg-amber-500` |

### 2.2 Typography Scale & Font Weights

| Use Case | Class | Size | Weight |
|---|---|---|---|
| Hero metric (dashboard) | `text-5xl font-bold` | 48px | 700 |
| Page title | `text-3xl font-semibold` | 30px | 600 |
| Section title | `text-xl font-medium` | 20px | 500 |
| Card title | `text-lg font-medium` | 18px | 500 |
| Body / table text | `text-sm` | 14px | 400 |
| Label | `text-sm font-medium` | 14px | 500 |
| Badge / meta | `text-xs font-medium` | 12px | 500 |
| Tracking | `tracking-wide` on sidebar labels, `tracking-tight` on headings | -- | -- |

**Font Family:** `'Space Grotesk', sans-serif` (replaces Geist in connexa-dashboard and login-flow)

### 2.3 Spacing, Border-Radius, Shadow System

| Token | Value |
|---|---|
| Card padding | `p-6` (24px) or `p-8` (32px for mode-select cards) |
| Section gap | `gap-6` (24px) |
| Grid gap | `gap-4` to `gap-8` depending on density |
| Component internal gap | `gap-2` to `gap-4` |
| **Border Radius** | |
| Small pill | `rounded` or `rounded-md` |
| Standard cards | `rounded-2xl` (was `rounded-xl`) |
| Inputs | `rounded-xl` (was `rounded-md`) |
| Buttons | `rounded-lg` |
| Avatars | `rounded-full` |
| **Shadows** | |
| Default card | None (flat on dark bg) -- rely on border for separation |
| #1 result card | `shadow-lg shadow-[#4F6EF7]/5` |
| Tooltips/dropdowns | `shadow-xl` |

### 2.4 Component Library Changes

#### Buttons
| Variant | Old (connexa-dashboard) | New (dashboard-redesign) |
|---|---|---|
| Primary CTA | `bg-primary text-primary-foreground` (gray) | `bg-indigo-600 hover:bg-indigo-700 text-white` |
| Secondary / Outline | `border bg-background shadow-xs` | `bg-[#161B22] hover:bg-[#1F1F1F] text-white border border-[#30363D]` |
| Ghost | `hover:bg-accent` | `text-[#919191] hover:text-white` (no bg) |
| Disabled | `opacity-50` | `disabled:bg-[#333] disabled:text-[#666]` |
| Size (form CTA) | `h-9 px-4` | `px-6 py-4` (taller, more padding) |

#### Cards
| Property | Old | New |
|---|---|---|
| Background | `bg-card` (CSS var) | `bg-[#0D0D0D]` hardcoded dark |
| Border radius | `rounded-xl` | `rounded-2xl` |
| Border | `border` (CSS var) | `border border-[#1F1F1F]` |
| Shadow | `shadow-sm` | None (or `shadow-lg shadow-[#4F6EF7]/5` for featured) |
| Hover | None | `hover:border-indigo-500/50 transition-all duration-300` |

#### Inputs
| Property | Old | New |
|---|---|---|
| Background | `bg-transparent` | `bg-[#1A1A1A]` |
| Border | `border-input` | `border border-[#333]` |
| Border radius | `rounded-md` | `rounded-xl` |
| Padding | `px-3 py-1` | `px-4 py-3` |
| Focus | `border-ring ring-[3px] ring-ring/50` | `focus:border-indigo-500/50` (no ring, just border color shift) |
| Placeholder | `text-muted-foreground` | `placeholder-[#666]` |
| Text | `text-foreground` | `text-white` |

#### Tables
| Property | Old | New |
|---|---|---|
| Container | `border rounded-xl` | `bg-[#0D0D0D] rounded-2xl p-6` (card wrapping) |
| Header text | `text-muted-foreground` | `text-[#919191] text-sm font-medium` |
| Row hover | `hover:bg-muted/40` | `hover:bg-[#1A1A1A]` |
| Row borders | `border-b` | `border-b border-transparent` (invisible separators) |
| Active row | None | First row `bg-[#1A1A1A]` |
| Cell text | `text-foreground` | `text-white` for primary, `text-[#919191]` for secondary |
| Rounded row ends | None | `rounded-l-xl` / `rounded-r-xl` on first/last cells |

#### Badges
| Variant | Old | New |
|---|---|---|
| Status badge | `bg-[color]-100 text-[color]-700` | `bg-[color]-500/20 text-[color]-400` (semi-transparent) |
| Mode badge (Detailed) | N/A | `bg-indigo-500/20 text-indigo-400` |
| Mode badge (Simple) | N/A | `bg-[#333] text-[#919191]` |
| Border radius | `rounded-full` | `rounded` (small, not pill) |

#### Modals / Dialogs
| Property | Old | New |
|---|---|---|
| Overlay | `bg-black/50` | `bg-black/60` |
| Content bg | `bg-background` | `bg-[#0D0D0D]` |
| Content border | `border` | `border border-[#1F1F1F]` |
| Border radius | `rounded-lg` | `rounded-2xl` |

#### Dropdowns
| Property | Old | New |
|---|---|---|
| Background | `bg-popover` | `bg-[#0D0D0D]` |
| Border | `border` | `border-[#1F1F1F]` |
| Item text | `text-popover-foreground` | `text-[#919191]` |
| Item hover | `hover:bg-accent` | `focus:bg-[#1F1F1F] focus:text-white` |

### 2.5 Animation / Micro-interaction Guidelines

| Interaction | Specification |
|---|---|
| Page entry | `animate-in fade-in duration-500` |
| Slide-in variant | `animate-in fade-in slide-in-from-right-4 duration-500` |
| Card hover | `hover:border-indigo-500/50 transition-all duration-300` |
| Button hover | `hover:bg-indigo-700 transition-colors` |
| Table row hover | `transition-colors` (instantaneous feel) |
| Expand/collapse | `animate-in fade-in slide-in-from-top-2 duration-300` |
| Loading spinner | `animate-spin` on `Loader2` icon |
| Active step pulse | `animate-pulse` on active icons/dots |
| Zoom entry | `animate-in fade-in zoom-in-95 duration-500` |
| Selection color | `::selection { background-color: #6366f1; color: #ffffff; }` |
| Scrollbar hiding | `.no-scrollbar` utility class |

---

## 3. Component Mapping Table (for connexa-dashboard)

| # | Current Component (connexa-dashboard) | New Pattern (from dashboard-redesign) | Files to Edit | Priority | Notes |
|---|---|---|---|---|---|
| 1 | `globals.css` -- CSS variables & theme | Add `::selection`, `.no-scrollbar`, update font-family to Space Grotesk | `src/app/globals.css` | P0 | Foundation -- everything depends on this |
| 2 | `layout.tsx` (root) -- Geist font import | Switch to `Space_Grotesk` from Google Fonts | `src/app/layout.tsx` | P0 | Font swap |
| 3 | `layout.tsx` (dashboard) -- flex sidebar + topbar | `PageLayout` pattern: `bg-[#0D1117]`, absolute header, sticky sidebar, `pt-24` content | `src/app/(dashboard)/layout.tsx` | P0 | Major layout restructure |
| 4 | `sidebar.tsx` -- `bg-card border-r w-64` | Sticky sidebar: `bg-[#161B22] rounded-2xl border-[#30363D]`, uppercase labels, `text-[#919191]`, indigo active icon | `src/components/dashboard/sidebar.tsx` | P0 | Completely restyle |
| 5 | `topbar.tsx` -- Welcome banner + avatar + logout | `Header` pattern: absolute top, backdrop-blur, ConnexaLogo, search bar, New Brief CTA, avatar dropdown | `src/components/dashboard/topbar.tsx` | P0 | Replace with header.tsx pattern |
| 6 | `dashboard-stats.tsx` -- 4 stat cards grid | `DashboardMetrics` pattern: single `bg-[#0D0D0D] rounded-2xl` card with hero metric + 4-col grid | `src/components/dashboard/dashboard-stats.tsx` | P1 | Consolidate 4 cards into 1 |
| 7 | `recent-briefs-table.tsx` -- card-wrapped table | `RecentBriefs` pattern: `bg-[#0D0D0D] rounded-2xl p-6`, transparent borders, `text-[#919191]` headers, sortable columns, rounded row ends | `src/components/dashboard/recent-briefs-table.tsx` | P1 | Restyle table completely |
| 8 | `brief-status-badge.tsx` -- `bg-[color]-100 text-[color]-700` | Semi-transparent badges: `bg-[color]-500/20 text-[color]-400` | `src/components/brief/brief-status-badge.tsx` | P1 | Color swap |
| 9 | `button.tsx` (ui) -- gray primary | Add `indigo` variant; default CTA = `bg-indigo-600 hover:bg-indigo-700` | `src/components/ui/button.tsx` | P1 | Add variant, update defaults |
| 10 | `card.tsx` (ui) -- `rounded-xl shadow-sm` | `rounded-2xl` + remove shadow-sm from base | `src/components/ui/card.tsx` | P1 | Shape update |
| 11 | `input.tsx` (ui) -- `rounded-md bg-transparent` | `rounded-xl bg-[#1A1A1A] border-[#333] px-4 py-3 placeholder-[#666]` | `src/components/ui/input.tsx` | P1 | Full restyle |
| 12 | `textarea.tsx` (ui) -- matches old input | Match new input: `rounded-xl bg-[#1A1A1A] border-[#333]` | `src/components/ui/textarea.tsx` | P1 | Match input |
| 13 | `badge.tsx` (ui) -- solid backgrounds | Semi-transparent backgrounds per status | `src/components/ui/badge.tsx` | P2 | Update variants |
| 14 | `dialog.tsx` (ui) -- `rounded-lg bg-background` | `rounded-2xl bg-[#0D0D0D] border-[#1F1F1F]` | `src/components/ui/dialog.tsx` | P2 | Restyle |
| 15 | `dropdown-menu.tsx` (ui) -- theme vars | Dark hardcoded: `bg-[#0D0D0D] border-[#1F1F1F]` items `text-[#919191]` | `src/components/ui/dropdown-menu.tsx` | P2 | Restyle |
| 16 | `tabs.tsx` (ui) -- `bg-muted` list | Pill toggle: `bg-[#1A1A1A] rounded-lg p-1`, active `bg-indigo-600 text-white shadow-sm` | `src/components/ui/tabs.tsx` | P2 | Match period selector pattern |
| 17 | `select.tsx` (ui) -- theme vars | Dark: `bg-[#1A1A1A] border-[#333]`, option `bg-[#1A1A1A]` | `src/components/ui/select.tsx` | P2 | Restyle |
| 18 | `progress.tsx` (ui) -- `bg-primary/20` + `bg-primary` | Keep structure, but use `bg-[#0D1117]` container + dynamic color bar (indigo/emerald/blue) | `src/components/ui/progress.tsx` | P2 | Color update |
| 19 | `tooltip.tsx` (ui) -- theme-based | Dark: `bg-[#1A1A1A] border-[#333] text-white shadow-xl` | `src/components/ui/tooltip.tsx` | P3 | Restyle |
| 20 | `skeleton.tsx` (ui) -- `bg-accent animate-pulse` | `bg-[#1A1A1A] animate-pulse` | `src/components/ui/skeleton.tsx` | P3 | Color update |
| 21 | `page.tsx` (dashboard home) -- stat cards + table | Wrap in `DashboardMetrics` + `RecentBriefs` + `PerformanceChart` | `src/app/(dashboard)/page.tsx` | P1 | Page composition |
| 22 | `mode-selector.tsx` -- simple/detailed picker | Dark mode-select cards: `bg-[#0D0D0D] rounded-2xl p-8 border-[#1F1F1F] hover:border-indigo-500/50`, indigo icon containers | `src/components/brief/mode-selector.tsx` | P2 | Full restyle |
| 23 | `simple-brief-form.tsx` -- form with clarifications | Dark form: `bg-[#0D0D0D] rounded-2xl`, `bg-[#1A1A1A]` inputs, indigo submit button | `src/components/brief/simple-brief-form.tsx` | P2 | Full restyle |
| 24 | `result-card.tsx` -- result with score/reasoning | Rank badges (gradient for #1), `bg-[#161B22] rounded-2xl`, indigo accents, expandable sections | `src/components/results/result-card.tsx` | P2 | Major restyle |
| 25 | `score-breakdown.tsx` -- horizontal bars | Use dynamic color bars (indigo/emerald/blue/amber), `bg-[#30363D]` track | `src/components/results/score-breakdown.tsx` | P2 | Color update |
| 26 | Analytics charts (`avg-score-card.tsx`, `score-trend-chart.tsx`, `miss-reasons-chart.tsx`) | Indigo gradient fills, `#1F1F1F` grid lines, `#666` axis text, `bg-[#1A1A1A]` tooltips | `src/components/analytics/*.tsx` | P2 | Chart restyle |
| 27 | `recommendations-panel.tsx` | Dark card style, indigo/purple section indicators | `src/components/analytics/recommendations-panel.tsx` | P3 | Restyle |
| 28 | `chat-view.tsx` + `chat-message.tsx` + `chat-input.tsx` | Dark chat: `bg-[#0D0D0D]` container, `bg-[#161B22]` messages, `bg-[#1A1A1A]` input | `src/components/assistant/*.tsx` | P2 | Full restyle |
| 29 | `thread-list.tsx` | Dark sidebar: `bg-[#161B22]`, active `bg-[#1F1F1F]`, `text-[#919191]` | `src/components/assistant/thread-list.tsx` | P2 | Restyle |
| 30 | `account-settings-form.tsx` | Dark form sections, `bg-[#0D0D0D]` cards, `bg-[#1A1A1A]` inputs | `src/components/settings/account-settings-form.tsx` | P3 | Restyle |
| 31 | `empty-state.tsx` | `text-[#919191]` message, indigo CTA button | `src/components/dashboard/empty-state.tsx` | P3 | Color update |
| 32 | `pipeline-steps.tsx` | Dark loading steps: indigo active, emerald complete, `bg-[#1A1A1A]` pending | `src/components/pipeline/pipeline-steps.tsx` | P2 | Match loading step pattern |
| 33 | `connexa-logo.tsx` | **Create new** -- SVG logo with indigo gradient + "ConnexaAI" wordmark | `src/components/connexa-logo.tsx` (new) | P0 | Copy from dashboard-redesign |
| 34 | Auth components (`login-form.tsx`, `signup-form.tsx`, etc.) | Restyle to dark theme, indigo buttons (see Section 4) | `src/components/auth/*.tsx` | P1 | Match login-flow changes |
| 35 | `sonner.tsx` / toast styles | Dark toast: match `bg-[#0D0D0D] border-[#1F1F1F]` | `src/components/ui/sonner.tsx` | P3 | Restyle |

---

## 4. Login-Flow Visual Alignment Changes

### 4.1 Global Changes

**File: `login-flow/app/globals.css`**
- Add `::selection { background-color: #6366f1; color: #ffffff; }` to `@layer base`
- Add `.no-scrollbar` utility
- Change `--font-sans` in `@theme inline` from `'Geist'` to `'Space Grotesk', sans-serif`

**File: `login-flow/app/layout.tsx`**
- Replace `import { Geist, Geist_Mono }` with `import { Space_Grotesk }` from `next/font/google`
- Update font variable to `--font-sans: 'Space Grotesk'`

### 4.2 Auth Layout (Split Panel)

**File: `login-flow/app/auth/layout.tsx`**

| Change | Before | After |
|---|---|---|
| Outer wrapper | `min-h-screen flex` | `min-h-screen flex bg-[#0D1117]` |
| Left panel bg | `bg-gradient-to-br from-card via-background to-card` | `bg-[#0D0D0D] border-r border-[#1F1F1F]` |
| Gradient orbs | `bg-emerald-500/10` / `bg-blue-500/10` | `bg-indigo-500/10` / `bg-[#4F6EF7]/10` (indigo orbs) |
| Logo component | `<Logo>` (Acme "A" block) | Import and use `<ConnexaLogo>` from connexa-dashboard (or inline the SVG) |
| Testimonial text | `text-foreground` | `text-white` |
| Stats values | `text-foreground` | `text-white` |
| Muted text | `text-muted-foreground` | `text-[#919191]` |
| Border | `border-border` | `border-[#30363D]` |
| Features icons | `text-muted-foreground` | `text-[#919191]` with hover `text-indigo-400` |
| Right panel bg | implicit white | `bg-[#0D1117]` (same as page bg) |
| Form container | `max-w-md` wrapper only | Add `bg-[#0D0D0D] rounded-2xl p-8 border border-[#1F1F1F]` card wrapper |
| Mobile header | `p-6 pb-0` with Logo | Same structure but use ConnexaLogo, add `bg-[#0D1117]` |

### 4.3 Login Page

**File: `login-flow/app/auth/login/page.tsx`**

| Element | Before | After |
|---|---|---|
| Page heading | `text-3xl font-semibold tracking-tight text-balance` | Add `text-white` |
| Description | `text-muted-foreground` | `text-[#919191]` |
| Email input | `h-12 bg-input border-border` | `h-12 bg-[#1A1A1A] border-[#333] rounded-xl text-white placeholder-[#666] focus:border-indigo-500/50` |
| Password input | Same as email | Same new styling |
| "Remember me" label | `text-muted-foreground` / default | `text-[#919191]` |
| Checkbox | Default shadcn | `border-[#333]` unchecked, `bg-indigo-600 border-indigo-600` checked |
| Sign in button | `bg-primary text-primary-foreground h-12 hover:scale-[1.02]` | `bg-indigo-600 hover:bg-indigo-700 text-white h-12 hover:scale-[1.02]` |
| "Forgot password" link | `text-sm text-muted-foreground underline` | `text-sm text-[#919191] hover:text-indigo-400` |
| OAuth buttons | `variant="outline" border-border bg-transparent hover:bg-secondary` | `bg-[#161B22] border-[#30363D] text-white hover:bg-[#1F1F1F] hover:border-[#444]` |
| Divider text | `text-muted-foreground bg-background` | `text-[#919191] bg-[#0D0D0D]` (match card bg) |
| "Sign up" link | Default link | `text-indigo-400 hover:text-indigo-300` |
| Error alert | `border-destructive/50 bg-destructive/10` | `border-red-500/30 bg-red-500/10 text-red-400` |

### 4.4 Signup Page

**File: `login-flow/app/auth/signup/page.tsx`**

All input changes same as login. Additional:

| Element | Before | After |
|---|---|---|
| All labels | `text-sm font-medium` (inherits foreground) | `text-sm font-medium text-white` |
| Phone input | Same as other inputs | Match new dark input style |
| Password strength bars | `bg-destructive`, `bg-orange-500`, `bg-yellow-500`, `bg-emerald-400/500` | `bg-red-500`, `bg-orange-500`, `bg-yellow-500`, `bg-emerald-400/500` (keep -- they work on dark) |
| Password strength label | `text-xs` (inherits) | `text-xs text-[#919191]` |
| Password match check | `text-emerald-500` | `text-emerald-400` (slightly lighter for dark bg) |
| Password match X | `text-destructive` | `text-red-400` |
| Terms text | `text-xs text-muted-foreground` | `text-xs text-[#919191]` |
| Terms links | Default underline | `text-indigo-400 hover:text-indigo-300` |
| Create account button | `bg-primary` | `bg-indigo-600 hover:bg-indigo-700 text-white` |

### 4.5 Forgot Password Page

**File: `login-flow/app/auth/forgot-password/page.tsx`**

| Element | Before | After |
|---|---|---|
| Heading | inherits foreground | `text-white` |
| Description | `text-muted-foreground` | `text-[#919191]` |
| Email input | Old style | New dark input style |
| Submit button | `bg-primary` | `bg-indigo-600 hover:bg-indigo-700` |
| Success state icon | `text-muted-foreground` | `text-indigo-400` |
| "Open email app" button | `bg-primary` | `bg-indigo-600 hover:bg-indigo-700` |
| "Didn't receive" text | `text-muted-foreground` | `text-[#919191]` |
| Resend link | Default | `text-indigo-400` |
| Back to login link | Default | `text-[#919191] hover:text-white` |

### 4.6 Thank You Page

**File: `login-flow/app/auth/thank-you/page.tsx`**

| Element | Before | After |
|---|---|---|
| Background | Inherits | Ensure `bg-[#0D1117]` from layout |
| Success icon ring | `ring-emerald-500/30 bg-emerald-500/10` | Keep (works on dark) |
| Ping animation | `bg-emerald-500/20` | Keep |
| Heading | Inherits foreground | `text-white` |
| Subtitle | `text-muted-foreground` | `text-[#919191]` |
| Get started button | `bg-primary` | `bg-indigo-600 hover:bg-indigo-700` |
| Sign in button | `variant="outline"` | `bg-[#161B22] border-[#30363D] text-white hover:bg-[#1F1F1F]` |
| Trust signals text | `text-muted-foreground` | `text-[#919191]` |
| Trust signal icons | `text-muted-foreground` | `text-[#919191]` |
| Confetti colors | `emerald, blue, amber, pink, purple` | Add `indigo` to the palette, keep others |

### 4.7 Component-Level Changes

**File: `login-flow/components/auth/password-input.tsx`**
- Show/hide button: `text-muted-foreground hover:text-foreground` -> `text-[#919191] hover:text-white`

**File: `login-flow/components/auth/password-strength.tsx`**
- Inactive bar bg: `bg-muted` -> `bg-[#333]`
- Label text: add `text-[#919191]`

**File: `login-flow/components/auth/password-match.tsx`**
- Match text: `text-emerald-500` -> `text-emerald-400`
- Mismatch text: `text-destructive` -> `text-red-400`

**File: `login-flow/components/auth/oauth-buttons.tsx`**
- Button variant: `variant="outline"` with `border-border bg-transparent hover:bg-secondary`
- New: `bg-[#161B22] border-[#30363D] text-white hover:bg-[#1F1F1F] hover:border-[#444] transition-colors`

**File: `login-flow/components/auth/phone-input.tsx`**
- Input styling: Match new dark input pattern

**File: `login-flow/components/marketing/feature-ticker.tsx`**
- Card bg: Match `bg-[#161B22] border-[#30363D]`
- Text: `text-white` headings, `text-[#919191]` descriptions
- Left border indicator: `border-l-indigo-500` instead of `border-l-primary`

**File: `login-flow/components/marketing/thumbnail.tsx`**
- Background: Match dark theme colors

### 4.8 UI Components to Update (login-flow/components/ui/)

These shadcn components need the same updates as connexa-dashboard Section 3:
- `button.tsx` -- add indigo variant, update default
- `input.tsx` -- dark input style
- `card.tsx` -- `rounded-2xl`, remove shadow-sm
- `checkbox.tsx` -- `border-[#333]`, checked = `bg-indigo-600`
- `label.tsx` -- ensure `text-white` in dark context
- `dialog.tsx` -- dark modal styling
- `separator.tsx` -- `bg-[#1F1F1F]`

---

## 5. Page-by-Page Implementation Order

### Phase 0: Foundation (Do first -- everything depends on it)

| Step | Codebase | Task | Files |
|---|---|---|---|
| 0.1 | connexa-dashboard | Replace Geist with Space Grotesk in root `layout.tsx` | `src/app/layout.tsx` |
| 0.2 | connexa-dashboard | Update `globals.css`: add `::selection`, `.no-scrollbar` utility, update font-family reference | `src/app/globals.css` |
| 0.3 | connexa-dashboard | Create `connexa-logo.tsx` component -- copy SVG + wordmark from dashboard-redesign | `src/components/connexa-logo.tsx` (new) |
| 0.4 | login-flow | Replace Geist with Space Grotesk in root `layout.tsx` | `app/layout.tsx` |
| 0.5 | login-flow | Update `globals.css`: add `::selection`, `.no-scrollbar`, font-family reference | `app/globals.css` |

### Phase 1: Shell & Navigation (P0 -- structural)

| Step | Codebase | Task | Files |
|---|---|---|---|
| 1.1 | connexa-dashboard | Rewrite dashboard `layout.tsx`: adopt `PageLayout` pattern with `bg-[#0D1117]`, absolute header area, sticky sidebar area, `pt-24` content | `src/app/(dashboard)/layout.tsx` |
| 1.2 | connexa-dashboard | Rewrite `sidebar.tsx`: sticky, `bg-[#161B22] rounded-2xl border-[#30363D]`, uppercase nav labels, `text-[#919191]` inactive, indigo active icon, gap-6 between items, bottom section with divider | `src/components/dashboard/sidebar.tsx` |
| 1.3 | connexa-dashboard | Rewrite `topbar.tsx` into `header.tsx` pattern: absolute positioned, `backdrop-blur-[120px] bg-black/10`, ConnexaLogo left, search bar center, New Brief CTA + avatar dropdown right | `src/components/dashboard/topbar.tsx` |
| 1.4 | login-flow | Update auth `layout.tsx`: dark bg `bg-[#0D1117]`, dark left panel `bg-[#0D0D0D]`, ConnexaLogo, indigo gradient orbs, form card wrapper | `app/auth/layout.tsx` |

### Phase 2: Core Dashboard Pages (P1)

| Step | Codebase | Task | Files |
|---|---|---|---|
| 2.1 | connexa-dashboard | Rewrite `dashboard-stats.tsx` to `DashboardMetrics` pattern: single `bg-[#0D0D0D] rounded-2xl` card, hero metric left, 4-col grid right | `src/components/dashboard/dashboard-stats.tsx` |
| 2.2 | connexa-dashboard | Restyle `recent-briefs-table.tsx`: `bg-[#0D0D0D] rounded-2xl p-6`, dark table styling, semi-transparent status badges, sortable header with ChevronsUpDown, rounded row ends | `src/components/dashboard/recent-briefs-table.tsx` |
| 2.3 | connexa-dashboard | Create `performance-chart.tsx`: copy PerformanceChart from dashboard-redesign, integrate with real data via Recharts area chart with indigo gradient | `src/components/dashboard/performance-chart.tsx` (new or adapt existing) |
| 2.4 | connexa-dashboard | Update `page.tsx` (dashboard home): compose DashboardMetrics + PerformanceChart + RecentBriefs | `src/app/(dashboard)/page.tsx` |
| 2.5 | connexa-dashboard | Update `brief-status-badge.tsx`: swap to `bg-[color]-500/20 text-[color]-400` palette | `src/components/brief/brief-status-badge.tsx` |

### Phase 3: Login Flow Pages (P1)

| Step | Codebase | Task | Files |
|---|---|---|---|
| 3.1 | login-flow | Restyle Login page: dark inputs, indigo button, dark error alert, dark links | `app/auth/login/page.tsx` |
| 3.2 | login-flow | Restyle Signup page: dark inputs, dark labels, indigo button, dark password strength bars, dark OAuth buttons | `app/auth/signup/page.tsx` |
| 3.3 | login-flow | Restyle Forgot Password page: dark input, indigo buttons, dark success state | `app/auth/forgot-password/page.tsx` |
| 3.4 | login-flow | Restyle Thank You page: ensure dark bg, indigo CTA, dark outline secondary button | `app/auth/thank-you/page.tsx` |
| 3.5 | login-flow | Update auth sub-components: `password-input.tsx`, `password-strength.tsx`, `password-match.tsx`, `oauth-buttons.tsx`, `phone-input.tsx` | `components/auth/*.tsx` |
| 3.6 | login-flow | Update marketing components: `feature-ticker.tsx`, `thumbnail.tsx` -- dark cards, indigo accents | `components/marketing/*.tsx` |

### Phase 4: UI Component Library (P1-P2)

| Step | Codebase | Task | Files |
|---|---|---|---|
| 4.1 | connexa-dashboard | Update `button.tsx`: add `indigo` variant (`bg-indigo-600 hover:bg-indigo-700 text-white`) | `src/components/ui/button.tsx` |
| 4.2 | connexa-dashboard | Update `card.tsx`: change `rounded-xl` to `rounded-2xl`, remove `shadow-sm` | `src/components/ui/card.tsx` |
| 4.3 | connexa-dashboard | Update `input.tsx`: dark bg, dark border, `rounded-xl`, larger padding | `src/components/ui/input.tsx` |
| 4.4 | connexa-dashboard | Update `textarea.tsx`: match input changes | `src/components/ui/textarea.tsx` |
| 4.5 | connexa-dashboard | Update `dialog.tsx`: dark styling | `src/components/ui/dialog.tsx` |
| 4.6 | connexa-dashboard | Update `dropdown-menu.tsx`: dark styling | `src/components/ui/dropdown-menu.tsx` |
| 4.7 | connexa-dashboard | Update `tabs.tsx`: dark pill toggle with indigo active | `src/components/ui/tabs.tsx` |
| 4.8 | connexa-dashboard | Update `badge.tsx`, `select.tsx`, `progress.tsx`, `tooltip.tsx`, `skeleton.tsx` | Various `src/components/ui/*.tsx` |
| 4.9 | login-flow | Mirror ui component changes: `button.tsx`, `input.tsx`, `card.tsx`, `checkbox.tsx`, `label.tsx`, `separator.tsx` | `components/ui/*.tsx` |

### Phase 5: Feature Pages (P2)

| Step | Codebase | Task | Files |
|---|---|---|---|
| 5.1 | connexa-dashboard | Restyle `mode-selector.tsx`: dark cards, indigo icons, `hover:border-indigo-500/50` | `src/components/brief/mode-selector.tsx` |
| 5.2 | connexa-dashboard | Restyle `simple-brief-form.tsx` & `detailed-brief-form.tsx`: dark form containers, indigo labels, new input style | `src/components/brief/*.tsx` |
| 5.3 | connexa-dashboard | Restyle `result-card.tsx`: `bg-[#161B22] rounded-2xl`, gradient rank badges, indigo #1 glow, expandable sections | `src/components/results/result-card.tsx` |
| 5.4 | connexa-dashboard | Restyle `score-breakdown.tsx`: dynamic color bars, dark track `bg-[#30363D]` | `src/components/results/score-breakdown.tsx` |
| 5.5 | connexa-dashboard | Restyle `pipeline-steps.tsx`: indigo active, emerald complete, dark pending | `src/components/pipeline/pipeline-steps.tsx` |
| 5.6 | connexa-dashboard | Restyle analytics charts: indigo gradient fills, dark grid/axes, dark tooltips | `src/components/analytics/*.tsx` |
| 5.7 | connexa-dashboard | Restyle chat/assistant: dark containers `bg-[#0D0D0D]`, dark messages, indigo send button | `src/components/assistant/*.tsx` |
| 5.8 | connexa-dashboard | Restyle `history/page.tsx`: dark filters, match table styling | `src/app/(dashboard)/history/page.tsx` |

### Phase 6: Polish & Remaining (P3)

| Step | Codebase | Task | Files |
|---|---|---|---|
| 6.1 | connexa-dashboard | Restyle settings page & `account-settings-form.tsx` | `src/components/settings/account-settings-form.tsx`, `src/app/(dashboard)/settings/page.tsx` |
| 6.2 | connexa-dashboard | Update `empty-state.tsx`, `sonner.tsx` | Various |
| 6.3 | connexa-dashboard | Update auth form components (`login-form.tsx`, `signup-form.tsx`, `reset-password-form.tsx`, `oauth-button.tsx`) to match login-flow visual changes | `src/components/auth/*.tsx` |
| 6.4 | Both | Dark mode toggle behavior: set `defaultTheme="dark"` in ThemeProvider, optionally allow light mode | Both `layout.tsx` files |
| 6.5 | Both | Responsive QA pass: verify all breakpoints (mobile 375px, tablet 768px, desktop 1280px+) still work | All files |
| 6.6 | Both | Animation QA: verify all `animate-in`, `transition-all`, `hover:` states render correctly | All files |

---

## 6. Potential Gotchas & Breakpoints

### 6.1 Hardcoded vs CSS Variable Colors
The dashboard-redesign uses **hardcoded hex colors** (`#0D0D0D`, `#161B22`, `#1A1A1A`, `#919191`, etc.) rather than CSS variables for dark mode. This means the connexa-dashboard's existing light/dark mode toggle via `class="dark"` won't automatically apply. **Decision needed:** Either (a) hardcode the dark theme and remove the toggle, or (b) map these hex values to CSS variables in `globals.css` so the toggle still works. **Recommendation:** Default to dark mode (`defaultTheme="dark"` in ThemeProvider) but keep CSS variable support for future light mode by setting the dark mode vars to match the redesign values.

### 6.2 Supabase Auth in connexa-dashboard
The connexa-dashboard auth components (`login-form.tsx`, etc.) contain real Supabase auth logic. The login-flow uses simulated `setTimeout` auth. When aligning visuals, **do not replace auth logic** -- only change classes and visual presentation. The connexa-dashboard auth forms must keep their Supabase `signInWithPassword`, `signUp`, and `signOut` calls intact.

### 6.3 Server vs Client Components
The connexa-dashboard `layout.tsx` for the dashboard is a **server component** (it fetches user data from Supabase). The dashboard-redesign's `PageLayout` is a client component. The sidebar and header will need to be refactored: either keep the server-side auth check in layout and pass data down to client header/sidebar, or move auth check to middleware. **Recommendation:** Keep the server layout for auth gating, render client `<Header>` and `<Sidebar>` inside it, pass `email`/`fullName` as props to the header.

### 6.4 Responsive Sidebar Behavior
Current connexa-dashboard: sidebar is `w-full md:w-64` (full width on mobile, fixed on desktop) with a Sheet for mobile.
Dashboard-redesign: sidebar is `hidden md:flex md:w-48 lg:w-64` with `sticky top-24`. Mobile sidebar is completely hidden. **Need to decide:** Add a hamburger menu + Sheet for mobile sidebar, or keep the current mobile Sheet behavior and just restyle it.

### 6.5 Space Grotesk Font
Dashboard-redesign uses `Space_Grotesk`. Both connexa-dashboard and login-flow use `Geist`. Changing the font will affect text wrapping, line lengths, and layout spacing throughout. **Run a visual diff after font swap** to catch any text overflow or layout shifts.

### 6.6 Chart Library Consistency
Both codebases use Recharts. The dashboard-redesign hardcodes chart colors (`#6366f1`, `#1F1F1F` grid). The connexa-dashboard uses CSS variable-based chart colors (`--chart-1`, etc.). Either update the CSS vars or hardcode in chart components. **Recommendation:** Hardcode in chart components for exact control, as the redesign does.

### 6.7 Shared Component Divergence
The login-flow and connexa-dashboard each have their own `components/ui/` folder with independently generated shadcn components. Changes must be made in **both** codebases. If they ever share a component library package, this would be cleaner, but for now treat them as separate.

### 6.8 ConnexaLogo Component
The `ConnexaLogo` component from dashboard-redesign needs to be copied to both codebases. In login-flow, it replaces the "Acme" logo. In connexa-dashboard, it replaces the text-only "ConnexaAI" header in the sidebar.

### 6.9 Form Input Heights
Login-flow uses `h-12` (48px) inputs. Dashboard-redesign uses `py-3` (approx 42-46px depending on line-height). Standardize on `h-12` for auth forms (touch-friendly) and `h-10` or auto-height with `py-3` for dashboard forms.

### 6.10 Dark Mode & Accessibility
Moving to a dark-first design requires checking contrast ratios. Key concern areas:
- `#919191` on `#0D0D0D` = ~6.3:1 (passes AA for normal text)
- `#666` on `#0D0D0D` = ~3.7:1 (passes AA for large text only -- avoid for body text)
- `#333` on `#0D0D0D` = ~1.5:1 (decorative borders only, not for text)
- White on `#6366f1` = ~4.6:1 (passes AA)

---

## 7. Testing & Validation Checklist

### Visual Consistency
- [ ] ConnexaLogo renders identically in dashboard sidebar/header AND login-flow left panel
- [ ] Background color is `#0D1117` on all pages in both codebases
- [ ] All cards use `bg-[#0D0D0D] rounded-2xl border border-[#1F1F1F]`
- [ ] All inputs use `bg-[#1A1A1A] border-[#333] rounded-xl` styling
- [ ] All primary CTA buttons are `bg-indigo-600 hover:bg-indigo-700 text-white`
- [ ] All secondary/outline buttons use `bg-[#161B22] border-[#30363D]`
- [ ] Status badges use semi-transparent pattern (`bg-[color]-500/20 text-[color]-400`)
- [ ] Muted text consistently uses `text-[#919191]` or `text-[#666]` across both codebases
- [ ] Font is Space Grotesk everywhere (check network tab for font loading)
- [ ] `::selection` is indigo (`#6366f1`) on all pages

### Functional (connexa-dashboard)
- [ ] Supabase login/signup/logout still work
- [ ] Dashboard stats load real data from API
- [ ] Brief creation flow works end-to-end (simple + detailed modes)
- [ ] Brief results display with scores, reasoning, breakdowns
- [ ] Analytics charts render with real data
- [ ] Assistant chat sends/receives messages
- [ ] Settings form saves profile changes
- [ ] Pipeline status polling works
- [ ] All API routes return expected data
- [ ] Protected routes redirect to login when unauthenticated

### Functional (login-flow)
- [ ] Login form validates email + password, shows errors, redirects on success
- [ ] Signup form validates all 6 fields, shows password strength, redirects to thank-you
- [ ] Forgot password form validates email, shows success state with resend option
- [ ] Thank you page shows confetti animation
- [ ] OAuth buttons render (Google + GitHub) -- even if auth is simulated
- [ ] "Remember me" checkbox toggles
- [ ] Password show/hide toggle works
- [ ] Phone number auto-formatting works
- [ ] Password match indicator updates in real-time
- [ ] Error summary alert appears on validation failure with correct field linking

### Responsive
- [ ] Mobile (375px): sidebar hidden, hamburger menu accessible, single-column layouts, full-width buttons
- [ ] Tablet (768px): sidebar visible at `w-48`, 2-column grids where appropriate
- [ ] Desktop (1280px+): sidebar at `w-64`, full grid layouts, search bar visible in header
- [ ] Login-flow: left marketing panel hidden on mobile, form centered full-width
- [ ] Tables: horizontal scroll works on mobile with `overflow-x-auto`
- [ ] No text overflow or clipping at any breakpoint

### Accessibility
- [ ] All focus-visible states use `ring-indigo-500/50` or equivalent visible ring
- [ ] Color contrast meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
- [ ] `aria-invalid` styling uses `border-red-500` (visible on dark bg)
- [ ] Screen reader labels present on all icon-only buttons
- [ ] Tab order logical on all forms
- [ ] Error summaries have `role="alert"` and receive focus

### Performance
- [ ] Space Grotesk font loads from Google Fonts CDN (check for FOUT)
- [ ] No unused CSS from old light-mode styles bloating bundle
- [ ] Chart components lazy-load where possible
- [ ] Images and SVGs optimized
- [ ] No layout shifts during page load (CLS < 0.1)

### Cross-Browser
- [ ] Chrome 120+
- [ ] Firefox 120+
- [ ] Safari 17+
- [ ] Edge 120+
- [ ] OKLCH colors fallback in older browsers (test on Safari 15 if needed)
