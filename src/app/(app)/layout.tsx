import { requireWorkspace, getEntitlements } from "@/lib/business";
import { AppNav } from "@/components/app/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const workspace = await requireWorkspace();
  const entitlements = await getEntitlements(workspace.business.id);

  return (
    <div className="min-h-screen md:flex">
      <AppNav
        businessName={workspace.business.name}
        slug={workspace.business.slug}
        email={workspace.email}
        role={workspace.role}
        planName={entitlements?.plan.name ?? "Free"}
      />
      <main className="min-w-0 flex-1 pb-24 md:pb-0">{children}</main>
    </div>
  );
}
