
"use client";

import React from 'react';
import { useSearchParams } from "next/navigation";
import { ServiceReportForm } from '@/components/dashboard/service-report/report-form';
import DashboardLayout from '@/app/dashboard/layout';
import { Spinner } from '@/components/ui/spinner';

function RelatorioContent() {
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');
  const franchiseId = searchParams.get('franchiseId');

  if (!appointmentId || !franchiseId) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <p>ID do atendimento ou da franquia não fornecido.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-6xl mx-auto">
      <ServiceReportForm appointmentId={appointmentId} franchiseId={franchiseId} />
    </div>
  );
}


export default function RelatorioPage() {
  return (
    <DashboardLayout>
      <React.Suspense fallback={<div className="flex h-[80vh] items-center justify-center"><Spinner size="large" /></div>}>
        <RelatorioContent />
      </React.Suspense>
    </DashboardLayout>
  );
}
