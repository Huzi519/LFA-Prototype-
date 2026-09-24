import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ShieldCheck, MapPin, Clock, Phone, Mail, Lock } from "lucide-react";
import { formatCents } from "@/lib/format";
import { TradeChip, STATE_NAMES } from "@/components/lfa/trade-chip";

/**
 * Full worker profile rendering, shared by the public profile page
 * (/workers/[id]) and the logged-in company one (/company/workers/[id]).
 * `showContactInfo` gates phone/email — everything else on the profile is
 * shown either way (the user's chosen level of public visibility).
 */
export async function WorkerProfileDetail({
  workerId,
  showContactInfo,
  contactSlot,
}: {
  workerId: string;
  showContactInfo: boolean;
  /** Rendered in the header, e.g. a "Message this worker" button. */
  contactSlot?: React.ReactNode;
}) {
  const worker = await db.workerProfile.findUnique({
    where: { id: workerId },
    include: {
      credentials: { where: { status: "APPROVED" } },
      user: { select: { email: true } },
    },
  });

  if (!worker || worker.profileStatus !== "LIVE") notFound();

  const otherTrades: string[] = JSON.parse(worker.otherTrades || "[]");
  const initials = worker.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {/* Main */}
      <div className="space-y-6">
        <header className="rounded-lg bg-card ring-1 ring-foreground/10">
          <div className="tape rounded-t-lg" />
          <div className="flex flex-wrap items-start gap-4 p-6">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-bluestone font-heading text-xl font-bold text-primary-foreground">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="display-lg text-3xl sm:text-4xl">{worker.fullName}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <TradeChip trade={worker.primaryTrade} />
                {otherTrades.map((t) => (
                  <TradeChip key={t} trade={t} />
                ))}
                <span className="text-verified ml-1 inline-flex items-center gap-1 text-xs font-semibold">
                  <ShieldCheck className="size-4" aria-hidden />
                  {worker.credentials.length > 0 ? "Licence verified" : "Profile approved"}
                </span>
              </div>
            </div>
            {contactSlot && <div className="w-full sm:w-auto">{contactSlot}</div>}
          </div>
          <p className="whitespace-pre-wrap border-t px-6 py-5 text-[15px] leading-relaxed">
            {worker.bio}
          </p>
        </header>

        <section className="rounded-lg bg-card p-6 ring-1 ring-foreground/10">
          <h2 className="display-md text-xl">Verified credentials</h2>
          {worker.credentials.length === 0 ? (
            <p className="text-muted-foreground mt-2 text-sm">No credentials listed publicly.</p>
          ) : (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {worker.credentials.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm"
                >
                  <ShieldCheck className="text-verified size-4 shrink-0" aria-hidden />
                  <span className="font-medium">
                    {c.type.charAt(0) + c.type.slice(1).toLowerCase().replace(/_/g, " ")}
                  </span>
                  {c.issuingState && (
                    <span className="text-muted-foreground ml-auto text-xs">{c.issuingState}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Facts rail */}
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-lg bg-bluestone p-5 text-primary-foreground">
          <p className="text-sm text-white/70">Hourly rate</p>
          <p className="font-heading mt-1 text-4xl font-extrabold tracking-tight">
            {formatCents(worker.hourlyRate).replace(".00", "")}
            <span className="text-base font-medium text-white/60">/hr</span>
          </p>
        </div>
        <dl className="divide-y rounded-lg bg-card ring-1 ring-foreground/10">
          <div className="flex items-start gap-3 p-4">
            <Clock className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <dt className="text-muted-foreground text-xs">Experience</dt>
              <dd className="font-medium">{worker.yearsExperience} years</dd>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4">
            <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <dt className="text-muted-foreground text-xs">Service area</dt>
              <dd className="font-medium">
                {STATE_NAMES[worker.homeState] ?? worker.homeState} {worker.postcode}
              </dd>
              <dd className="text-muted-foreground text-sm">
                Travels up to {worker.serviceRadiusKm} km
              </dd>
            </div>
          </div>
          {showContactInfo ? (
            <>
              <div className="flex items-start gap-3 p-4">
                <Phone className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
                <div>
                  <dt className="text-muted-foreground text-xs">Phone</dt>
                  <dd className="font-medium">{worker.phone}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4">
                <Mail className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <dt className="text-muted-foreground text-xs">Email</dt>
                  <dd className="truncate font-medium">{worker.user.email}</dd>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-start gap-3 p-4">
              <Lock className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
              <div>
                <dt className="text-muted-foreground text-xs">Contact details</dt>
                <dd className="text-sm">Shown to logged-in companies only.</dd>
              </div>
            </div>
          )}
        </dl>
      </aside>
    </div>
  );
}
