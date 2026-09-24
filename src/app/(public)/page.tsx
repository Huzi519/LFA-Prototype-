import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STEPS = [
  {
    title: "Search & discover",
    body: "Browse verified tradespeople by trade, state and experience — no login required.",
  },
  {
    title: "Message directly",
    body: "Contact a worker, chat, and send a proposal covering the work and the budget.",
  },
  {
    title: "Admin-reviewed documents",
    body: "Every document exchanged is reviewed by an admin before the other side can see it.",
  },
  {
    title: "Hire with confidence",
    body: "Mark a worker as hired once you agree on the details, and track the job from there.",
  },
];

export default async function Home() {
  const workerCount = await db.workerProfile.count({
    where: { profileStatus: "LIVE" },
  });

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-20 text-center">
      <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
        Prototype
      </p>
      <h1 className="mt-2 max-w-2xl text-4xl font-semibold tracking-tight">
        Labour Workforce Australia
      </h1>
      <p className="text-muted-foreground mt-4 max-w-xl text-lg">
        Search verified tradespeople, message them directly, and hire —
        every document exchanged along the way passes admin review before
        the other party can see it.
      </p>
      <div className="mt-8 flex gap-3">
        <Button size="lg" nativeButton={false} render={<Link href="/workers" />}>
          Browse {workerCount} tradespeople
        </Button>
        <Button
          size="lg"
          variant="outline"
          nativeButton={false}
          render={<Link href="/register" />}
        >
          Get started
        </Button>
      </div>

      <div className="mt-16 grid w-full max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-2">
        {STEPS.map((step) => (
          <Card key={step.title}>
            <CardHeader>
              <CardTitle className="text-base">{step.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{step.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
