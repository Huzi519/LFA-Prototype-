"use client";

import { useTransition } from "react";
import { login } from "./actions";

// One-click sign-in for the seeded demo accounts (CLAUDE.md "Seed Data":
// all demo passwords are Password123!). Shown on every environment because
// this whole app is a demo; the other ~20 worker profiles in the directory
// are dummy data for browsing, not meant to be logged into.
const DEMO_ACCOUNTS = [
  { role: "Admin", who: "Reviews documents", email: "admin@demo.test" },
  { role: "Company", who: "Builder Co", email: "builder@demo.test" },
  { role: "Tradie", who: "Jack Thompson, plumber", email: "worker.live@demo.test" },
];

export function DemoLoginHelper() {
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-10 rounded-lg border border-dashed p-4">
      <p className="text-sm font-semibold">Try a demo account</p>
      <p className="text-muted-foreground mt-0.5 text-xs">
        Password for all of them is Password123!
      </p>
      <div className="mt-3 grid gap-2">
        {DEMO_ACCOUNTS.map((account) => (
          <button
            key={account.email}
            type="button"
            disabled={pending}
            className="flex items-center justify-between rounded-md bg-card px-3 py-2 text-left text-sm ring-1 ring-foreground/10 transition-colors hover:ring-hivis disabled:opacity-50 focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
            onClick={() => {
              const formData = new FormData();
              formData.set("email", account.email);
              formData.set("password", "Password123!");
              startTransition(() => {
                login(undefined, formData);
              });
            }}
          >
            <span>
              <span className="font-semibold">{account.role}</span>
              <span className="text-muted-foreground"> {account.who}</span>
            </span>
            <span className="text-hivis text-xs font-semibold">Log in</span>
          </button>
        ))}
      </div>
    </div>
  );
}
