import type { User, Franchise, Client, Technician, Appointment, DayOfWeek } from './types';
import { PlaceHolderImages } from './placeholder-images';
import { add, nextDay, setHours, setMinutes, setSeconds, setMilliseconds, formatISO, subWeeks } from 'date-fns';

export const users: User[] = [
  { id: 'user-master-1', name: 'Master Admin', email: 'master@poolbr.com', role: 'master', franchiseId: null, avatarUrl: PlaceHolderImages.find(p => p.id === 'avatar1')?.imageUrl || '' },
  { id: 'user-owner-1', name: 'Ana Costa', email: 'ana.costa@franquia-sp.com', role: 'owner', franchiseId: 'franchise-sp', avatarUrl: PlaceHolderImages.find(p => p.id === 'avatar2')?.imageUrl || '' },
  { id: 'user-tech-1', name: 'Bruno Alves', email: 'bruno.alves@franquia-sp.com', role: 'technician', franchiseId: 'franchise-sp', avatarUrl: PlaceHolderImages.find(p => p.id === 'avatar3')?.imageUrl || '' },
  { id: 'user-tech-2', name: 'Carlos Dias', email: 'carlos.dias@franquia-sp.com', role: 'technician', franchiseId: 'franchise-sp', avatarUrl: PlaceHolderImages.find(p => p.id === 'avatar4')?.imageUrl || '' },
  { id: 'user-client-1', name: 'Família Silva', email: 'familia.silva@email.com', role: 'client', franchiseId: 'franchise-sp', avatarUrl: PlaceHolderImages.find(p => p.id === 'avatar5')?.imageUrl || '' },
];

export let franchises: Franchise[] = [
  { id: 'franchise-sp', name: 'Pool BR - São Paulo', ownerId: 'user-owner-1', region: 'São Paulo, SP' },
  { id: 'franchise-rj', name: 'Pool BR - Rio de Janeiro', ownerId: 'user-owner-2', region: 'Rio de Janeiro, RJ' },
  { id: 'franchise-mg', name: 'Pool BR - Belo Horizonte', ownerId: 'user-owner-3', region: 'Belo Horizonte, MG' },
];

export let clients: Client[] = [
  { id: 'client-1', name: 'Condomínio Plaza', email: 'plaza@email.com', phone: '11999999999', address: 'Av. Paulista, 1000', franchiseId: 'franchise-sp', assignedTechnicianId: 'tech-1', contractType: 'mensal', poolSize: 50000, dueDate: 10, visitDays: ['terca', 'sexta'] },
  { id: 'client-2', name: 'Residencial Morumbi', email: 'morumbi@email.com', phone: '11999999998', address: 'Rua dos Bobos, 0', franchiseId: 'franchise-sp', assignedTechnicianId: 'tech-1', contractType: 'mensal', poolSize: 25000, dueDate: 5, visitDays: ['segunda', 'quinta'] },
  { id: 'client-3', name: 'Clube Pinheiros', email: 'pinheiros@email.com', phone: '11999999997', address: 'Av. Faria Lima, 2000', franchiseId: 'franchise-sp', assignedTechnicianId: 'tech-2', contractType: 'quinzenal', poolSize: 120000, dueDate: 15, visitDays: ['quarta'] },
  { id: 'client-4', name: 'Hotel Copacabana', email: 'copa@email.com', phone: '21999999999', address: 'Av. Atlântica, 1702', franchiseId: 'franchise-rj', assignedTechnicianId: null, contractType: 'avulso', poolSize: 75000, dueDate: 1, visitDays: [] },
];

export const technicians: Technician[] = [
  { id: 'tech-1', name: 'Bruno Alves', franchiseId: 'franchise-sp', currentLocation: { lat: -23.561_334, lng: -46.656_544 }, phone: '(11) 98765-4321', avatarUrl: PlaceHolderImages.find(p => p.id === 'avatar3')?.imageUrl || '' },
  { id: 'tech-2', name: 'Carlos Dias', franchiseId: 'franchise-sp', currentLocation: { lat: -23.55, lng: -46.633_333 }, phone: '(11) 91234-5678', avatarUrl: PlaceHolderImages.find(p => p.id === 'avatar4')?.imageUrl || '' },
  { id: 'tech-3', name: 'Daniela Rocha', franchiseId: 'franchise-rj', currentLocation: { lat: -22.969_778, lng: -43.186_822 }, phone: '(21) 99999-8888', avatarUrl: PlaceHolderImages.find(p => p.id === 'avatar6')?.imageUrl || '' },
];

const dayOfWeekMap: Record<DayOfWeek, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};

// Function to generate appointments for the next 4 weeks
const generateAppointments = (clientId: string, technicianId: string, visitDays: DayOfWeek[], franchiseId: string): Appointment[] => {
    const newAppointments: Appointment[] = [];
    const today = new Date();
    let visitCount = 0;

    for (let week = 0; week < 4; week++) {
        for (const day of visitDays) {
            const dayIndex = dayOfWeekMap[day];
            let visitDate = nextDay(today, dayIndex);
            visitDate = add(visitDate, { weeks: week });
            
            // Set a default time, e.g., 9 AM plus some staggering
            visitDate = setHours(visitDate, 9 + visitCount * 2);
            visitDate = setMinutes(visitDate, 0);
            visitDate = setSeconds(visitDate, 0);
            visitDate = setMilliseconds(visitDate, 0);

            newAppointments.push({
                id: `appt-${clientId}-${week}-${day}`,
                clientId,
                technicianId,
                franchiseId,
                date: formatISO(visitDate),
                status: 'scheduled',
            });
            visitCount++;
        }
    }
    return newAppointments;
};


let initialAppointments: Appointment[] = [
    ...generateAppointments('client-1', 'tech-1', ['terca', 'sexta'], 'franchise-sp'),
    ...generateAppointments('client-2', 'tech-1', ['segunda', 'quinta'], 'franchise-sp'),
    ...generateAppointments('client-3', 'tech-2', ['quarta'], 'franchise-sp'),
];

// Add a completed appointment with a service report for demonstration
const pastDate = subWeeks(new Date(), 1);
initialAppointments.push({
    id: `appt-client-1-past-1`,
    clientId: 'client-1',
    technicianId: 'tech-1',
    franchiseId: 'franchise-sp',
    date: formatISO(setHours(pastDate, 10)),
    status: 'completed',
    serviceReport: {
        id: 'report-1',
        appointmentId: 'appt-client-1-past-1',
        chlorineLevel: 2.8,
        phLevel: 7.5,
        alcalinity: 110,
        servicesPerformed: ['Aspiração do fundo', 'Limpeza das bordas', 'Aplicação de clarificante'],
        photoUrl: PlaceHolderImages.find(p => p.id === 'pool-photo-1')?.imageUrl || '',
    }
});


export let appointments: Appointment[] = initialAppointments;


export function addAppointmentsForClient(clientId: string, technicianId: string, visitDays: DayOfWeek[], franchiseId: string) {
    const newAppointments = generateAppointments(clientId, technicianId, visitDays, franchiseId);
    appointments.push(...newAppointments);
}

export function removeAppointmentsForClient(clientId: string) {
    appointments = appointments.filter(a => a.clientId !== clientId);
}


// Helper to get today's appointments for a technician
export const getTechnicianSchedule = (technicianId: string) => {
  const today = new Date().toISOString().split('T')[0];
  return appointments.filter(a => a.technicianId === technicianId && a.date.startsWith(today));
};
