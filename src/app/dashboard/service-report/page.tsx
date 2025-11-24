import { ReportForm } from "@/components/dashboard/service-report/report-form";
import Image from "next/image";
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function ServiceReportPage() {
  const logo = PlaceHolderImages.find(p => p.id === 'logo-color');

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
       <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gerar Relatório de Serviço</h1>
            <p className="text-muted-foreground">Preencha os detalhes do serviço e anexe uma foto da piscina para análise.</p>
          </div>
          {logo && (
            <Image
              src={logo.imageUrl}
              alt="Logo da Empresa"
              width={120}
              height={60}
              className="object-contain"
              data-ai-logo
            />
          )}
        </div>
      <ReportForm />
    </div>
  );
}
