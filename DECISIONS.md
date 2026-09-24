# Decisions

Assumptions made while building the prototype, per CLAUDE.md: "When a
requirement is unclear, choose the simplest reasonable option, note it here,
and continue."

## Build step 1 (project setup, schema, seed, auth)

- **Prisma version:** using Prisma **6.x**, not 7. Prisma 7 changed the
  default SQLite setup to require a native driver adapter
  (`@prisma/adapter-better-sqlite3`), and `better-sqlite3` needs a native
  build (node-gyp + Python) that isn't available on this machine. Prisma 6's
  classic bundled query engine needs no native compilation and behaves the
  way CLAUDE.md's "SQLite via Prisma" description assumes. Revisit if the
  target deploy environment can build native modules.
- **Company registration has no wizard.** CLAUDE.md only specifies a
  multi-step wizard for *worker* onboarding. Companies register with a
  single form (org details + login) since there's no equivalent multi-step
  flow described for them.
- **Auth.js config is split** into `src/auth.config.ts` (edge-safe, no
  providers) and `src/auth.ts` (full config with the Credentials provider).
  Route protection now lives in `src/proxy.ts` (Next.js 16 renamed the
  `middleware.ts` convention to `proxy.ts`), which needs the edge-safe
  config since Prisma/bcrypt aren't Edge-runtime compatible.
- **Dropped the `server-only` import guard** from `lib/auth.ts`,
  `lib/storage.ts` and `lib/notifications.ts`. It throws unconditionally
  outside Next's bundler (including under `tsx` for the seed script), and
  CLAUDE.md doesn't require it — Server Actions/Route Handlers already keep
  these files off the client bundle in practice.
- **Demo login helper** shows one button per seeded account (not just a
  generic autofill) so each of the five worker edge cases in the seed data
  is one click away.

## Scope narrowed by the user (2026-09-23)

The user asked to **skip** the following CLAUDE.md build steps entirely for
this prototype:

- **Step 3 — Admin credential verification queue.** Credentials stay in
  whatever status the seed data (or a future simplified path) gives them;
  there's no admin UI to approve/reject them or move a profile to `LIVE`.
- **Step 5 — Escrow & payments.** No funding UI, no `transition()` wiring
  into Server Actions, no mock "Pay now" flow. The `EscrowTransaction` /
  `EscrowEvent` schema and the `src/lib/rules/escrow.ts` state machine stay
  in the codebase (and unit-tested) as reference/demo logic, but nothing in
  the app calls them.
- **Step 7 — Disputes & admin escrow overview.** No raise-dispute UI, no
  admin resolution screen.

Practical effect on the remaining steps:

- **Step 4 (jobs/quotes/hiring):** accepting a quote sets the job to
  `HIRED`/`IN_PROGRESS` directly — it does **not** create an
  `AWAITING_FUNDING` escrow, since there's no escrow flow left to drive it.
- **Step 8 (notifications/scripts/polish):** the `auto-release` script is
  dropped (nothing to auto-release). `check-expiry` still makes sense since
  credential expiry isn't part of the dropped scope. The Playwright e2e
  test originally scoped to flow 5 (completion & payment) is replaced with
  a happy-path test that fits the trimmed flow instead.

This is a scope decision the user made directly, not an assumption — noted
here per CLAUDE.md's instruction to log decisions, not because it was
unclear.

## Build step 8 (notifications, scripts, polish, tests)

- **No in-app path to `LIVE` remains a known gap.** Since step 3 is
  skipped, nothing in the running app ever approves a credential or flips a
  profile to `LIVE` — that only happens via seed data (or direct DB access).
  Flagged again here since it's the one place the scope cut visibly limits
  the demo: a freshly registered worker can complete onboarding and reach
  `PENDING_REVIEW`, but can never see or quote on jobs afterwards without
  manual intervention.
- **`check-expiry`** (`npm run check-expiry` / `scripts/check-expiry.ts`)
  flips overdue credentials to `EXPIRED`, sends a dedup'd warning inside the
  configurable window (`CREDENTIAL_EXPIRY_WARNING_DAYS`, default 30), and
  hides any `LIVE` profile that no longer meets its trade's required-credential
  set as a result — verified against the seeded data, including a live
  end-to-end run that expired a required credential and confirmed the
  profile flipped to `HIDDEN` with a notification sent.
- **The Playwright e2e test** (`e2e/happy-path.spec.ts`) covers hiring +
  document review end-to-end — post a job → eligible live worker quotes →
  company hires → company shares a document → invisible to the worker until
  admin approves it → worker sees it once approved → worker was notified
  they were hired. `e2e/global-setup.ts` wipes and reseeds the database via
  Prisma (not by deleting the SQLite file, which can be locked by an
  already-running dev server) so the test is deterministic.
- **Notification bell** lives in `RoleNav` (now an async server component)
  across all three role layouts, with mark-one-read and mark-all-read
  Server Actions in `src/lib/actions/notifications.ts`.
