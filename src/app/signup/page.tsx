import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Create an account" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Start for free"
      subtitle="Your queue can be live in about two minutes. No credit card."
    >
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
