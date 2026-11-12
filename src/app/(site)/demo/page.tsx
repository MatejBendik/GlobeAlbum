import { navigationViewer } from "@/lib/navigation-viewer";
import { Suspense } from "react";
import { demoGlobe } from "@/lib/demo";
import { Workspace } from "@/components/workspace";

export default async function DemoPage() {
  const viewer = await navigationViewer();
  return (
    <Suspense>
      <Workspace globe={demoGlobe} demo viewer={viewer} />
    </Suspense>
  );
}
