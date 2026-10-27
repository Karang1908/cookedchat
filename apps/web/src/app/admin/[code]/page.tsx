'use client';

import { useParams } from 'next/navigation';
import { AdminView } from '@/components/admin/admin-view';

export default function AdminPage() {
  const { code } = useParams<{ code: string }>();
  return <AdminView code={String(code).toUpperCase()} />;
}
