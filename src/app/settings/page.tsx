import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { currentUser, getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ProfileSettings } from "@/components/profile-settings";
import { Button } from "@/components/ui/button";
import { OAuthNotice } from "@/components/oauth-notice";
import { toNavigationViewer } from "@/lib/navigation-viewer";
import { globeAvatarUrl } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Profile settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const [globe, accounts, { error }] = await Promise.all([
    getDb().globe.findUnique({
      where: { userId: user.id },
      select: {
        displayName: true,
        username: true,
        published: true,
        avatarKey: true,
      },
    }),
    getAuth()
      .listAccounts()
      .catch(() => null),
    searchParams,
  ]);
  if (!globe) redirect("/onboarding");
  const viewer = toNavigationViewer(user, {
    ...globe,
    avatarUrl: globeAvatarUrl(globe),
  });

  return (
    <div className="settings-page">
      <PageHeader viewer={viewer}>
        <Button asChild variant="ghost" className="compact-nav-action">
          <Link href="/studio" aria-label="Back to my globe">
            <ArrowLeft />
            <span>My globe</span>
          </Link>
        </Button>
      </PageHeader>
      <main className="settings-content">
        <div className="settings-heading">
          <p className="settings-eyebrow">Your account</p>
          <h1>Profile settings</h1>
          <p>Manage your profile and account in one place.</p>
        </div>
        <OAuthNotice error={error} linking />
        <ProfileSettings
          displayName={globe.displayName}
          avatarUrl={viewer.avatarUrl}
          hasGooglePhoto={!!user.avatarUrl}
          hasCustomAvatar={!!globe.avatarKey}
          username={globe.username}
          email={user.email}
          published={globe.published}
          googleClientId={process.env.GOOGLE_CLIENT_ID ?? ""}
          googleConnected={
            accounts?.data && !accounts.error
              ? accounts.data.some((account) => account.providerId === "google")
              : null
          }
          profileUrl={`${process.env.APP_ORIGIN?.replace(/\/$/, "") ?? ""}/u/${globe.username}`}
        />
      </main>
    </div>
  );
}
