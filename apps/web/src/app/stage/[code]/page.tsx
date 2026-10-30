'use client';

import { useParams } from 'next/navigation';
import { StageView } from '@/components/stage/stage-view';

export default function StagePage() {
  const { code } = useParams<{ code: string }>();
  return <StageView code={String(code).toUpperCase()} />;
}
