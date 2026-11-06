import { Suspense } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { readGlobe } from "@/lib/domain";
import { Workspace } from "@/components/workspace";

export default async function StudioPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const globe = await readGlobe({ userId: user.id });
  if (!globe) redirect("/onboarding");
  return (
    <Suspense>
      <Workspace
        globe={globe}
        owner
        viewer={{
          displayName: globe.displayName,
          profileHref: globe.published ? `/u/${globe.username}` : null,
        }}
      />
    </Suspense>
  );
}
