
import { collection, writeBatch, doc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { eachDayOfInterval, startOfMonth, endOfMonth, set, format } from "date-fns";
import type { Firestore } from 'firebase/firestore';
import type { ServiceLocation } from './types';

const dayOfWeekMap = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};


interface GenerateScheduleParams {
    firestore: Firestore;
    franchiseId: string;
    locations: ServiceLocation[];
    month: Date;
}

export async function gerarAgendaDoMesNoFirestore({
  firestore,
  franchiseId,
  locations,
  month
}: GenerateScheduleParams) {
  if (!firestore || !franchiseId || !locations?.length) return;

  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const daysInMonth = eachDayOfInterval({ start, end });

  const appointmentsRef = collection(firestore, "franchises", franchiseId, "appointments");

  // 🔎 Busca o que já existe para evitar duplicação
  const existingSnap = await getDocs(
    query(
      appointmentsRef,
      where("scheduledDateTime", ">=", start.toISOString()),
      where("scheduledDateTime", "<=", end.toISOString())
    )
  );

  const existingKeys = new Set(
    existingSnap.docs.map(doc => {
      const a = doc.data();
      return `${a.locationId}-${format(new Date(a.scheduledDateTime), "yyyy-MM-dd")}`;
    })
  );

  const batch = writeBatch(firestore);
  let hasNewAppointments = false;

  locations.forEach(location => {
    if (!location.serviceDays?.length || !location.technicianId) return;

    const serviceDaysAsNumbers = location.serviceDays.map(d => dayOfWeekMap[d]);

    daysInMonth.forEach(day => {
      if (serviceDaysAsNumbers.includes(day.getDay())) {
        const scheduledDateTime = set(day, { hours: 9, minutes: 0, seconds: 0 });
        const key = `${location.id}-${format(day, "yyyy-MM-dd")}`;

        if (!existingKeys.has(key)) {
          const docRef = doc(appointmentsRef);

          batch.set(docRef, {
            id: docRef.id,
            clientId: location.clientId,
            locationId: location.id,
            technicianId: location.technicianId,
            franchiseId: location.franchiseId,
            scheduledDateTime: scheduledDateTime.toISOString(),
            status: "scheduled",
            createdAt: serverTimestamp(),
            createdBy: "auto-system"
          });
          hasNewAppointments = true;
        }
      }
    });
  });

  if (hasNewAppointments) {
    await batch.commit();
  }
}
