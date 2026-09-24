import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { RoleNav } from "@/components/role-nav";

export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "COMPANY") redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <RoleNav
        title="Company"
        email={user.email}
        userId={user.id}
        links={[
          { href: "/company/dashboard", label: "Dashboard" },
          { href: "/company/workers", label: "Search workers" },
          { href: "/company/messages", label: "Messages" },
          { href: "/company/jobs", label: "My jobs" },
        ]}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
