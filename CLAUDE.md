# CLAUDE.md — LFA (Labour Workforce Australia) Prototype

This file guides Claude Code when working in this repository. Read it fully before making changes.

## Project Overview

LFA (Labour Workforce Australia) is a marketplace for Australia where skilled tradespeople (plumbers, electricians, carpenters, etc.) create verified profiles and companies hire them for jobs. Three things make it different from a generic job board:

1. **Strict, structured worker profiles** with credentials (licences, White Card, insurance) that an admin verifies before they count.
2. **Admin-reviewed document sharing**: documents sent between companies and workers pass through an admin review before the recipient can see them.
3. **Escrow payments**: the company funds the job upfront, and money is released to the worker only after proof of completion is approved.

This is a **prototype**. The goal is a working, clickable demo of the core flows, not a production system. Prefer simple, readable code over abstraction. Requirements are still being confirmed with the client, so keep business rules in one place (`src/lib/rules/`) where they are easy to change.

## Prototype Scope

### In scope
- Email/password auth with three roles: `WORKER`, `COMPANY`, `ADMIN`
- Worker onboarding wizard with required profile fields
- Credential upload and admin verification queue
- Company job posting, worker quotes, and hiring
- Document sharing with an admin review gate
- Simulated escrow (fund → hold → proof → approve → release)
- Basic dispute flag that freezes escrow and sends the job to admin
- Admin dashboard: verification queue, document queue, disputes, escrow overview
- In-app notifications (database records shown in a bell menu)

### Out of scope (do not build unless asked)
- Real payment processing (use the mock provider described below)
- Automated licence register lookups, ID checks, ABN API calls (stub them)
- Native mobile apps, SMS/push/email delivery
- Ratings and reviews, messaging/chat, timesheets, variations, milestone payments
- ATO reporting, GST invoicing, accounting integrations
- Multi-user company accounts

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
    (auth)/login, register
    worker/         dashboard, onboarding, profile, credentials, jobs, documents
    company/        dashboard, jobs/new, jobs/[id], workers (search)
    admin/          dashboard, verifications, documents, disputes, escrow
    api/files/[id]  authorised file download route
  components/       shared UI
  lib/
    db.ts           Prisma client
    auth.ts         session helpers, requireRole()
    rules/          business rules (credentials, eligibility, escrow transitions)
    payments/       PaymentProvider interface + MockPaymentProvider
    storage.ts      file save/read with type and size checks
    notifications.ts
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
- **Job**: id, companyId, title, description, trade, state, postcode, startDate, budget, status (`OPEN | HIRED | IN_PROGRESS | PROOF_SUBMITTED | COMPLETED | DISPUTED | CANCELLED`), hiredWorkerId
- **Quote**: id, jobId, workerId, amount, message, status (`SUBMITTED | ACCEPTED | DECLINED | WITHDRAWN`)
- **Document**: id, jobId, uploaderId, recipientId, category (`CONTRACT | DRAWING | SCOPE | SWMS | INDUCTION | PROOF_OF_COMPLETION | OTHER`), fileId, status (`PENDING_REVIEW | APPROVED | REJECTED`), reviewNote
- **EscrowTransaction**: id, jobId, amount, platformFee, workerPayout, status (see state machine), providerRef, timestamps for each transition
- **EscrowEvent**: id, escrowId, fromStatus, toStatus, actorId, note, createdAt (append-only audit log)
- **Dispute**: id, jobId, raisedBy, reason, status (`OPEN | RESOLVED_RELEASE | RESOLVED_REFUND`), resolutionNote
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
- Every uploaded document starts as `PENDING_REVIEW` and is invisible to the recipient until an admin approves it.
- The uploader can always see their own documents and their status.
- Rejected documents show the admin's note to the uploader only.

### File uploads
- Allowed types: PDF, JPG, PNG. Max 10 MB. Check the MIME type from file contents, not just the extension.
- Files are never served from a public folder. `GET /api/files/[id]` checks that the requester is the owner, an admin, or the recipient of an approved document.

## Escrow State Machine

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
2. **Admin verification:** admin opens the queue → views the file next to the entered details → approves or rejects with a reason → worker is notified → profile goes `LIVE` when requirements are met.
3. **Hiring:** company posts a job → eligible live workers see it and submit quotes → company accepts one → escrow created → company funds it (mock).
4. **Documents:** company uploads a scope document → admin approves → worker sees it.
5. **Completion and payment:** worker starts the job → uploads proof → admin approves proof → company approves → funds released → both sides see the escrow timeline.
6. **Dispute:** either side raises a dispute → escrow frozen → admin resolves with release or refund and a note.

## Seed Data

`prisma/seed.ts` should create:
- 1 admin: `admin@demo.test`
- 2 companies: `builder@demo.test`, `facilities@demo.test`
- 5 workers across plumbing, electrical, carpentry and labouring, in NSW, VIC and QLD, covering these cases: fully verified and live; pending review; one expired insurance (hidden); one rejected licence; an electrician licensed in NSW only (to demonstrate the state rule)
- 4 jobs in different statuses, including one with escrow in `PROOF_SUBMITTED` and one `DISPUTED`
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

One Playwright test covering flow 5 (completion and payment) end to end with seed data.

## Build Order

Work in this order and keep the app runnable after each step:
1. Project setup, Prisma schema, seed, auth with roles and role-based layouts
2. Worker onboarding wizard and file uploads
3. Admin credential verification queue and profile status logic
4. Company job posting, worker job feed with eligibility, quotes, hiring
5. Escrow state machine, mock provider, company/worker escrow views
6. Document sharing with admin review
7. Disputes and admin escrow overview
8. Notifications, expiry and auto-release scripts, polish and tests

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
