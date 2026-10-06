# UX/UI Design Review: SE Enablement Platform

Scope: code-based review (no dev server run, no sign-in). Every `page.tsx` under `app/`, the nav definitions in `lib/navigation/` and `lib/auth/rbac.ts`, the shells (`components/app-shell*.tsx`, `nav-sidebar.tsx`, `nav-top-bar.tsx`), the page-layout components, and the shared `components/ui`, `components/design`, `components/*/…-ui-primitives.tsx`. Only page headers/shells and shared primitives were read in depth; feature-panel internals were sampled via grep metrics, so per-panel findings are indicative.

Measured signals (grep over `components/` and `app/`, 290 .tsx files):
- ~4,270 hard-coded hex colors vs ~556 uses of `sp-*` token classes.
- ~937 uses of text sizes of 10px or smaller (`text-[8px]` x220, `text-[9px]` x136, `text-[7.5px]` x75, `text-[10px]` x233).
- Only 29 of 290 files contain any `aria-` attribute; 0 `role="tab"`; 5 click handlers on `div/span/li/tr`.
- `outline-none` x32 vs `focus-visible` x4.
- 0 `dark:` classes; 0 `loading.tsx`, `error.tsx`, `not-found.tsx` files anywhere in `app/`.
- Only one file uses `htmlFor` (labels are largely not programmatically associated).

---

## A. Page inventory

### Public / auth (full-bleed split-panel layouts, no AppShell)
| Route | File | Notes |
|---|---|---|
| `/` | `app/page.tsx` | redirect to `/dashboard` |
| `/login` | `app/login/page.tsx` | LoginLeftPanel + LoginRightPanel; hard-coded "47 users" social proof |
| `/login/forgot-password` | `app/login/forgot-password/page.tsx` | |
| `/auth/reset-password` | `app/auth/reset-password/page.tsx` | |
| `/auth/mfa/enroll`, `/auth/mfa/verify` | `app/auth/mfa/*/page.tsx` | Mfa(Enroll)Left/RightPanel |
| `/share/[token]` | `app/share/[token]/page.tsx` | external buyer-facing `BuyerShareRoom` |
| `/maintenance` | `app/maintenance/page.tsx` | inside AppShell, inline styles |

### SE / rep workspace (AppShell, SE sidebar)
| Route | File | Header pattern |
|---|---|---|
| `/dashboard` | `app/dashboard/page.tsx` | `SEPageLayout bare` + SeWorkspaceNorthstar; redirects manager/admin away |
| `/my-plan` | `app/my-plan/page.tsx` | SEPageLayout eyebrow "Onboarding" |
| `/plan-steps/[id]` | `app/plan-steps/[id]/page.tsx` | detail, not in nav |
| `/plan-calendar` | `app/plan-calendar/page.tsx` | split: SE calendar vs manager Gantt, different shells |
| `/growth-plan` | `app/growth-plan/page.tsx` | no SEPageLayout, own header in SeGrowthPlanView |
| `/growth`, `/growth/readiness` | `app/growth/*` | SEPageLayout eyebrow "Career"; readiness is a sub-page linked by a lone text link |
| `/feedback` | `app/feedback/page.tsx` | SEPageLayout |
| `/learn`, `/lab`, `/certifications`, `/resources` | `app/*/page.tsx` | SEPageLayout |
| `/prep`, `/challenges`, `/simulations`, `/pitch`, `/flight-check`, `/market-pulse` | `app/*/page.tsx` | `contentWidth="full"`, each feature owns its own header/sub-bar (`practice-page-meta.ts`) |
| `/my-practice` | `app/my-practice/page.tsx` | MyPracticeHub, no page header; nav-visible only to admin/manager/super_admin |
| `/account`, `/account/change-password` | `app/account/*` | SEPageLayout |
| `/uat-bugs` | `app/uat-bugs/page.tsx` | no AppShell at all, full-page tracker, hidden route |

### Manager (single route `/manager?section=…`, `ManagerPageShell`)
Sections: command, inbox, roster, readiness, leaderboard, cadence, mentees, history, dev, program, assign (`app/manager/page.tsx`, `components/manager/manager-page-shell.tsx`). Related standalone routes in the manager nav: `/plans` (Assign Plans), `/plan-calendar`, `/certifications`, `/development`, `/growth`, `/my-practice` and the whole practice group.

### Tenant admin (`/admin?tab=…&section=…`, `AdminConsole`)
Tabs: overview, users, plans, competencies, content-portal, reviews, analytics, ai, corpus (+routing), security, audit, help, settings (sections flags, integrations, ai, basic, retention). (`components/admin/admin-console.tsx`, `lib/navigation/admin-portal-nav.ts`)

### Platform super-admin (`/platform?view=…`, `PlatformConsole`)
Views: now, onboarding, support, shadow, overview(Health), usage, tenant (detail tabs: entitlements, branding, provision, support, notes, audit, commercial, sso, webhooks), global-audit, settings (`components/platform/platform-console.tsx`, `lib/navigation/platform-portal-nav.ts`).

---

## B. Cross-cutting findings

### Design system / tokens
1. **High: Tokens defined but bypassed.** `app/globals.css` declares a clean `@theme` (`sp-navy-deep`, `sp-blue`, `sp-text-muted`...), yet ~4,270 raw hex values appear in components (`#6B6860`, `#A09D98`, `#E2DFD9`, `#0D0E12`, `#00143a` repeated in `app-shell-view.tsx`, `nav-top-bar.tsx`, `admin-page-layout.tsx`, `se-page-layout.tsx`, `maintenance/page.tsx`). Rebranding or tenant theming (`--tenant-primary` is only applied to a few spots) is effectively impossible. Fix: codemod hex to token classes; add semantic tokens (`--color-surface`, `--color-ink`, `--color-ink-muted`, `--color-line`, `--color-focus`, status success/warn/danger/info + their soft backgrounds).
2. **High: Three parallel page-header implementations.** `SEPageLayout` (22px title, eyebrow coloured text, `px-[26px]`), `ManagerPageLayout` (30px title, grey eyebrow, left accent bar, `p-[22px]`, plus `compact` variant at 22px), `AdminPageLayout` (28px, same accent bar). Different title sizes, padding and eyebrow styling make portals feel like three products. Fix: one `PageHeader` + `PageContainer` in `components/ui` with `density` prop; delete the three copies. Practice pages (`/simulations`, `/pitch`, `/prep`, `/challenges`, `/flight-check`, `/market-pulse`) and `/growth-plan` use no shared header at all.
3. **High: Two or three overlapping component kits.** `components/ui/*` (Button/Badge/Card/Input), `components/design/*` (AlertStrip, BentoGrid, StatColumn, StatusTag, ProgressBar), and `manager-ui-primitives.tsx` (ManagerAlertStrip/BentoGrid/StatColumn/StatStrip/OutlineBtn/MetricCard) with `admin-ui-primitives.tsx` merely re-exporting the Manager ones under Admin names. There is also `components/metric-card.tsx`, `status-badge.tsx`, `person-summary-card.tsx`. Consolidate to one set; `ManagerOutlineBtn` should be `Button variant="outline"`.
4. **Med: Component API gaps.** `Button` has no loading/icon-only variants and its `focus-visible:ring` uses `ring-offset` but `Input` removes the outline and only changes border colour (`input.tsx`, `focus:outline-none`); no `Select`, `Checkbox`, `Switch`, `Tabs`, `Modal/Drawer`, `Tooltip`, `EmptyState`, `Skeleton`, `Toast` wrapper in `components/ui` (toggles exist twice: `admin-toggle.tsx`, `design/feature-flag-toggle.tsx`). Bespoke tab bars exist in admin (`admin-tabs.tsx` is now dead code, never imported), platform tenant tabs, SE pages.
5. **Med: Badge tones hard to read.** `Badge` uses `text-[8px]` mono uppercase with pale backgrounds (`#FFFBF0` + `#d4810a` amber is about 3:1). Status relies on tone only (colour) with text 8px.
6. **Med: Radius and elevation.** Everything is square-cornered with 1px borders and no shadows; consistent, but `Button` references `shadow-sp-blue/20` that does nothing. Decide deliberately (sharp editorial look is a valid brand) and document it.
7. **Low: Typography stack** Syne (display) + DM Sans + DM Mono is distinctive, but mono is used for body-ish labels, breadcrumbs, nav footers, tags, and filters at 8-10px. Reserve mono for data/IDs/eyebrows.

### Accessibility
8. **High: Text size and contrast.** ~937 text uses at or below 10px. Common greys `#A09D98` / `#B0ADA8` on `#F5F4F0`/white are about 2.2-2.6:1 (fails WCAG AA 4.5:1) and are used for real content: nav top-bar tagline, eyebrows, search placeholder, login footer text, sidebar `text-white/30` tagline and tenant slug at `text-[8px]`. Set a floor of 12px for readable text (11px only for uppercase labels) and raise the muted/subtle tokens (`sp-text-subtle` to about `#6F6C66`).
9. **High: Focus visibility.** 32 `outline-none` vs 4 `focus-visible` in components; `Input`, tab buttons, and manager/admin custom buttons have no visible focus ring. Add a global `:focus-visible` outline in `globals.css` and stop using `outline-none` without a replacement.
10. **High: Tabs/navigation semantics.** Admin and manager sub-navigation are `<button>` or `<Link>` lists without `role="tablist/tab"`, `aria-selected`, or `aria-current="page"` on the active sidebar link (`nav-sidebar.tsx` marks active by CSS class only). The sub-sections are URL-driven, so use real links with `aria-current`. Mobile nav `NavMobile` has the same gap.
11. **High: Form labelling.** Only one file uses `htmlFor`; 54 files use inputs. Many forms rely on placeholders or adjacent text (login/MFA/forms). Add `Field`/`Label` primitive that wires `id`, `aria-describedby` (hint/error), `aria-invalid`; announce errors with `role="alert"`.
12. **Med: Global "search" is not a control.** `nav-top-bar.tsx` renders `role="search"` containing a `<span>` placeholder; it is not an input, not focusable, and has no behaviour for most workspaces (platform has its own `PlatformGlobalSearch`). Either wire it (command palette Cmd+K) or remove it; currently it promises "Search team..." and does nothing.
13. **Med: Emoji nav icons** (`lib/navigation/nav-display.ts`) render inconsistently across OSes, are `aria-hidden` (fine) but the visual weight clashes with the rest of the sharp UI; manager/admin/platform sidebars have no icons at all, so SE nav and the others look unrelated. Use lucide icons (already a dependency) everywhere.
14. **Med: Skip link / landmarks.** No skip-to-content link; `<main>` exists in `app-shell-view.tsx` but the sidebar `<aside>` has no label and mobile `<header>` duplicates nav. Add `id="main"` skip link.
15. **Med: Color-only meaning.** Health/ramp/sim pills (`manager-ui-primitives.tsx`: `rampPillStyle`, `simPillStyle`, `healthBadgeStyle`), readiness heatmap (`team-readiness-heatmap.tsx`, `readiness-map.tsx`) rely on colour; add icon/text/pattern and numeric values.
16. **Low: Reduced motion handled** (`globals.css` has `prefers-reduced-motion`), good. `animate-pulse-dot` "Active" indicator in `AdminTenantBadge` is decorative only.

### Navigation / IA
17. **High: Query-string "pages" everywhere.** Manager (11 sections), Admin (14 tabs + 5 settings sections), Platform (9 views) are single routes switched by `?section=`, `?tab=`, `?view=`. Consequences: `page-title.ts` label maps drift (see 18), no per-section `<title>`, no code-splitting by route (the manager page loads data for every section on every request: `app/manager/page.tsx` is 392 lines of fetches), no `loading.tsx`, awkward back button, and admin tab state is duplicated in React state plus URL (`admin-console.tsx` `useState` + `useEffect` sync). Longer term, move to nested routes (`/manager/inbox`, `/admin/users`, `/platform/tenants/[id]`).
18. **High: Label and structure drift between nav sources.**
   - `lib/navigation/page-title.ts`: `ADMIN_TAB_LABELS` lacks `reviews`, `security`, `content-portal`; `competencies` shows "Content" while sidebar says "Competencies" and the header says "Competencies"; `MANAGER_SECTION_LABELS` lacks `mentees`. These fall through to defaults ("Admin Console"/"Command Center") in the top bar.
   - `admin-portal-nav.ts` "Basic & retention" vs `ADMIN_SETTINGS_HEADERS.basic` "Basic settings" and a separate `retention` header that has no nav entry. The "22 toggles" eyebrow on Feature flags is a hard-coded number.
   - `lib/auth/rbac.ts` `NAV_ITEMS` has "Development" twice (`/manager?section=dev` and `/development`), "Assign Plans" and "Ramp Plans" both point to `/plans`, and "Command Center" uses the "manager" icon. `rbac.ts` manager groups omit Mentees and Program parity with `manager-portal-nav.ts`, so two definitions of the same menu exist.
   - `super_admin` tier nav in `rbac.ts` lists manager items, but `PLATFORM_PORTAL_NAV_GROUPS` shows only platform items; operators are in a different mental model from their own tier definition.
19. **High: Mobile navigation does not scale.** `NavMobile` (`nav-sidebar.tsx`) flattens all groups into one horizontal chip scroller: about 35 chips for managers (and ~20 for admin), no grouping, no current-item scroll-into-view, active detection ignores `?section=`/`?tab=` for manager/admin (compares pathname only, so every manager chip lights up on `/manager`). The SE-only `MobilePracticeShell` bottom bar (Sim/Challenge/Prep/Pitch) renders for all roles on `md:hidden`, overlaps pages, and is a fifth way to navigate. Replace with a hamburger drawer reusing the sidebar plus an optional 4-5 item bottom tab bar.
20. **Med: Sidebar density and inconsistency.** SE sidebar groups lack separators and use 18px emoji; manager sidebar has 6 groups/24 items, with Practice tools duplicated beneath "Team" tools; "MY SKILLS" and "PRACTICE" blur personal vs team scope. Group labels are 8-9px mono. Consider collapsible groups, and a pinned "Inbox" with unread count (SE sidebar has badges; manager "Action Inbox" has no badge in `ManagerPortalSidebar`).
21. **Med: Workspace switching.** `WorkspaceSwitcher` sits at the bottom-left under the nav; the Admin and Platform sidebars have no way back to "My workspace" except the switcher. The top bar shows a workspace pill (`getWorkspacePillLabel`), but `getRolePillLabel` for tier uses a different vocabulary (Sales Engineer/Operator vs User/Super Admin). Pick one vocabulary.
22. **Med: Breadcrumb behaviour inconsistent.** `nav-top-bar.tsx` shows a breadcrumb for practice pages (`getPracticePageMeta`), a "tagline | title | role pill" row for the rest; the title then repeats in the page `<h1>`. Top bar title plus h1 plus eyebrow is three labels for one page.
23. **Low: `/uat-bugs`, `/maintenance`, `/plan-steps/[id]`** are orphaned from nav; `/uat-bugs` renders outside AppShell (no nav, no way back).

### States and feedback
24. **High: No route-level loading/error/not-found boundaries.** No `loading.tsx`, `error.tsx`, `not-found.tsx`, `global-error.tsx` in `app/`. Loading handling is ad hoc strings: "Loading admin console…" (`app/admin/page.tsx`), "Loading console…" (`app/platform/page.tsx`), "Loading team overview…" (`app/manager/page.tsx`, a centred grey line). Only 9 files use skeleton/pulse. Add skeletons per shell, a branded 404 and error page with retry and support link.
25. **Med: Empty states** are per-component ad hoc; add an `EmptyState` (icon, headline, explanation, primary action) and use in tables/queues (`manager-action-inbox.tsx`, `review-queue.tsx`, `platform-support-queue.tsx`, `audit-log-panel.tsx`).
26. **Med: Destructive confirmations.** `ConfirmDialog` exists (good) but 3 instances still use `window.confirm`/`alert`. Standardise on ConfirmDialog and `sonner` toasts (used in `platform-console.tsx`; check coverage elsewhere).
27. **Med: `DataSourceBanner`** (demo vs live) appears on some pages (`/dashboard`, `/growth-plan`, `/my-practice`) but not others; make a single, consistent global "Demo data" indicator in the top bar.

### Data density / tables
28. **Med: Tables.** `components/ui/data-table.tsx` provides toolbar/pagination/shell but not sort, column visibility, sticky header, row selection, or empty state; several tables (`manager-team-table.tsx`, `user-management.tsx`, `platform-tenant-table.tsx`) probably re-implement. Roster renders both `ManagerTeamRoster` and `ManagerTeamTable` stacked on the same page (`manager-page-shell.tsx` case `roster`): two views of the same people; make it a card/table toggle.
29. **Med: Fixed widths.** 50 occurrences of `min-w-[###px]`/`w-[###px]`; combined with 220px fixed sidebar and `lg:` breakpoint, tablet portrait (768-1023px) gets the mobile chip nav and wide desktop-density tables. Audit tablet behaviour; add card-list fallbacks for tables below `md`.

### Content / microcopy
30. **Low/Med:** Mixed ellipsis ("Loading…") and sentence/Title case ("Audit log" in nav vs "Audit Log" in `admin-tabs.tsx`); eyebrows such as "Platform"/"Platform Overview"/"Platform Settings" are used in the Tenant Admin console and collide with the Super Admin "Platform" console; "Operator" vs "Super Admin"; "AI Growth Plans" header vs "Development" nav label (manager `dev` section); "Learn: GenAI vs Agentic AI" is a campaign-specific title for a generic nav item "Learn". Login page claims "47 users" (hard-coded static in `app/login/page.tsx`), "MFA required on every sign-in" set in 9px mono.
31. **Low:** Session-expiry copy mentions "15 minutes" hard-coded while tenant session policy is configurable (`LOGIN_ERRORS.session_expired`).

### Theming
32. **Med: No dark mode** (0 `dark:`; `color-scheme: light`). Fine for v1 but with hex scattered it can't be retrofitted; solve via semantic tokens first.
33. **Med: Tenant branding is partial.** `--tenant-primary` is set on the shell but sidebar/header use hard-coded `#00143a` and the gradient accent line `#0033a1,#0071ce,#cc27b0`; mobile nav active chip alone uses `branding.primaryColor`. Hard-coded "sailpoint.io" slug in `AdminTenantBadge`.

---

## C. Per-area recommendations

### Shell and navigation (`components/app-shell-view.tsx`, `nav-sidebar.tsx`, `nav-top-bar.tsx`, `lib/navigation/*`, `lib/auth/rbac.ts`)
- Create a single nav model (`lib/navigation/nav-model.ts`) with `{id, href, label, icon, group, roles, badge}`; derive sidebar, mobile drawer, page title, breadcrumb, command-palette entries from it. Remove `page-title.ts` label maps and `NAV_ROUTE_ICONS`.
- Add `aria-current="page"` to active links; rename active style to use border + weight, not only colour.
- Replace `NavMobile` chip bar with a slide-in drawer (reuse `NavSidebar`), fix active detection with `isManagerPortalNavItemActive` etc., remove or role-scope `MobilePracticeShell`.
- Make the top-bar search real (Cmd+K palette across pages, people, tenants) or remove it. Add sticky offset awareness for the 44px bar.
- Add a skip link and `aria-label` to the `aside`. Increase sidebar text to 12-13px and group labels to 10-11px; raise `text-white/30` tagline contrast.

### SE workspace (`/dashboard`, `/my-plan`, `/growth*`, `/feedback`, `/learn`, `/lab`, `/certifications`, `/resources`, `/account*`)
- Unify headers via the shared `PageHeader`. `/growth-plan` and `/my-practice` should use it too.
- `/growth` to `/growth/readiness` link is a tiny `text-xs` text link; promote to tabs ("Growth | Readiness") sharing a layout.
- `/my-plan`: the ramp plan is the SE's primary object; show "next step due" and progress at the top, deep-link to `/plan-steps/[id]`; add a `plan-steps` breadcrumb back to plan (the page is not in nav).
- `/learn`: rename page title to "Learn" with the campaign as a section; `/resources`: add search + filter chips + empty state.
- `/lab` (ISC Lab AI coach): subtitle is 30 words; move to helper text, show source citations as chips, add streaming/loading/error states and keyboard submit hint.
- `/account`, `/account/change-password`: ensure password rules and MFA step are announced with `aria-live`; label inputs.

### Practice (`/simulations`, `/challenges`, `/prep`, `/pitch`, `/flight-check`, `/market-pulse`, `/my-practice`)
- All use `contentWidth="full"` and bespoke headers; give them a `PracticePageShell` with consistent sub-bar (the "workspace tag" colours in `practice-page-meta.ts` are hard-coded pastel hexes, e.g. `#FDF0FA`/`#A51E8E`) tied to tokens.
- The `RoleSwitcher` "demo role" in the top bar (`nav-top-bar.tsx`) appears on practice pages for SEs: it's a demo/dev affordance in production chrome; label clearly or gate by flag.
- Mobile: these are the most touch-heavy flows (video pitch, simulation voice/text); verify full-height layouts with `h-full overflow-hidden` do not clip behind the fixed bottom bar and iOS keyboard.

### Manager (`app/manager/page.tsx`, `components/manager/*`)
- Move sections to routes with their own data fetching; `/manager` currently loads all datasets for every section (performance and perceived-speed issue).
- `ManagerPageLayout` already has `compact`/`bleed` variants; fold into `PageHeader density`.
- Command Center: lead with "Needs you today" (inbox count by type, at-risk SEs) before stat strips (see hero screens).
- Roster: choose table or cards; show both only via toggle. Row click should open `ManagerSeDetailPanel` as an accessible drawer (focus trap, Esc, `aria-modal`, return focus).
- Action Inbox: add badge count in sidebar; bulk actions; keyboard navigation between items; SLA/age column.
- Readiness map/heatmap: add legend, numeric labels, tooltip text alternative, and table fallback for screen readers.
- Mentees section is missing from `MANAGER_SECTION_LABELS` and rbac nav; fix.

### Tenant admin (`app/admin/page.tsx`, `components/admin/*`)
- `ReadinessOutcomeCorrelation` is rendered in `app/admin/page.tsx` below `AdminConsole` on every tab (including Users, Settings, Audit); move into Analytics (or Overview) tab.
- Remove dead `admin-tabs.tsx` (`AdminTabs`); keep `AdminTabPanel` only if used.
- Eliminate tab state duplication (`useState` + `useEffect` + `router.replace`) by reading `searchParams` directly or moving to routes.
- Settings: 4 sidebar sections + headers for 5 keys (`retention` has a header but no nav item). Align names and generate "22 toggles" from the flag list. Group flags by area with search, show which are inherited from platform entitlements vs tenant-controlled, and unsaved-changes bar like platform has (`platform-unsaved-banner.tsx`).
- Users: bulk import and user table should show validation errors inline per row; role changes need confirm and audit hint.
- Security & Compliance tab (new): "dormant accounts", "SSO status": use status chips with text, and make rows actionable (deactivate, resend invite).
- `AdminTenantBadge` hard-codes `sailpoint.io`; use tenant domain from branding.

### Platform super-admin (`app/platform/page.tsx`, `components/platform/*`)
- `PlatformConsole` is a very large single client component (many imports and 9 views; tenant detail has 9 sub-tabs). Split by route (`/platform/tenants/[id]/(entitlements|sso|…)`) so tenants have deep-linkable URLs.
- Page uses `SEPageLayout bare` and has no page headers/titles per view, unlike admin and manager; add `PageHeader`.
- "Now" should be the mission-control view: open support, tenants at risk, failed provisioning, today's shadow sessions; use health traffic-light with icons.
- `ShadowTenantBanner`: critical safety UI: keep sticky, high-contrast, include "Exit" button and mode; verify it does not scroll away and is announced (`role="status"`).
- Tenant table: sortable columns, filter by health/plan, bulk-select, empty state; `PlatformUnsavedBanner` pattern should be reused by admin settings.

### Auth (`/login`, MFA, reset, share, maintenance)
- Login: split layout is polished, but labelling, error `role="alert"`, show/hide password, autofill attributes (`autocomplete`) should be verified in `login-form.tsx`; remove hard-coded "47" social proof (or compute safely); 9-10px mono security notes need larger type. Left panel should collapse on tablet.
- MFA: `OtpInput` (`components/design/otp-input.tsx`) must support paste, `inputmode="numeric"`, `autocomplete="one-time-code"`, per-digit `aria-label`.
- `/maintenance`: uses inline hex; make a generic `StatusPage` component used for maintenance, 404, error, session-expired; offer a "Retry"/"Contact support" action.
- `/share/[token]`: external audience: should not show app chrome, must be responsive, accessible, and brand-able per tenant; check expiry/invalid-token states.

---

## D. Prioritised roadmap

### Quick wins (days)
1. Add global `:focus-visible` style; remove/replace `outline-none` where no replacement exists.
2. Fix label drift in `page-title.ts`, `admin-portal-nav.ts`, `ADMIN_SETTINGS_HEADERS`, rbac duplicates; add `aria-current` to sidebars.
3. Raise `sp-text-subtle`/`ghost` tokens to AA and bump min text size to 11-12px in nav, badges, breadcrumbs, login footer.
4. Move `ReadinessOutcomeCorrelation` off the bottom of every admin tab; delete `admin-tabs.tsx`'s unused `AdminTabs`.
5. Add `app/not-found.tsx`, `app/error.tsx`, `app/loading.tsx` (and shell-level `loading.tsx` for `/manager`, `/admin`, `/platform`).
6. Fix mobile nav active state and hide `MobilePracticeShell` for non-SE workspaces; add the skip link.
7. Remove or implement the fake search box in `nav-top-bar.tsx`.

### Medium (1-3 sprints)
1. Build `PageHeader`/`PageContainer`, `Field`/`Label`, `Tabs`, `EmptyState`, `Skeleton`, `Drawer`, `Select`, `Switch` in `components/ui`; migrate SE/Manager/Admin layouts; collapse `components/design`, `manager-ui-primitives`, `metric-card`, `status-badge` into it.
2. Tokenise colours: codemod top 30 hex values to `sp-*` classes; add status and focus tokens; wire tenant primary through to sidebar/gradient.
3. Single nav model driving sidebar, mobile drawer, top-bar title/breadcrumb, command palette; lucide icons across all workspaces.
4. Mobile/tablet pass: drawer nav, table to card fallbacks, tablet breakpoints for 220px sidebar.
5. Form accessibility sweep (labels, errors, `aria-invalid`, `autocomplete`) across the 54 files with inputs.
6. Upgrade `DataTable` (sort, sticky header, empty/loading/error, density toggle) and migrate roster, users, tenants, audit.

### Larger redesigns (quarter)
1. Convert `/manager`, `/admin`, `/platform` from query-string views to nested routes with per-route loading/metadata and data fetching.
2. Command Center redesign for managers; Mission Control for platform; SE "Today" dashboard (see hero screens).
3. Command palette + global search + notification centre unification.
4. Dark mode / full theming built on semantic tokens.
5. Practice experience unification (sim, pitch, challenge, prep as a common session shell with timer, transcript/video, rubric).

---

## E. Hero screens for visual redesign

1. **Manager Command Center** (`components/manager/manager-command-center.tsx`, `manager-priority-digest.tsx`). Today it is a bento of stat strips. Redesign as "Needs you today": ranked action list (reviews waiting by type with age, SEs at risk with reason), team ramp health strip with sparkline trend, upcoming 1:1/cadence, quick actions. Show: count + oldest item age, at-risk SEs (name, signal, suggested next step), weekly readiness delta, recognition opportunities.
2. **SE Workspace / Dashboard** (`components/se/se-workspace-northstar.tsx`, `/dashboard`). Hero "Next best action" card (current ramp step, due date, one-click continue), readiness ring with competency breakdown, streak/points, upcoming deadlines (cert, plan), recent feedback from manager, and 3 recommended practice items. Replace emoji with icon system.
3. **Manager Readiness Map** (`readiness-map.tsx`, `team-readiness-heatmap.tsx`). Accessible heatmap (people x competencies) with legend, numbers in cells, trend arrows, filters (segment, level), drill-in drawer with evidence (sims, challenges, certs) and "assign practice" CTA; table view toggle.
4. **Platform Mission Control "Now"** (`platform-now-panel.tsx`, `platform-operator-digest.tsx`). Fleet health summary (tenants by status), alert queue (failed jobs, SSO errors, support SLA), tenant search (Cmd+K), recent shadow sessions, usage trend. Single-glance, severity-sorted, with icons not just colours.
5. **Tenant detail (Platform) / Entitlements** (`platform-tenant-entitlements.tsx`, `platform-tenant-ops-panels.tsx`). Replace 9 horizontal sub-tabs with a left-rail or sectioned page: header with health, plan, key contacts, "Enter as admin" CTA; entitlements as grouped, searchable matrix with presets and diff-preview before save.
6. **Admin Overview & Settings** (`northstar-admin-summary.tsx`, `admin-settings-*`). Overview: setup checklist (SSO, users imported, plans assigned, integrations), adoption KPIs, pending reviews breakdown. Settings: grouped feature flags with descriptions, search, dependency hints, sticky save bar.
7. **Practice session shell: Simulations / Pitch Studio** (`simulation-workspace.tsx`, `components/pitch/*`). One immersive, consistent session layout: scenario brief left, live conversation/video centre, rubric + coaching right collapsible on mobile; clear pre-flight (mic/camera), recording/timer states, post-session scorecard with competency deltas and "send to manager" action.
8. **Login + MFA** (`components/auth/*`). First impression and a11y: single card layout on tablet/mobile, correctly labelled fields, step indicator with real text, accessible OTP, brand-able per tenant, remove fake social proof.
