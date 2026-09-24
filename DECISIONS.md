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

## Pivot: direct search-and-hire + chat, plus a public site (2026-09-24)

The user asked for a fundamental change to the hiring model: instead of a
job board (company posts a job, workers browse and quote), companies now
**search and browse** worker profiles, **message a specific worker
directly**, negotiate through in-platform chat (including a structured
**proposal** and document exchange), and take an explicit **"Mark as
hired"** action. A **public site** (no login) was also added so visitors
can browse the worker directory and view full profiles.

Confirmed with the user before implementing:
- The old job-posting/quote flow is **removed entirely**, not kept as a
  second option — `Quote` model, `/company/jobs/new`, the open-jobs feed at
  `/worker/jobs`, and the accept-quote action are all gone.
- Public profiles show everything except phone/email.
- Chat is implemented as **~3s client-side polling** against a small
  `GET /api/conversations/[id]/messages` route, not websockets/SSE — the
  "real-time" feel the user asked for, without adding a new architectural
  dependency to a codebase that otherwise relies entirely on Server Actions
  and page-level revalidation.
- Hiring happens via an explicit "Mark as hired" dialog, not automatically
  when a proposal is sent.

Design decisions made while implementing:
- **Documents attach to `Conversation`, not `Job`.** The client's described
  sequence is chat → proposal → document exchange → hire, meaning
  documents need to flow before a Job exists. Rather than adding a second,
  unreviewed attachment channel for "chat documents" (which would undercut
  the platform's core differentiator — every document passes admin review),
  `Document.jobId` became `Document.conversationId`. A `Conversation`
  exists from first contact onward, so the same admin-reviewed flow
  (`src/lib/actions/documents.ts`, `ConversationDocuments`,
  `/admin/documents`) now applies throughout the whole relationship, not
  just post-hire. This also simplified the code: the old
  `job.hiredWorkerId &&` gate is gone entirely.
- **One `Conversation` per company/worker pair** (`@@unique([companyId,
  workerId])`), reused across contact → negotiation → hire. `Job` is now a
  status record with a required `workerId` (it never exists without one)
  and an optional back-link from its `Conversation`.
- **`canWorkerTakeJob` is now a hard block inside `markAsHired`**,
  preserving the eligibility rule that used to gate quoting — a company
  cannot hire a worker for a trade/state licence combination they're not
  approved for, and the reason is shown in the UI.
- **`src/proxy.ts` bug fixed during planning**: the role-prefix guard used
  `pathname.startsWith(r.prefix)`, which would have caught the new public
  `/workers` directory under the `/worker` prefix check and redirected
  anonymous visitors to `/login`. Changed to a path-segment-bound check
  (`pathname === prefix || pathname.startsWith(prefix + "/")`).
- **Bug found and fixed via live testing, not by inspection**: the "Mark as
  hired" dialog originally read its prefill values from a prop computed by
  the server-rendered page at initial load. Since the chat updates live via
  polling but the page itself never reloads, that prop went stale the
  moment a second proposal was sent in the same session — the dialog would
  silently prefill from an old proposal. Fixed by moving the proposal/hire
  controls into `ChatThread` itself, so they read the *live* polled
  `messages` state instead of a static server prop (Server → Client props
  can't carry functions, so this was the only way to keep the hire dialog
  in sync with the chat).
- **`JobStatus`** dropped `OPEN` (no more public job postings) and
  `PROOF_SUBMITTED` (was escrow-proof specific, already unreachable before
  this pivot); default status is now `HIRED`.

Verified live (not just typechecked) with a full multi-context browser
run: anonymous visitor browses the public directory and a profile with
contact info correctly hidden; `/worker/dashboard` still redirects to
login (confirms the proxy fix didn't loosen real protection); a company
searches, opens a profile, messages, sends a proposal; the worker replies
and the company sees it appear via polling with no page reload; the
company marks the worker as hired with the *live* latest proposal (not a
stale one); a document is exchanged and goes through admin review; the
resulting job appears on both dashboards.

## Simplified demo data + landing page redesign (2026-09-24, later same day)

The user asked to simplify the demo: one landing page redesigned as a
simple set of info boxes, at least 20 dummy worker profiles for the
directory (no dashboards needed for them), only **one** worker account
meant to be a working dashboard, one company (not two), and that company
having exactly 2 jobs `IN_PROGRESS` and 1 `DISPUTED` with that one worker —
the same 3 jobs visible on both the company's and the worker's dashboards.

- **Dropped the 4 credential-edge-case worker accounts** (pending review,
  expired/hidden, rejected licence, NSW-only electrician) and the second
  company (`facilities@demo.test`) from seed data, per "only one dashboard
  for the labour" and "one company profile." The business rules they used
  to demonstrate (expiry, rejection, state-based licensing) are still
  fully unit-tested in `src/lib/rules/credentials.test.ts` — only the seed
  demonstration of them was removed, not the rules themselves. Easy to add
  a couple back later if the client wants to demo those cases again.
- **Added 20 plain `LIVE` dummy worker profiles** across all four trades
  and all eight states/territories, for directory search realism. No
  credentials, no distinguishing edge cases, no featured demo-login button
  — they exist purely to populate the browsable directory.
- **Schema change: `Conversation` is no longer unique per company/worker
  pair.** The requested scenario — one company, one worker, three separate
  jobs between them — is impossible under the old `@@unique([companyId,
  workerId])` constraint, which assumed a company only ever has one
  relationship (and therefore at most one hire) with a given worker.
  Relaxed to an index instead of a unique constraint; `getOrCreateConversation`
  now reuses the pair's still-open thread (`jobId` null) if one exists,
  otherwise starts a fresh conversation — so re-hiring the same worker
  later opens a new negotiation rather than reopening an already-hired one.
  New migration: `20260924132810_repeat_conversations`.
- **Landing page** rewritten as a simple hero plus four static info boxes
  (search & discover, message directly, admin-reviewed documents, hire
  with confidence) — deliberately plain per "very simple, just boxes and
  simple information," no new dependencies or design system.
- **Bug found and fixed via live testing**: both dialog triggers (`Send a
  proposal`, `Mark as hired`) were passing `nativeButton={false}` to the
  `Button` they used as `DialogTrigger`'s `render` target. That prop is
  only correct when `Button` itself wraps a further non-button element
  (like the `<Link>` cases elsewhere in the codebase) — here `Button` was
  the final rendered element, so it needs to stay a real `<button>`
  (`nativeButton`'s default). The wrong value produced a Base UI console
  error on every render of those dialogs, though the dialogs still
  functioned. Fixed both call sites.

Verified live: reseeded database confirmed with a real browser run — the
public directory shows all 21 live workers (20 dummy + Jack Thompson); the
company's and worker's job lists both show exactly 2 `IN_PROGRESS` + 1
`DISPUTED`, matching the DB directly. Full check suite green
(typecheck/lint/42 unit tests) and the Playwright e2e test passes against
the new seed shape (relabelled demo-login buttons, and a document-count
assertion that assumed old seed content was corrected to match the new,
simpler data).
