import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to run your queue.">
      <AuthForm mode="signin" next={next} />
    </AuthShell>
  );
}
