"use client";

import { useTransition } from "react";
import { login } from "./actions";
import { Button } from "@/components/ui/button";

// Development-only quick login for the seeded demo accounts (CLAUDE.md
// "Seed Data": all demo passwords are Password123!).
const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@demo.test" },
  { label: "Company — Builder", email: "builder@demo.test" },
  { label: "Company — Facilities", email: "facilities@demo.test" },
  { label: "Worker — live", email: "worker.live@demo.test" },
  { label: "Worker — pending review", email: "worker.pending@demo.test" },
  { label: "Worker — hidden (expired)", email: "worker.hidden@demo.test" },
  { label: "Worker — rejected licence", email: "worker.rejected@demo.test" },
  { label: "Worker — NSW-only electrician", email: "worker.nsw@demo.test" },
];

export function DemoLoginHelper() {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-center text-xs font-medium uppercase tracking-wide">
        Demo login (development only)
      </p>
      <div className="grid grid-cols-1 gap-2">
        {DEMO_ACCOUNTS.map((account) => (
          <Button
            key={account.email}
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              const formData = new FormData();
              formData.set("email", account.email);
              formData.set("password", "Password123!");
              startTransition(() => {
                login(undefined, formData);
              });
            }}
          >
            {account.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
