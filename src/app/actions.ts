
"use server";

import { analyzeServiceReport, ServiceReportInput, ServiceReportOutput } from "@/ai/flows/service-report-analyzer";
import { revalidatePath } from "next/cache";
import { ServiceReport, Appointment } from "@/lib/types";
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';


function getAdminFirestore() {
  if (getApps().length === 0) {
    try {
       initializeApp({
         credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!))
       });
    } catch(e) {
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
    
    // O ID do formulário pode ser um ID de agendamento real ou 'new' para agendamentos recorrentes.
    let appointmentId = rawData.appointmentId as string;
    const franchiseId = rawData.franchiseId as string;
    const clientId = rawData.clientId as string;
    const technicianId = rawData.technicianId as string;
    const scheduledDateTime = rawData.scheduledDateTime as string;

    if (!franchiseId || !clientId || !technicianId || !scheduledDateTime) {
        return { success: false, error: "Dados essenciais do agendamento estão faltando." };
    }

    try {
        const batch = firestore.batch();
        let appointmentRef;

        // Para agendamentos recorrentes, o ID será "new". Precisamos criar um registro real no banco de dados para ele.
        if (appointmentId === 'new') {
            // Cria um novo documento de agendamento porque este não existia no BD
            appointmentRef = firestore.collection(`franchises/${franchiseId}/appointments`).doc();
            appointmentId = appointmentRef.id; // Atualiza para o ID real do novo documento
            
            const newAppointment: Omit<Appointment, 'id'> = {
                franchiseId,
                clientId,
                technicianId,
                scheduledDateTime,
                status: 'completed', // Iremos definir como concluído imediatamente
                serviceReportId: '', // Placeholder, será atualizado abaixo
            };
            // Define os dados do novo agendamento
            batch.set(appointmentRef, newAppointment);
        } else {
            // É um agendamento existente, basta obter sua referência
            appointmentRef = firestore.doc(`franchises/${franchiseId}/appointments/${appointmentId}`);
        }

        // Cria um novo documento de relatório de serviço
        const reportRef = firestore.collection(`franchises/${franchiseId}/serviceReports`).doc();

        const newReport: Omit<ServiceReport, 'id' | 'createdAt'> = {
            franchiseId,
            appointmentId: appointmentId, // Usa o ID (seja o original ou o novo)
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
            // TODO: Lidar com uploads de fotos reais para o Firebase Storage
            photoUrls: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg'].filter((_, i) => {
              const file = rawData[`photo-${i}`] as File;
              return file && file.size > 0;
            }),
        };
        batch.set(reportRef, { ...newReport, createdAt: new Date().toISOString() });

        // Atualiza o agendamento (novo ou existente) com o ID do relatório de serviço e define o status como concluído
        batch.update(appointmentRef, {
            serviceReportId: reportRef.id,
            status: 'completed',
        });

        // Confirma todas as escritas em lote atomicamente
        await batch.commit();

        // Revalida caminhos para atualizar a UI
        revalidatePath(`/dashboard/schedule`);
        revalidatePath(`/dashboard/clients/${clientId}`);

        return { success: true };

    } catch (e: any) {
        console.error("Error submitting report:", e);
        return { success: false, error: e.message || "Ocorreu um erro ao finalizar o relatório." };
    }
}
