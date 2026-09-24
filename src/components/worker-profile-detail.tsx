import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatCents } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  /** Rendered below the header — e.g. a "Message this worker" button. */
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-2xl">{worker.fullName}</CardTitle>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge>{worker.primaryTrade}</Badge>
              {otherTrades.map((t) => (
                <Badge key={t} variant="outline">
                  {t}
                </Badge>
              ))}
              <Badge variant="outline">{worker.homeState}</Badge>
            </div>
          </div>
          {contactSlot}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap text-sm">{worker.bio}</p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Experience</dt>
              <dd>{worker.yearsExperience} years</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Rate</dt>
              <dd>{formatCents(worker.hourlyRate)}/hr</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Service area</dt>
              <dd>
                {worker.postcode} · within {worker.serviceRadiusKm}km
              </dd>
            </div>
            {showContactInfo && (
              <>
                <div>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd>{worker.phone}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd>{worker.user.email}</dd>
                </div>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verified credentials</CardTitle>
        </CardHeader>
        <CardContent>
          {worker.credentials.length === 0 ? (
            <p className="text-muted-foreground text-sm">None on file yet.</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {worker.credentials.map((c) => (
                <li key={c.id}>
                  <Badge variant="outline">{c.type.replace(/_/g, " ")}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {!showContactInfo && (
        <p className="text-muted-foreground text-center text-xs">
          Phone and email are shown to logged-in companies only.
        </p>
      )}
    </div>
  );
}
