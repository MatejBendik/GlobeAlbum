import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Globe2 } from "lucide-react";
import { authConfigured, currentUser } from "@/lib/auth";
import { Brand } from "@/components/brand";
import { SignInButton } from "@/components/sign-in-button";

export default async function SignInPage() {
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
        <SignInButton enabled={authConfigured()} />
        <Link href="/demo" className="auth-example">
          Just looking? Explore an example →
        </Link>
      </section>
      <footer>One globe. The places that made you.</footer>
    </main>
  );
}
