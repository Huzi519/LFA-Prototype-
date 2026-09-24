"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerWorker, registerCompany } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

export default function RegisterPage() {
  const [workerState, workerAction, workerPending] = useActionState(
    registerWorker,
    undefined
  );
  const [companyState, companyAction, companyPending] = useActionState(
    registerCompany,
    undefined
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Create your LFA account</CardTitle>
          <CardDescription>
            Tradespeople and companies register separately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="worker">
            <TabsList className="w-full">
              <TabsTrigger value="worker" className="flex-1">
                Tradesperson
              </TabsTrigger>
              <TabsTrigger value="company" className="flex-1">
                Company
              </TabsTrigger>
            </TabsList>

            <TabsContent value="worker" className="mt-4">
              <form action={workerAction} className="space-y-4">
                {workerState?.error && (
                  <Alert variant="destructive">
                    <AlertDescription>{workerState.error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" name="fullName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="worker-email">Email</Label>
                  <Input id="worker-email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="worker-password">Password</Label>
                  <Input
                    id="worker-password"
                    name="password"
                    type="password"
                    minLength={8}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={workerPending}>
                  {workerPending ? "Creating account…" : "Continue to onboarding"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="company" className="mt-4">
              <form action={companyAction} className="space-y-4">
                {companyState?.error && (
                  <Alert variant="destructive">
                    <AlertDescription>{companyState.error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="companyName">Organisation name</Label>
                  <Input id="companyName" name="companyName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="abn">ABN</Label>
                  <Input id="abn" name="abn" placeholder="11 digits" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact name</Label>
                  <Input id="contactName" name="contactName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <select
                      id="state"
                      name="state"
                      required
                      className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
                    >
                      {STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input id="postcode" name="postcode" maxLength={4} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-email">Email</Label>
                  <Input id="company-email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-password">Password</Label>
                  <Input
                    id="company-password"
                    name="password"
                    type="password"
                    minLength={8}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={companyPending}>
                  {companyPending ? "Creating account…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-muted-foreground mt-6 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
