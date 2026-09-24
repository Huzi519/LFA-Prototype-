"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthShell } from "@/components/lfa/auth-shell";
import { DemoLoginHelper } from "./demo-login-helper";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <AuthShell statement="Back on the tools.">
      <h2 className="display-lg text-3xl">Log in</h2>
      <p className="text-muted-foreground mt-2 text-sm">
        Workers, companies and admins all sign in here.
      </p>

      <form action={formAction} className="mt-8 space-y-5">
        {state?.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required className="h-10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required className="h-10" />
        </div>
        <Button type="submit" size="lg" className="h-10 w-full" disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <p className="text-muted-foreground mt-6 text-sm">
        New here?{" "}
        <Link href="/register" className="text-foreground font-medium underline underline-offset-4">
          Create an account
        </Link>
      </p>

      <DemoLoginHelper />
    </AuthShell>
  );
}
