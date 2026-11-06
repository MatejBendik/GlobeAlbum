import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Brand } from "@/components/brand";
import { OnboardingForm } from "@/components/onboarding-form";

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (await getDb().globe.findUnique({ where: { userId: user.id } }))
    redirect("/studio");
  return (
    <main className="auth-page">
      <header>
        <Brand />
        <span className="muted text-sm">YOUR FIRST STEP</span>
      </header>
      <section className="onboarding-content">
        <span className="eyebrow">MAKE YOURSELF AT HOME</span>
        <h1>
          A name for
          <br />
          your corner of the world.
        </h1>
        <p>Choose your name. We will create your globe link.</p>
        <OnboardingForm baseUrl={process.env.APP_ORIGIN || ""} />
      </section>
    </main>
  );
}
