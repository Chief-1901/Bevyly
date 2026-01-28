import { Suspense } from 'react';
import { ApprovalContent } from './ApprovalContent';
import { ApprovalSkeleton } from './ApprovalSkeleton';

interface ApprovalPageProps {
  searchParams: Promise<{
    status?: string;
    bucket?: string;
    batchId?: string;
    page?: string;
    action?: string;
  }>;
}

export default async function ApprovalPage(props: ApprovalPageProps) {
  return (
    <Suspense fallback={<ApprovalSkeleton />}>
      <ApprovalContent searchParams={props.searchParams} />
    </Suspense>
  );
}
