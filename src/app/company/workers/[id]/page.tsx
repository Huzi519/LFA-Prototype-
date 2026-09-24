import { requireRole } from "@/lib/auth";
import { Role } from "@/generated/prisma";
import { WorkerProfileDetail } from "@/components/worker-profile-detail";
import { MessageButton } from "./message-button";

export default async function CompanyWorkerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(Role.COMPANY);
  const { id } = await params;

  return (
    <div className="mx-auto max-w-2xl">
      <WorkerProfileDetail
        workerId={id}
        showContactInfo
        contactSlot={<MessageButton workerId={id} />}
      />
    </div>
  );
}
