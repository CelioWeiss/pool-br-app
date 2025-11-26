
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';

// This page should ideally not be accessed directly.
// It redirects to the schedule page.
export default function ServiceReportRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/schedule');
  }, [router]);

  return (
    <div className="flex h-[80vh] items-center justify-center">
      <Spinner size="large" />
      <p className="ml-4">Redirecionando...</p>
    </div>
  );
}
