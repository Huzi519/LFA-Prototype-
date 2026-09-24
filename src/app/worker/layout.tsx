import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { RoleNav } from "@/components/role-nav";

export default async function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "WORKER") redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <RoleNav
        title="Worker"
        email={user.email}
        userId={user.id}
        links={[
          { href: "/worker/dashboard", label: "Dashboard" },
          { href: "/worker/onboarding", label: "Profile & credentials" },
          { href: "/worker/messages", label: "Messages" },
          { href: "/worker/jobs", label: "My jobs" },
          { href: "/worker/documents", label: "Documents" },
        ]}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
