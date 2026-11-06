import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { AccountMenu } from "@/components/account-menu";
import { Brand } from "@/components/brand";
import { ProfileSettings } from "@/components/profile-settings";
import { ThemeToggle } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Profile settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const globe = await getDb().globe.findUnique({
    where: { userId: user.id },
    select: { displayName: true, username: true, published: true },
  });
  if (!globe) redirect("/onboarding");

  return (
    <div className="settings-page">
      <header className="workspace-header">
        <Brand />
        <nav className="workspace-nav" aria-label="Account navigation">
          <Button asChild variant="ghost" className="settings-back">
            <Link href="/studio" aria-label="Back to my globe">
              <ArrowLeft />
              <span>My globe</span>
            </Link>
          </Button>
          <ThemeToggle />
          <AccountMenu
            viewer={{
              displayName: globe.displayName,
              profileHref: globe.published ? `/u/${globe.username}` : null,
            }}
          />
        </nav>
      </header>
      <main className="settings-content">
        <div className="settings-heading">
          <p className="settings-eyebrow">Your account</p>
          <h1>Profile settings</h1>
          <p>Manage your profile and account in one place.</p>
        </div>
        <ProfileSettings
          displayName={globe.displayName}
          username={globe.username}
          email={user.email}
          published={globe.published}
          profileUrl={`${process.env.APP_ORIGIN?.replace(/\/$/, "") ?? ""}/u/${globe.username}`}
        />
      </main>
    </div>
  );
}
