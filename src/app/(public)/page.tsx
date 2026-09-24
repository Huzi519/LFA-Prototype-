import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { WorkerCard } from "@/components/lfa/worker-card";
import { TradeChip } from "@/components/lfa/trade-chip";

const TRADES = ["PLUMBER", "ELECTRICIAN", "CARPENTER", "LABOURER"] as const;
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

const STEPS = [
  {
    title: "Search the directory",
    body: "Browse licensed tradies by trade and state. No account needed to look.",
  },
  {
    title: "Message them directly",
    body: "Open a chat, describe the work and send a proposal with a budget.",
  },
  {
    title: "Share documents safely",
    body: "Contracts, drawings and SWMS pass an admin check before the other side sees them.",
  },
  {
    title: "Mark as hired",
    body: "Agree the details, mark the tradie as hired and track the job from there.",
  },
];

export default async function Home() {
  const [workerCount, deck, tradeCounts] = await Promise.all([
    db.workerProfile.count({ where: { profileStatus: "LIVE" } }),
    db.workerProfile.findMany({
      where: { profileStatus: "LIVE" },
      orderBy: { yearsExperience: "desc" },
      take: 3,
    }),
    db.workerProfile.groupBy({
      by: ["primaryTrade"],
      where: { profileStatus: "LIVE" },
      _count: { _all: true },
    }),
  ]);

  const countFor = (trade: string) =>
    tradeCounts.find((t) => t.primaryTrade === trade)?._count._all ?? 0;

  const rotations = ["-3deg", "2deg", "0deg"];

  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-14 pb-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-20">
          <div>
            <h1 className="display-xl text-[2.9rem] sm:text-6xl lg:text-7xl">
              Licensed tradies.
              <br />
              Hired direct.
            </h1>
            <p className="text-muted-foreground mt-6 max-w-lg text-lg leading-relaxed">
              Search {workerCount} verified plumbers, electricians, carpenters
              and labourers across Australia. Message the one you want and
              hire them without a middleman.
            </p>

            <form
              action="/workers"
              method="get"
              className="mt-8 flex max-w-xl flex-col gap-2 rounded-lg bg-card p-2 ring-1 ring-foreground/10 sm:flex-row"
            >
              <label className="sr-only" htmlFor="hero-trade">Trade</label>
              <select
                id="hero-trade"
                name="trade"
                defaultValue=""
                className="h-11 flex-1 rounded-md bg-transparent px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Any trade</option>
                {TRADES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
              <div className="hidden w-px self-stretch bg-border sm:block" />
              <label className="sr-only" htmlFor="hero-state">State</label>
              <select
                id="hero-state"
                name="state"
                defaultValue=""
                className="h-11 flex-1 rounded-md bg-transparent px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Anywhere in Australia</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="bg-hivis inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold text-white transition-colors hover:bg-[#e94f12] focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Search className="size-4" aria-hidden />
                Search tradies
              </button>
            </form>

            <ul className="mt-6 flex flex-wrap gap-2">
              {TRADES.map((t) => (
                <li key={t}>
                  <Link
                    href={`/workers?trade=${t}`}
                    className="inline-flex items-center gap-2 rounded-full bg-card py-1 pr-3 pl-1 text-sm ring-1 ring-foreground/10 transition-colors hover:ring-foreground/30"
                  >
                    <TradeChip trade={t} />
                    <span className="text-muted-foreground">{countFor(t)} available</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Card deck: real workers from the directory */}
          <div className="relative mx-auto h-[330px] w-full max-w-sm sm:h-[400px]" aria-hidden>
            {deck.map((w, i) => (
              <div
                key={w.id}
                className="deck-card absolute inset-x-0"
                style={
                  {
                    "--r": rotations[i],
                    "--d": `${i * 120}ms`,
                    top: `${i * 84}px`,
                    zIndex: i,
                  } as React.CSSProperties
                }
              >
                <div className="shadow-[0_24px_50px_-20px_rgba(21,34,56,0.45)]">
                  <WorkerCard worker={w} compact />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="tape" />
      </section>

      {/* How it works: a true four-step sequence */}
      <section className="bg-bluestone text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="display-lg text-3xl sm:text-4xl">
            From search to site in four steps
          </h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="border-t border-white/15 pt-4">
                <span className="text-hivis font-heading text-3xl font-extrabold tabular-nums">
                  {i + 1}
                </span>
                <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/70">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Two doors */}
      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-16 sm:grid-cols-2">
        <div className="flex flex-col rounded-lg bg-card p-7 ring-1 ring-foreground/10">
          <h2 className="display-md text-2xl">Hiring for a site?</h2>
          <p className="text-muted-foreground mt-2 flex-1">
            Register your company, search the directory and message a tradie
            today. Phone and email unlock once you are signed in.
          </p>
          <Button className="mt-6 w-fit" size="lg" nativeButton={false} render={<Link href="/register?tab=company" />}>
            Register a company
          </Button>
        </div>
        <div className="flex flex-col rounded-lg bg-card p-7 ring-1 ring-foreground/10">
          <h2 className="display-md text-2xl">On the tools?</h2>
          <p className="text-muted-foreground mt-2 flex-1">
            Build a profile, upload your licence and White Card, and let
            companies come to you. Your contact details stay private.
          </p>
          <Button className="mt-6 w-fit" size="lg" variant="outline" nativeButton={false} render={<Link href="/register?tab=worker" />}>
            Join as a tradie
          </Button>
        </div>
      </section>
    </div>
  );
}
