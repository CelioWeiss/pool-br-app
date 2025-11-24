"use server";

import { analyzeServiceReport, ServiceReportInput, ServiceReportOutput } from "@/ai/flows/service-report-analyzer";

export interface AnalyzeReportState {
  analysisResult?: ServiceReportOutput;
  error?: string;
}

export async function analyzeReportAction(
  prevState: AnalyzeReportState,
  formData: FormData
): Promise<AnalyzeReportState> {
  const photo = formData.get("photo") as File;
  const poolParameters = formData.get("poolParameters") as string;
  const servicesPerformed = formData.get("servicesPerformed") as string;

  if (!photo || photo.size === 0 || !poolParameters || !servicesPerformed) {
    return { error: "Todos os campos e a foto são obrigatórios." };
  }

  try {
    const buffer = await photo.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const photoDataUri = `data:${photo.type};base64,${base64}`;

    const input: ServiceReportInput = {
      photoDataUri,
      poolParameters,
      servicesPerformed,
    };
    
    const analysisResult = await analyzeServiceReport(input);
    
    return { analysisResult };
  } catch (e: any) {
    console.error(e);
    return { error: e.message || "Ocorreu um erro ao analisar o relatório." };
  }
}
