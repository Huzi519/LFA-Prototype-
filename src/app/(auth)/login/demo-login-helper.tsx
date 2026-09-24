"use client";

import { useTransition } from "react";
import { login } from "./actions";
import { Button } from "@/components/ui/button";

// Development-only quick login for the seeded demo accounts (CLAUDE.md
// "Seed Data": all demo passwords are Password123!). Just one account per
// role — the other ~20 worker profiles in the directory are dummy data for
// browsing, not meant to be logged into (see DECISIONS.md).
const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@demo.test" },
  { label: "Company — Builder Co", email: "builder@demo.test" },
  { label: "Worker — Jack Thompson", email: "worker.live@demo.test" },
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
