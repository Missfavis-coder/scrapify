
import { Suspense } from "react";
import { AutomationSkeleton } from "../_components/loading";
import { AutomationResult } from "../_components/automation-result";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkflowPage({ params }: PageProps) {
  const { id: publicId } = await params;

  return (
    <Suspense fallback={<AutomationSkeleton />}>
      <AutomationResult publicId={publicId} />
    </Suspense>
  );
}
