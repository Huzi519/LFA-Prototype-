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
    <div className="min-h-screen">
      <RoleNav
        title="Company"
        email={user.email}
        userId={user.id}
        links={[
          { href: "/company/dashboard", label: "Dashboard" },
          { href: "/company/jobs", label: "My jobs" },
          { href: "/company/jobs/new", label: "Post a job" },
        ]}
      />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
