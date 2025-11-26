
"use server";

import { analyzeServiceReport, ServiceReportInput, ServiceReportOutput } from "@/ai/flows/service-report-analyzer";
import { revalidatePath } from "next/cache";
import { doc, writeBatch, collection as firestoreCollection } from "firebase/firestore";
import { getSdks } from "@/firebase"; // Assuming this function gives firestore instance without needing auth
import { ServiceReport, Appointment } from "@/lib/types";

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


// This is a simplified server action. In a real app, you'd handle file uploads to a storage service.
export async function submitReportAction(
    prevState: SubmitReportState,
    formData: FormData
): Promise<SubmitReportState> {
    const { firestore } = getSdks(); // This might need adjustment based on your server-side firebase init

    const rawData = Object.fromEntries(formData.entries());
    
    const appointmentId = rawData.appointmentId as string;
    const franchiseId = rawData.franchiseId as string;
    const clientId = rawData.clientId as string;
    const technicianId = rawData.technicianId as string;

    if (!appointmentId || !franchiseId || !clientId || !technicianId) {
        return { success: false, error: "Dados essenciais do agendamento estão faltando." };
    }

    try {
        const batch = writeBatch(firestore);

        // 1. Create a reference for the new service report document to get an ID.
        const reportCollectionRef = firestoreCollection(firestore, 'franchises', franchiseId, 'serviceReports');
        const reportRef = doc(reportCollectionRef); // This creates a reference with a new unique ID

        // 2. Create the Service Report document data
        const newReport: ServiceReport = {
            id: reportRef.id, // Use the generated ID
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
            // In a real app, upload files to Cloud Storage and save URLs here.
            // For now, we'll just simulate with placeholder names.
            photoUrls: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg'].filter((_, i) => (rawData[`photo-${i}`] as File)?.size > 0),
            createdAt: new Date().toISOString(),
        };
        // Use the explicit reference with the new ID in the batch.
        batch.set(reportRef, newReport);

        // 3. Update Appointment with the new report ID and set status to 'completed'
        const appointmentRef = doc(firestore, 'franchises', franchiseId, 'appointments', appointmentId);
        const appointmentUpdate: Partial<Appointment> = {
            serviceReportId: reportRef.id,
            status: 'completed',
        };
        batch.update(appointmentRef, appointmentUpdate);

        // 4. Commit the batch
        await batch.commit();

        // Revalidate paths to show updated data
        revalidatePath(`/dashboard/schedule`);
        revalidatePath(`/dashboard/clients/${clientId}`);

        return { success: true };

    } catch (e: any) {
        console.error("Error submitting report:", e);
        return { success: false, error: e.message || "Ocorreu um erro ao finalizar o relatório." };
    }
}
