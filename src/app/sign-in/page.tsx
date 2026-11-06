import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Globe2 } from "lucide-react";
import { authConfigured, currentUser } from "@/lib/auth";
import { Brand } from "@/components/brand";
import { SignInButton } from "@/components/sign-in-button";
import { EmailAuthForm } from "@/components/email-auth-form";
import { OAuthNotice } from "@/components/oauth-notice";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  if (await currentUser()) redirect("/studio");
  const { error } = await searchParams;
  return (
    <main className="auth-page">
      <header>
        <Brand />
        <Link href="/">
          <ArrowLeft size={14} /> Back home
        </Link>
      </header>
      <section className="auth-content">
        <div className="auth-orbit">
          <Globe2 size={38} strokeWidth={0.9} />
        </div>
        <span className="eyebrow">A LITTLE WORLD OF YOUR OWN</span>
        <h1>
          Your next chapter
          <br />
          starts here.
        </h1>
        <p>
          Sign in to create your personal globe.
          <br />
          Your memories start private.
        </p>
        <OAuthNotice error={error} />
        <SignInButton enabled={authConfigured()} />
        <span className="muted text-xs">or use your email</span>
        <EmailAuthForm mode="sign-in" enabled={authConfigured()} />
        <p className="text-sm">
          New here? <Link href="/sign-up">Create an account</Link>
        </p>
        <Link href="/demo" className="auth-example">
          Just looking? Explore an example →
        </Link>
      </section>
      <footer>One globe. The places that made you.</footer>
    </main>
  );
}
