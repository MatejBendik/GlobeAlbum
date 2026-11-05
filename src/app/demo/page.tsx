import { Suspense } from "react";
import { demoGlobe } from "@/lib/demo";
import { Workspace } from "@/components/workspace";

export default function DemoPage() {
  return (
    <Suspense>
      <Workspace globe={demoGlobe} demo />
    </Suspense>
  );
}
