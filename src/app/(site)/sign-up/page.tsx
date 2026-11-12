import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AuthLegalNotice } from "@/components/auth-legal-notice";
import { EmailAuthForm } from "@/components/email-auth-form";
import { SignInButton } from "@/components/sign-in-button";
import { authConfigured, currentIdentity } from "@/lib/auth";
import { OAuthNotice } from "@/components/oauth-notice";
import { Button } from "@/components/ui/button";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const { user, deleted } = await currentIdentity();
  if (user) redirect("/studio");
  const { error } = await searchParams;
  return (
    <main className="auth-page">
      <PageHeader>
        <Button asChild variant="ghost">
          <Link href="/">
            <ArrowLeft /> Back home
          </Link>
        </Button>
      </PageHeader>
      <section className="auth-content">
        <span className="eyebrow">YOUR MEMORIES, YOUR WORLD</span>
        <h1>Create your account.</h1>
        <p>
          Your globe starts private. Choose its public name after signing up.
        </p>
        <OAuthNotice error={deleted ? "account_deleted" : error} />
        <AuthLegalNotice />
        <SignInButton
          enabled={authConfigured()}
          restartDeletedAccount={deleted}
        />
        <span className="muted text-xs">or use your email</span>
        <EmailAuthForm mode="sign-up" enabled={authConfigured()} />
        <p className="text-sm">
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
