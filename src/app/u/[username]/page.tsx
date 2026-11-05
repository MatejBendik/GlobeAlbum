import { Suspense } from "react";
import { notFound } from "next/navigation";
import { readGlobe } from "@/lib/domain";
import { Workspace } from "@/components/workspace";

export default async function PublicGlobePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const globe = await readGlobe({ username });
  if (!globe) notFound();
  return (
    <Suspense>
      <Workspace globe={globe} />
    </Suspense>
  );
}
