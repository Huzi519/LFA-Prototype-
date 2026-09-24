import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function WorkerDashboardPage() {
  const user = await requireRole(Role.WORKER);
  const profile = await db.workerProfile.findUnique({
    where: { userId: user.id },
    include: { credentials: true },
  });

  const needsOnboarding =
    !profile ||
    profile.profileStatus === "DRAFT" ||
    profile.credentials.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome back{profile?.fullName ? `, ${profile.fullName}` : ""}
        </h1>
        <p className="text-muted-foreground">
          Your profile, credentials and jobs live here.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Badge variant="outline">{profile?.profileStatus ?? "DRAFT"}</Badge>

          {needsOnboarding ? (
            <div>
              <p className="text-muted-foreground text-sm">
                Finish onboarding to submit your profile for review.
              </p>
              <Button
                className="mt-3"
                nativeButton={false}
                render={<Link href="/worker/onboarding" />}
              >
                Continue onboarding
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              You have {profile?.credentials.length} credential
              {profile?.credentials.length === 1 ? "" : "s"} on file.{" "}
              <Link href="/worker/onboarding" className="underline underline-offset-4">
                Manage credentials
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
