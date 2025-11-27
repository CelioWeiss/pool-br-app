
"use server";

import { analyzeServiceReport, ServiceReportInput, ServiceReportOutput } from "@/ai/flows/service-report-analyzer";
import { revalidatePath } from "next/cache";
import { ServiceReport, Appointment } from "@/lib/types";
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';


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
    
    // The ID from the form can be a real appointment ID, or a temporary one like 'auto-...' for recurring ones
    const appointmentId = rawData.appointmentId as string;
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
        let finalAppointmentId = appointmentId;

        // For recurring appointments, the ID will start with "auto-". We need to create a real DB entry for it.
        if (appointmentId.startsWith('auto-')) {
            // Create a new appointment document because this one didn't exist in the DB
            appointmentRef = firestore.collection(`franchises/${franchiseId}/appointments`).doc();
            finalAppointmentId = appointmentRef.id;
            
            const newAppointment: Omit<Appointment, 'id'> = {
                franchiseId,
                clientId,
                technicianId,
                scheduledDateTime,
                status: 'completed', // We will set it to completed right away
                serviceReportId: '', // Placeholder, will be updated below
            };
            // Set the new appointment data
            batch.set(appointmentRef, newAppointment);
        } else {
            // It's an existing appointment, just get its reference
            appointmentRef = firestore.doc(`franchises/${franchiseId}/appointments/${appointmentId}`);
        }

        // Create a new service report document
        const reportRef = firestore.collection(`franchises/${franchiseId}/serviceReports`).doc();

        const newReport: Omit<ServiceReport, 'id'> = {
            franchiseId,
            appointmentId: finalAppointmentId,
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
            // TODO: Handle actual photo uploads to Firebase Storage
            photoUrls: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg'].filter((_, i) => {
              const file = rawData[`photo-${i}`] as File;
              return file && file.size > 0;
            }),
            createdAt: new Date().toISOString(),
        };
        batch.set(reportRef, newReport);

        // Update the appointment (either the new or existing one) with the service report ID and set status to completed
        batch.update(appointmentRef, {
            serviceReportId: reportRef.id,
            status: 'completed',
        });

        // Commit all batched writes atomically
        await batch.commit();

        // Revalidate paths to update the UI
        revalidatePath(`/dashboard/schedule`);
        revalidatePath(`/dashboard/clients/${clientId}`);

        return { success: true };

    } catch (e: any) {
        console.error("Error submitting report:", e);
        return { success: false, error: e.message || "Ocorreu um erro ao finalizar o relatório." };
    }
}
