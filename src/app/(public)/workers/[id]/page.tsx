import { getSessionUser } from "@/lib/auth";
import { WorkerProfileDetail } from "@/components/worker-profile-detail";
import { PublicContactSlot } from "./public-contact-slot";

export default async function PublicWorkerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <WorkerProfileDetail
        workerId={id}
        showContactInfo={false}
        contactSlot={<PublicContactSlot workerId={id} isCompany={user?.role === "COMPANY"} />}
      />
    </div>
  );
}
