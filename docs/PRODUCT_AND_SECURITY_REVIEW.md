# SE Enablement Platform — Security, Workflow & Strategy Review

**Date:** July 2026  
**Scope:** Full codebase security audit, SE/manager workflow validation, competitive gap analysis, Agentic Fabric / AIS enablement recommendations.

---

## Executive summary

This platform has a strong foundation: ramp plans, AI simulations, challenge library, certifications, development goals, manager inbox, and trophy badges. To become a **million-dollar internal product** with industry-leading SE readiness, the biggest gaps vs. COTS (Mindtickle, Seismic/Highspot) are:

1. **Unified manager cockpit** — one inbox for everything (challenges, sims, certs, plan steps, quarterly reviews)
2. **Readiness analytics** — team skill heatmaps, trend lines, and “who needs coaching before the QBR”
3. **Conversation intelligence** — tie simulation/coaching data to competency gaps automatically
4. **Agentic enablement** — teach SailPoint’s newest story (Agentic Fabric, AIS, MCP) through scenarios, not slides
5. **Security hardening** — several issues fixed in this pass; more listed below for follow-up

---

## Part 1 — Security findings

### Fixed in this pass ✅

| Severity | Issue | Fix |
|----------|-------|-----|
| **Critical** | `example.com` allowed in production email domains | Dev-only unless `ALLOW_DEV_EMAIL_DOMAIN=true` or non-production |
| **Critical** | MFA RLS missing on `deal_prep_sessions`, `shadow_meeting_logs`, `mentor_review_requests`, `platform_settings`, `ai_usage_logs` | Migration `20260719120000_mfa_missing_tables.sql` |
| **High** | `isPractice: true` without assignment auto-approved coaching cards | Require `simulationAssignmentId` for practice; never trust `isPractice` alone |
| **High** | Client-controlled `promptSnapshot` when AI enabled | Require `assignmentId` when AI model is configured |
| **High** | Temporary password returned in admin user API | Removed from response; use `sendInvite` flow |
| **Medium** | Development plans GET lacked app-layer auth | Added `canViewUserDevelopmentPlan()` |
| **Medium** | Manager could comment on unshared deal prep | PATCH requires `shared_with_manager` |
| **Medium** | Unauthenticated API returned HTML redirect | `/api/*` returns `401` JSON |
| **Medium** | Missing Supabase env passed all traffic | Production protected routes return `503` |

**Apply migration:** `supabase/migrations/20260719120000_mfa_missing_tables.sql`

### Open — prioritize next sprint

| Severity | Issue | Recommendation |
|----------|-------|----------------|
| **High** | No AI rate limiting | Per-user daily token budget; `429` when exceeded; align with `ai_usage_logs` |
| **High** | Forged coaching card scores (client POST) | Server-generate coaching cards in one flow, or sign AI output server-side |
| **High** | Over-broad plan step approval (`isElevatedReviewer`) | Mirror `can_review_plan_assignment` RLS in `complete-step.ts` |
| **High** | Legacy plaintext API keys in DB | Migration script to encrypt all rows; fail closed in production |
| **Medium** | Admin upload: no size/MIME limits | Match evidence bucket allowlist |
| **Medium** | Simulation template `prompt_body` exposed to all users | Return metadata only; prompts server-side at turn time |
| **Medium** | Any user can POST global challenges | Restrict save to manager/admin or private drafts |
| **Medium** | `insert_audit_log` callable by any authenticated user | Restrict to `service_role` |
| **Medium** | CSRF on cookie-authenticated mutations | Verify `SameSite`; add custom header check on PATCH/POST |
| **Low** | Evidence path not verified on submission | Verify `${userId}/` prefix + storage object exists |
| **Low** | `/design/*` bypasses RBAC | Admin-only or non-production |

### Positive controls already in place

- MFA + restrictive RLS on core tables
- `canReviewUserWork` on manager review routes
- Column-level triggers preventing self-approval
- Encrypted AI keys (AES-256-GCM) when configured
- Email domain enforcement in middleware
- Zod validation on most API inputs

---

## Part 2 — SE workflow review

### Intended happy path

```
Login/MFA → Workspace (what's next) → Ramp step OR self-serve practice
    → Challenge / Simulation / Cert / Development goal
    → Submit evidence → Manager reviews → Feedback + Trophy badge
```

### Fixed in this pass ✅

- **Cert “with manager”** — workspace pill shows awaiting sign-off when cert is submitted
- **Challenge revision banner** — workspace + Feedback page show send-back items (not simulation-only)
- **Deal prep routing** — ramp steps link to `/prep` correctly
- **Feedback inbox** — “Needs your attention” section for revisions before approved history

### Remaining SE friction (recommended)

| Priority | Issue | Fix |
|----------|-------|-----|
| P0 | No full ramp plan view for SE | Read-only `/plans` or expandable checklist on workspace |
| P0 | Growth vs Development overlap | Cross-links + single “career” nav group |
| P1 | “Jump to” missing Development, Certs, Feedback | Add to workspace quick links |
| P1 | Practice vs formal simulation confusion | Badge + “This is practice” strip on sim workspace |
| P2 | Empty state when no plan assigned | Show manager name + mailto |
| P2 | Challenge library doesn’t show trophy earned state | Link library badges to Account trophies |

### SE nav order suggestion

Current: Workspace → Readiness → Practice → Account  

**Proposed:** Workspace → **Learn** (Resources, Challenges, Sims) → **Prove** (Certs, Development) → **Reflect** (Feedback, Growth, Account)

Rationale: “Do work” before “track progress”; Feedback after submissions make sense.

---

## Part 3 — Manager workflow review

### Intended happy path

```
Team overview → Action inbox (review queue) → Approve/send back
    → SE detail panel (1:1 prep) → Assign ramp / sim / development plan
    → Certifications sign-off → Quarterly attestation
```

### Fixed in this pass ✅

- **Development page** defaults to first direct report (not manager’s own plan)
- **Alert links** for inactive/stuck SEs point to `/manager` (not wrong Development page)

### Remaining manager friction (recommended)

| Priority | Issue | Fix |
|----------|-------|-----|
| P0 | Cert reviews not in Action inbox | Add `cert` filter; same approve/send-back UX |
| P0 | `AccountabilityDashboard` built but unwired | Surface on manager page as “Team health” tab |
| P0 | SE detail panel can’t inline review | Open inbox item in panel or deep-link `?review=` |
| P1 | Simulation assign buried at page bottom | Embed in SE detail panel |
| P1 | Two ramp plan homes (`/manager#` vs `/plans`) | Single canonical “Ramp plans” path |
| P1 | No team readiness heatmap | Competency × SE matrix from coaching cards + sim scores |
| P2 | No “talking points copy” for 1:1s | Export button on coaching snapshot |
| P2 | Quarterly review queue not on landing | Widget: “3 Q2 attestations due” |

### What managers need to answer (product gaps)

| Question | Today | COTS benchmark (Mindtickle) |
|----------|-------|----------------------------|
| Who is ready for customer calls? | Partial (sim avg, health badge) | **Readiness Index** per rep |
| What are they weak at? | Coaching card gaps (per sim) | **Skill heatmap** across team |
| Who haven’t I coached in 30 days? | 14-day inactivity alert | **Coaching cadence** dashboard |
| Are they improving? | Sim scores in detail panel | **Trend charts** over time |
| What should I assign next? | Manual | **AI-recommended** practice based on gaps |

---

## Part 4 — Agentic AI & SailPoint market enablement

SailPoint’s 2026 story centers on **Agentic Fabric** and **Agent Identity Security (AIS)** — governing AI agents as first-class identities (discover → govern → protect), zero-standing privilege, and the **MCP Server** for AI-native integrations.

### Enablement scenarios to build

| Scenario type | What SE learns | Platform fit |
|---------------|----------------|--------------|
| **AIS discovery workshop** | CISO pain: shadow AI, NHI sprawl, over-permissioned agents | New Advisory simulation persona + challenge |
| **Agent inventory brief** | Connect AWS/Azure/GCP agent aggregation to customer language | Challenge: “Map 3 agent types to ISC controls” |
| **ZSP narrative** | Least privilege → zero standing privilege for agents | Certification gate or Senior challenge |
| **MCP integration story** | How third-party agents call SailPoint APIs governed | Deal prep template for technical buyers |
| **Market pulse quiz** | Weekly 5-question agent on competitor moves, SailPoint releases | New “Market pulse” micro-assessment |
| **Customer objection: “We already have Entra for agents”** | Position ISC + AIS vs. directory-only | Simulation persona + coaching rubric |

### Agentic AI inside *this* platform

| Idea | Description |
|------|-------------|
| **Coach agent** | After simulation, agent proposes 3 follow-up drills based on gaps (not just static list) |
| **Ramp planner agent** | Manager: “Jordan is weak on workflows” → agent suggests plan step + challenge bundle |
| **Deal prep agent** | Pull account context + recommend ISC/AIS talk track for vertical |
| **Grading agent** | Manager co-pilot drafts feedback from transcript (manager edits before send) |
| **Market analyst agent** | Weekly digest: SailPoint blog, competitor news, suggested SE talking points |

### Teaching & learning loops

1. **Learn** — Resources + challenge library + AIS content track  
2. **Practice** — AI simulation with SailPoint-accurate personas  
3. **Prove** — Submit + manager validation  
4. **Reflect** — Feedback + trophies + competency trend  
5. **Reinforce** — Spaced repetition: resurface weak competencies in new scenarios  

---

## Part 5 — Competitive gap analysis (COTS)

### vs. Mindtickle (~$450/user/yr) — readiness & coaching leader

| Their strength | Our status | Gap |
|----------------|------------|-----|
| Readiness Index | Partial (sim avg, cert gates) | **No single team readiness score** |
| AI role-play + scoring | ✅ Strong | Add **trend over time** |
| Call AI / conversation intel | ❌ | No Gong/CI integration |
| Gamification | Trophies ✅ | No leaderboards, streaks, points |
| Skill assessments | Cert gates ✅ | No adaptive assessments |

### vs. Seismic/Highspot (~$600–700/user/yr) — content & automation

| Their strength | Our status | Gap |
|----------------|------------|-----|
| LiveDocs / content personalization | ❌ | No CRM-driven collateral |
| Content analytics | Basic resources | No buyer engagement tracking |
| LMS + certifications | ✅ Certs + ramp | No formal LMS course builder |
| AI content recommendations | ❌ | Static library |

### vs. Allego / SalesHood — video coaching

| Their strength | Our status | Gap |
|----------------|------------|-----|
| Video pitch recording | Evidence upload only | No in-app video capture |
| Peer review | Manager only | No peer/mentor video feedback |

### What we have that COTS often lacks

- **Deep SailPoint domain** — ISC workflows, transforms, AIS, SLED/healthcare verticals  
- **Ramp plan tied to real enablement artifacts** — not generic LMS  
- **Manager-in-the-loop** on every proof point  
- **Encrypted AI key management** for enterprise security teams  
- **Custom trophy / achievement system** aligned to SailPoint career ladder  

### Million-dollar app roadmap (phased)

**Phase 1 — Manager engagement (Q3)**  
- Unified inbox (certs + quarterly reviews)  
- Team competency heatmap  
- Readiness index per SE  
- Accountability dashboard wired  

**Phase 2 — Intelligence (Q4)**  
- AI rate limits + cost dashboard (done partially in admin)  
- Coaching trend analytics  
- Gap-based challenge recommendations  
- Gong/Slack integration for activity signals  

**Phase 3 — Agentic enablement (2027)** ✅ *Implemented*  
- AIS / Agentic Fabric content track + 3 agentic certification gates  
- Market pulse agent (AI weekly generation + server persistence)  
- Manager co-pilot for feedback (coaching, submissions, certs)  
- MCP-powered “ask ISC” lab assistant (`/lab`)  

**Phase 4 — Enterprise COTS parity** ✅ *Implemented*  
- Video pitch capture → upload → manager review queue  
- Content personalization (LiveDoc-style) from deal prep output  
- Buyer engagement analytics (resource_engagement tracking)  
- Mobile-first practice mode (bottom nav shell)  

**Phase 5 — Practice loop & full COTS competitiveness** ✅ *Implemented*  
- Unified “Practice this week” orchestration on My Workspace  
- Gap recommendations inside Challenges / Simulations (not only Growth)  
- Deal Prep → Sim landmine chain + manager inbox for shared prep  
- Gong/Slack integration status + pre-call brief hook (`GONG_API_KEY`)  
- Spaced reinforcement (30/60/90-day resurface from coaching gaps)  
- SE-facing skill trend dashboard (Hyperbound-style)  
- CRM account ID field on deal prep for personalization path  

---

## Part 6 — What you might not know

### About this codebase

- **Two workspace UIs** exist (`northstar` flag) — ensure one path is canonical before big UX investments  
- **Mentor role = full manager UI** — may confuse mentors who only need inbox + notes  
- **Demo mode** hides data banner but uses different data paths — test Supabase flows separately  
- **31 curated challenges** in library but competency links are DB-only, not shown in UI yet  

### About the market

- **Seismic + Highspot merging (Feb 2026)** — roadmap uncertainty; building internal tooling avoids vendor lock-in  
- **Agentic identity is the 2026 board topic** — SEs who can’t speak AIS/Agentic Fabric will lose enterprise deals  
- **Zero-standing privilege (ZSP)** is replacing “least privilege” in SailPoint messaging — enablement content should update  

### About organizational adoption

- Tools fail when **managers don’t review within 48h** — add SLA alerts and digest emails  
- SEs need **≤3 clicks** from workspace to submit — still 4–5 in some paths  
- **Trophies drive behavior** — consider Slack/webhook when badge earned  

---

## Appendix — Files changed in security/UX pass

| Area | Files |
|------|-------|
| Security | `lib/auth/email-domain.ts`, `middleware.ts`, `app/api/simulations/coaching-cards/route.ts`, `app/api/ai/simulation-turn/route.ts`, `app/api/admin/users/route.ts`, `app/api/development/plans/route.ts`, `app/api/deal-prep/sessions/[id]/route.ts`, `lib/development/authorize.ts`, `supabase/migrations/20260719120000_mfa_missing_tables.sql` |
| SE UX | `lib/se/cert-next-action.ts`, `lib/utils/plan-links.ts`, `components/se/se-workspace.tsx`, `components/feedback/feedback-inbox.tsx` |
| Manager UX | `app/manager/page.tsx`, `manager-command-center.tsx`, `manager-action-inbox.tsx`, `manager-copilot-draft.tsx`, `team-readiness-heatmap.tsx`, `integration-signals-panel.tsx` |
| Agentic / COTS | `lib/learn/agentic-curriculum.ts`, `lib/challenges/sailpoint-challenge-library-batch3.ts`, `lib/challenges/gap-recommendations.ts`, `app/pitch/page.tsx`, `lib/gamification/leaderboard.ts` |

---

*Status: July 2026 — security batch 2 + batch 3 challenges shipped in code. Apply migrations `20260720120000` and `20260721120000` in Supabase.*

*Next recommended action: apply pending migrations, then enable Gong/Slack OAuth when workspace approves.*
