import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/business";
import { OnboardingFlow } from "./onboarding-flow";
import { Wordmark } from "@/components/marketing/chrome";

export const metadata = { title: "Set up your queue" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  // Already set up — no reason to see this again.
  const workspace = await getWorkspace();
  if (workspace) redirect("/dashboard");

  // The business name is its own thing — never prefilled with the owner's name.
  const defaultName = "";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-6 py-6">
        <Wordmark />
      </header>
      <main className="flex flex-1 items-start justify-center px-6 pb-24 pt-10">
        <OnboardingFlow defaultName={defaultName} />
      </main>
    </div>
  );
}
