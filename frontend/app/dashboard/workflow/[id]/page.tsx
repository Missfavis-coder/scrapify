import { Suspense } from "react";
import { notFound } from "next/navigation";
import { WorkflowSkeleton } from "../_components/workflow-skeleton";
import { WorkflowResult } from "../_components/workflow-result";


interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkflowPage({ params }: PageProps) {
  const { id } = await params;

  /*
   * Replace this with your actual server query when the
   * automation database query is ready.
   *
   * Example:
   *
   * const automation = await getAutomationWithRuns(id);
   *
   * if (!automation) {
   *   notFound();
   * }
   */

  return (
    <Suspense fallback={<WorkflowSkeleton />}>
      <WorkflowResult automationId={id} />
    </Suspense>
  );
}