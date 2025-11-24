import { ReportForm } from "@/components/dashboard/service-report/report-form";

export default function ServiceReportPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
       <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerar Relatório de Serviço</h1>
          <p className="text-muted-foreground">Preencha os detalhes do serviço e anexe uma foto da piscina para análise.</p>
        </div>
      <ReportForm />
    </div>
  );
}
