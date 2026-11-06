import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/brand";
import { EmailAuthForm } from "@/components/email-auth-form";
import { SignInButton } from "@/components/sign-in-button";
import { authConfigured, currentUser } from "@/lib/auth";

export default async function SignUpPage() {
  if (await currentUser()) redirect("/studio");
  return (
    <main className="auth-page">
      <header>
        <Brand />
        <Link href="/">
          <ArrowLeft size={14} /> Back home
        </Link>
      </header>
      <section className="auth-content">
        <span className="eyebrow">YOUR MEMORIES, YOUR WORLD</span>
        <h1>Create your account.</h1>
        <p>
          Your globe starts private. Choose its public name after signing up.
        </p>
        <SignInButton enabled={authConfigured()} />
        <span className="muted text-xs">or use your email</span>
        <EmailAuthForm mode="sign-up" enabled={authConfigured()} />
        <p className="text-sm">
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </p>
      </section>
      <footer>One globe. The places that made you.</footer>
    </main>
  );
}
