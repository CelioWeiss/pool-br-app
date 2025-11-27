
"use server";

import { analyzeServiceReport, ServiceReportInput, ServiceReportOutput } from "@/ai/flows/service-report-analyzer";
import { revalidatePath } from "next/cache";
import { ServiceReport, Appointment } from "@/lib/types";

// Import Firebase Admin SDK
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Helper para inicializar o Firebase Admin (de forma segura)
function getAdminFirestore() {
  if (getApps().length === 0) {
    // Para um ambiente de produção real, use variáveis de ambiente para as credenciais
    // Ex: JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string)
    // Por enquanto, vamos assumir que as credenciais estão disponíveis.
    // Esta é uma configuração de exemplo e precisa ser sécurisée
    try {
       initializeApp({
         credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!))
       });
    } catch(e) {
      // Em um ambiente de desenvolvimento local sem a variável, isso pode falhar.
      // Para o Studio, as credenciais devem ser injetadas.
      console.error("Firebase Admin initialization failed. Make sure FIREBASE_SERVICE_ACCOUNT_KEY is set.", e);
      throw new Error("Firebase Admin initialization failed.");
    }
  }
  return getFirestore();
}


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


export interface SubmitReportState {
  success: boolean;
  error?: string;
}

export async function submitReportAction(
    prevState: SubmitReportState,
    formData: FormData
): Promise<SubmitReportState> {
    const firestore = getAdminFirestore();

    const rawData = Object.fromEntries(formData.entries());
    
    const appointmentId = rawData.appointmentId as string;
    const franchiseId = rawData.franchiseId as string;
    const clientId = rawData.clientId as string;
    const technicianId = rawData.technicianId as string;

    if (!appointmentId || !franchiseId || !clientId || !technicianId) {
        return { success: false, error: "Dados essenciais do agendamento estão faltando." };
    }

    try {
        const batch = firestore.batch();

        // 1. Create a reference for the new service report document to get an ID.
        const reportRef = firestore.collection(`franchises/${franchiseId}/serviceReports`).doc();

        // 2. Create the Service Report document data
        const newReport: ServiceReport = {
            id: reportRef.id,
            franchiseId,
            appointmentId,
            technicianId,
            clientId,
            chlorine: Number(rawData.chlorine),
            alkalinity: Number(rawData.alkalinity),
            ph: Number(rawData.ph),
            cya: Number(rawData.cya),
            calciumHardness: Number(rawData.calciumHardness),
            orp: Number(rawData.orp),
            tds: Number(rawData.tds),
            temperature: Number(rawData.temperature),
            servicesPerformed: formData.getAll('servicesPerformed') as string[],
            missingProducts: formData.getAll('missingProducts') as string[],
            observations: rawData.observations as string,
            // Em um app real, faríamos upload para o Storage e salvaríamos as URLs.
            // Por agora, simulamos com nomes.
            photoUrls: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg'].filter((_, i) => {
              const file = rawData[`photo-${i}`] as File;
              return file && file.size > 0;
            }),
            createdAt: new Date().toISOString(),
        };
        batch.set(reportRef, newReport);

        // 3. Update Appointment with the new report ID and set status to 'completed'
        const appointmentRef = firestore.doc(`franchises/${franchiseId}/appointments/${appointmentId}`);
        const appointmentUpdate: Partial<Appointment> = {
            serviceReportId: reportRef.id,
            status: 'completed',
        };
        batch.update(appointmentRef, appointmentUpdate);

        // 4. Commit the batch
        await batch.commit();

        revalidatePath(`/dashboard/schedule`);
        revalidatePath(`/dashboard/clients/${clientId}`);

        return { success: true };

    } catch (e: any) {
        console.error("Error submitting report:", e);
        return { success: false, error: e.message || "Ocorreu um erro ao finalizar o relatório." };
    }
}
