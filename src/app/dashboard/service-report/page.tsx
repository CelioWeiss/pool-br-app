import { ReportForm } from "@/components/dashboard/service-report/report-form";
import Image from "next/image";

export default function ServiceReportPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
       <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gerar Relatório de Serviço</h1>
            <p className="text-muted-foreground">Preencha os detalhes do serviço e anexe uma foto da piscina para análise.</p>
          </div>
          <Image
            src="/logo.png" // TODO: Substitua pelo caminho real do seu logo
            alt="Logo da Empresa"
            width={120}
            height={60}
            className="object-contain"
            data-ai-logo
          />
        </div>
      <ReportForm />
    </div>
  );
}
