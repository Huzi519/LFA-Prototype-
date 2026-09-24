# CLAUDE.md — LFA (Labour Workforce Australia) Prototype

This file guides Claude Code when working in this repository. Read it fully before making changes.

## Project Overview

LFA (Labour Workforce Australia) is a marketplace for Australia where skilled tradespeople (plumbers, electricians, carpenters, etc.) create verified profiles and companies find and hire them directly. Three things make it different from a generic job board:

1. **Strict, structured worker profiles** with credentials (licences, White Card, insurance) that an admin verifies before they count.
2. **Admin-reviewed document sharing**: every document sent between a company and a worker — from first contact through to an active job — passes through an admin review before the other party can see it.
3. **Direct search and hire, not a job board**: companies search and browse worker profiles (including a public directory, no login required), contact a specific worker, negotiate through in-platform chat, and explicitly mark them as hired. There is no public job-posting/quoting flow.

This is a **prototype**. The goal is a working, clickable demo of the core flows, not a production system. Prefer simple, readable code over abstraction. Requirements are still being confirmed with the client, so keep business rules in one place (`src/lib/rules/`) where they are easy to change.

Note: escrow/payments, admin credential verification, and disputes are built into the data model as reference code but are **not wired into the app** — this was a deliberate scope cut. See `DECISIONS.md` for the full history, including the later pivot from a job-board model to direct search-and-hire with chat.

## Prototype Scope

### In scope
- Email/password auth with three roles: `WORKER`, `COMPANY`, `ADMIN`
- Worker onboarding wizard with required profile fields
- A public worker directory (search/browse, full profile minus phone/email) and the same search inside the company portal
- In-platform chat between a company and a worker: messages, structured proposals, document exchange, and an explicit "Mark as hired" action that creates the Job
- Document sharing with an admin review gate, available from first contact onward (not just post-hire)
- Admin dashboard: document review queue
- In-app notifications (database records shown in a bell menu)

### Out of scope (do not build unless asked)
- Real payment processing (the `PaymentProvider`/`MockPaymentProvider` interface exists as reference code but nothing in the app calls it)
- Admin credential verification queue, escrow/payments, disputes — schema and business-rule code exist (see below) but have no UI; explicitly cut by the client
- Automated licence register lookups, ID checks, ABN API calls (stub them)
- Native mobile apps, SMS/push/email delivery
- Ratings and reviews, timesheets, variations, milestone payments
- ATO reporting, GST invoicing, accounting integrations
- Multi-user company accounts
- A public job-posting/quoting flow (replaced by direct search-and-hire)

## Tech Stack

- **Framework:** Next.js 14+ (App Router) with TypeScript (strict mode)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** SQLite via Prisma (easy to swap to Postgres later)
- **Auth:** Auth.js (NextAuth) with the Credentials provider, role stored on the user
- **Validation:** Zod for every form and server action input
- **File uploads:** stored locally in `/uploads` (git-ignored), served only through an authorised route
- **Testing:** Vitest for business logic, Playwright for one happy-path end-to-end test

## Commands

```bash
npm install
npx prisma migrate dev      # apply schema changes
npx prisma db seed          # load demo data
npm run dev                 # start at http://localhost:3000
npm run test                # unit tests (Vitest)
npm run test:e2e            # end-to-end (Playwright)
npm run lint && npm run typecheck
```

Run `lint`, `typecheck`, and `test` before considering any task finished.

## Folder Structure

```
src/
  app/
    (public)/                    landing page, public worker directory (/, /workers, /workers/[id])
    (auth)/login, register
    worker/         dashboard, onboarding, messages, messages/[id], jobs, jobs/[id], documents
    company/        dashboard, workers (search), workers/[id], messages, messages/[id], jobs, jobs/[id]
    admin/          dashboard, documents
    api/
      files/[id]                 authorised file download route
      conversations/[id]/messages  chat polling endpoint (GET)
  components/
    chat/           ChatThread (owns live polled message state + proposal/hire controls), ProposalComposer
    worker-directory.tsx, worker-profile-detail.tsx  shared by public and company search/profile pages
    conversation-documents.tsx   admin-reviewed document list + upload, scoped to a Conversation
    role-nav.tsx, public-nav.tsx
    lfa/            design system pieces: worker-card, trade-chip, status-badge, page-header,
                    wordmark, auth-shell, nav-links, conversation-list, site-footer
  lib/
    db.ts           Prisma client
    auth.ts         session helpers, requireRole()
    rules/          business rules (credentials, eligibility, escrow transitions — escrow unused, see above)
    payments/       PaymentProvider interface + MockPaymentProvider (unused, reference only)
    actions/        conversations.ts (messages, proposals, hiring), documents.ts, notifications.ts
    storage.ts      file save/read with type and size checks
    notifications.ts  notify() helper
prisma/
  schema.prisma
  seed.ts
```

## Data Model (core entities)

Keep the Prisma schema close to this. Use string enums.

- **User**: id, email, passwordHash, role (`WORKER | COMPANY | ADMIN`), status (`ACTIVE | SUSPENDED`), createdAt
- **WorkerProfile**: userId, fullName, phone, abn, primaryTrade, otherTrades[], yearsExperience, bio, hourlyRate, homeState, serviceRadiusKm, postcode, profileStatus (`DRAFT | PENDING_REVIEW | LIVE | HIDDEN`)
- **CompanyProfile**: userId, companyName, abn, contactName, phone, state, postcode, verified (bool)
- **Credential**: id, workerId, type (`TRADE_LICENCE | WHITE_CARD | PUBLIC_LIABILITY | WORKERS_COMP | POLICE_CHECK | WWCC | OTHER`), trade (nullable), licenceNumber, issuingState, issuer, expiryDate, fileId, status (`PENDING | APPROVED | REJECTED | EXPIRED`), reviewedBy, reviewedAt, rejectionReason
- **Conversation**: id, companyId, workerId (unique per pair — one thread reused across contact → negotiation → hire), jobId (nullable, set once hired), createdAt. The hub for chat, proposals and documents.
- **Message**: id, conversationId, senderId, kind (`TEXT | PROPOSAL | SYSTEM`), body, proposalTitle/proposalDescription/proposalBudget (set only when kind = PROPOSAL), createdAt
- **Job**: id, companyId, workerId (required — a Job only exists once hired), title, description, trade, state, postcode, startDate, budget, status (`HIRED | IN_PROGRESS | COMPLETED | DISPUTED | CANCELLED`, default `HIRED`)
- **Document**: id, conversationId, uploaderId, recipientId, category (`CONTRACT | DRAWING | SCOPE | SWMS | INDUCTION | PROOF_OF_COMPLETION | OTHER`), fileId, status (`PENDING_REVIEW | APPROVED | REJECTED`), reviewNote — attaches to the **Conversation**, not the Job, so review applies from first contact onward
- **EscrowTransaction** / **EscrowEvent** / **Dispute**: unchanged shape, but unused reference code (no UI calls these — see "Out of scope")
- **File**: id, ownerId, originalName, mimeType, sizeBytes, storagePath
- **Notification**: id, userId, message, link, read, createdAt

Money is stored as **integer cents**. Never use floats for money.

## Key Business Rules

All rules live in `src/lib/rules/` as pure functions with unit tests.

### Worker profiles
- Required before submitting for review: fullName, phone, primaryTrade, yearsExperience, homeState, postcode, serviceRadiusKm, hourlyRate, bio (min 50 characters), and at least one uploaded credential.
- ABN is required and must be 11 digits and pass the ABN checksum algorithm (implement locally; no API call).
- A profile becomes `LIVE` only when an admin approves at least one credential and the required credentials for the worker's trade (see below).

### Required credentials by trade (configurable map)
```ts
// src/lib/rules/requiredCredentials.ts
PLUMBER:     [TRADE_LICENCE, WHITE_CARD, PUBLIC_LIABILITY]
ELECTRICIAN: [TRADE_LICENCE, WHITE_CARD, PUBLIC_LIABILITY]
CARPENTER:   [WHITE_CARD, PUBLIC_LIABILITY]
LABOURER:    [WHITE_CARD]
```

### Licences are state-based
- A `TRADE_LICENCE` is only valid in its `issuingState`.
- `canWorkerTakeJob(worker, job)` returns false if the job's trade needs a licence and the worker has no `APPROVED`, unexpired licence for that trade issued in the job's state. Show the reason in the UI.

### Expiry
- A credential with `expiryDate` in the past is treated as `EXPIRED`, whatever its stored status. Compute this at read time; also provide a script (`npm run check-expiry`) that updates statuses and notifies workers 30 days before expiry.
- If a required credential expires, the profile is set to `HIDDEN` and the worker cannot quote on new jobs.

### Documents
- Documents attach to a **Conversation**, not a Job — a conversation exists from first contact, so document exchange can (and does, per the client's flow) happen during negotiation, before any hire.
- Every uploaded document starts as `PENDING_REVIEW` and is invisible to the recipient until an admin approves it.
- The uploader can always see their own documents and their status.
- Rejected documents show the admin's note to the uploader only.

### File uploads
- Allowed types: PDF, JPG, PNG. Max 10 MB. Check the MIME type from file contents, not just the extension.
- Files are never served from a public folder. `GET /api/files/[id]` checks that the requester is the owner, an admin, or the recipient of an approved document.

## Escrow State Machine (reference only — not wired into the app)

This section describes `src/lib/rules/escrow.ts`, which stays in the codebase, unit-tested, as reference logic. No Server Action or route calls it — escrow/payments were cut from scope. Keep it working and tested; don't build UI for it unless asked.

Implement transitions in `src/lib/rules/escrow.ts` as a single `transition(escrow, action, actor)` function. Any transition not listed must throw. Every successful transition writes an `EscrowEvent`.

```
AWAITING_FUNDING --fund (company)-------------------> FUNDED
FUNDED           --start (worker)-------------------> IN_PROGRESS
IN_PROGRESS      --submitProof (worker)-------------> PROOF_SUBMITTED
PROOF_SUBMITTED  --approve (company)----------------> RELEASED
PROOF_SUBMITTED  --autoRelease (system, after N days)> RELEASED
PROOF_SUBMITTED  --reject (company, with reason)----> IN_PROGRESS
FUNDED | IN_PROGRESS | PROOF_SUBMITTED
                 --raiseDispute (company|worker)----> DISPUTED
DISPUTED         --resolveRelease (admin)-----------> RELEASED
DISPUTED         --resolveRefund (admin)------------> REFUNDED
AWAITING_FUNDING | FUNDED
                 --cancel (company, before start)---> REFUNDED
```

- Hiring a worker (accepting a quote) creates the escrow in `AWAITING_FUNDING`. The job cannot start until it is `FUNDED`.
- `submitProof` requires at least one `PROOF_OF_COMPLETION` document (photos or a completion report). Proof documents also go through admin review, and the company cannot approve until the proof is admin-approved.
- Platform fee: a flat percentage from config (`PLATFORM_FEE_PERCENT`, default 10). Calculate `platformFee` and `workerPayout` when the escrow is created.
- Auto-release delay comes from config (`AUTO_RELEASE_DAYS`, default 7). Implement as a script (`npm run auto-release`) rather than a background worker.
- Keep job status in sync with escrow status inside the same database transaction.

### Payment provider
Define a `PaymentProvider` interface (`createHold`, `capture`, `release`, `refund`) and implement `MockPaymentProvider`, which just returns fake reference IDs and logs calls. The UI shows a fake "Pay now" card form clearly labelled **TEST MODE**. The interface must make it straightforward to add a Stripe Connect provider later.

## Core User Flows (build and demo these)

1. **Worker onboarding:** register → multi-step wizard (personal details → trade and experience → service area and rate → upload credentials) → submit → profile is `PENDING_REVIEW`.
2. **Admin verification:** not built (see "Out of scope") — in this prototype a profile only ever reaches `LIVE` via seed data.
3. **Search, contact and hire:** company (or an anonymous visitor on the public directory) searches/browses `LIVE` workers by trade, state and keyword → opens a profile → a logged-in company clicks "Message this worker", which finds-or-creates a `Conversation` → they chat, the company sends a structured `PROPOSAL` message (title, description, budget) → the company clicks "Mark as hired", confirms the job details (prefilled from the latest proposal) → this creates the `Job` (status `HIRED`), links it to the conversation, and posts a `SYSTEM` message.
4. **Documents:** either party uploads a document on the conversation (available from first contact, not gated on a hire) → admin approves → the other party sees it.
5. **Notifications:** every message, proposal, hire and document review creates an in-app `Notification` for the other party, read via the bell menu in the nav.

## Seed Data

Per the client's later simplification request (see DECISIONS.md), `prisma/seed.ts` now creates a deliberately small set of *functional* demo accounts plus a large pool of browsable-only worker profiles:
- 1 admin: `admin@demo.test`
- 1 company: `builder@demo.test` ("Builder Co Pty Ltd")
- 1 fully-featured worker: `worker.live@demo.test` (Jack Thompson, plumber, NSW, `LIVE` with approved credentials) — the only worker account meant to be logged into; the demo login helper shows exactly these three accounts
- 20 additional `LIVE` worker profiles across all four trades and every state, for directory search/browsing only — plain data, no credentials, not featured as demo logins
- The one company and the one worker have **3 jobs together** (2 `IN_PROGRESS`, 1 `DISPUTED`) — each its own Conversation, since a company can now re-hire the same worker (`getOrCreateConversation` reuses an open thread or starts a fresh one; see DECISIONS.md). The same 3 jobs show up on both dashboards. One job has an admin-approved document, one has a document still `PENDING_REVIEW` (keeps the admin queue non-empty), the disputed one has escrow/dispute reference rows attached (see the note above — unused by the app, kept for schema completeness).
- Sample PDFs/images in `prisma/seed-files/`

All demo passwords: `Password123!`. Show a demo login helper on the login page in development only.

## Coding Conventions

- Use Server Actions for mutations; validate input with Zod at the top of every action.
- Every server action and route calls `requireRole(...)` and checks ownership of the record it touches. Never trust IDs from the client.
- Business logic goes in `src/lib/rules/`, not in components or actions. Components stay presentational.
- Use Prisma transactions for any change that touches more than one table (e.g. hiring, escrow transitions).
- Dates are stored in UTC and displayed in `Australia/Sydney` time. Use Australian formats (DD/MM/YYYY, AUD with `$`).
- Use Australian English in UI copy (e.g. "licence" for the noun, "organisation").
- Keep components under ~200 lines; split when larger.
- No `any`. No disabled lint rules without a comment explaining why.

## Testing Priorities

Write unit tests for, at minimum:
- Every allowed and disallowed escrow transition, including role checks
- `canWorkerTakeJob` (state licence rule, expiry, missing credentials)
- ABN checksum validation
- Fee and payout calculation in cents

One Playwright test covering search → message → proposal → mark as hired → document exchange → admin review, end to end.

## Build Order (historical)

This is the order the prototype was actually built in. Steps 1, 2, 6 and 8 were built as described below; steps 3, 5 and 7 were cut by the client before being built (see `DECISIONS.md`); step 4 was built as a job-board flow and later **replaced** by the direct search-and-hire + chat flow described throughout this file — see `DECISIONS.md` for that pivot.

1. Project setup, Prisma schema, seed, auth with roles and role-based layouts
2. Worker onboarding wizard and file uploads
3. ~~Admin credential verification queue and profile status logic~~ — cut
4. ~~Company job posting, worker job feed with eligibility, quotes, hiring~~ — replaced by direct search-and-hire + chat
5. ~~Escrow state machine, mock provider, company/worker escrow views~~ — cut (rule code kept as reference)
6. Document sharing with admin review
7. ~~Disputes and admin escrow overview~~ — cut
8. Notifications, expiry script, polish and tests

## Open Questions (waiting on client)

These are assumptions for the prototype. Keep them configurable and do not over-engineer them:
- Which trades and states are in scope at launch (seed covers a sample)
- Whether homeowners can hire, or only businesses (prototype: businesses only)
- Exact required profile fields and credentials per trade
- Which documents need admin review (prototype: all of them)
- Who approves completion (prototype: admin reviews proof, company gives final approval)
- Fee model and auto-release period
- Real payment provider (likely Stripe Connect or Zai)

When a requirement is unclear, choose the simplest reasonable option, note it in `DECISIONS.md`, and continue.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
