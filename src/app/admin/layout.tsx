import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { RoleNav } from "@/components/role-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  return (
    <div className="min-h-screen">
      <RoleNav
        title="Admin"
        email={user.email}
        userId={user.id}
        links={[
          { href: "/admin/dashboard", label: "Dashboard" },
          { href: "/admin/documents", label: "Documents" },
        ]}
      />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
