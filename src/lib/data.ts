import type { Franchise, User, Client, Technician, Appointment, ServiceReport } from './types';

export const users: User[] = [
  {
    id: 'master-admin-01',
    firstName: 'Admin',
    lastName: 'Master',
    email: 'master@poolbr.com',
    role: 'master',
    franchiseId: null,
    isActive: true,
    createdAt: new Date().toISOString(),
  }
];

export const franchises: Franchise[] = [
    {
        id: 'franchise-1',
        name: 'Pool BR - Campinas',
        ownerId: 'owner-ana-01',
        address: 'Campinas, SP',
        contactEmail: 'contato.campinas@poolbr.com',
        contactPhone: '(19) 99876-5432',
        createdAt: new Date().toISOString(),
    },
    {
        id: 'franchise-2',
        name: 'Pool BR - Santos',
        ownerId: 'user-placeholder-1672532400000',
        address: 'Santos, SP',
        contactEmail: 'contato.santos@poolbr.com',
        contactPhone: '(13) 99123-4567',
        createdAt: new Date().toISOString(),
    },
];

export const clients: Client[] = [
    {
        id: 'client-silva-01',
        name: 'Família Silva',
        address: 'Rua das Palmeiras, 123, Campinas, SP',
        contactName: 'Carlos Silva',
        contactPhone: '(19) 98765-4321',
        contactEmail: 'carlos.silva@email.com',
        franchiseId: 'franchise-1',
        poolDetails: 'Piscina de fibra 30,000L',
        technicianId: 'tech-bruno-01',
        createdAt: new Date().toISOString(),
    },
    {
        id: 'client-souza-02',
        name: 'Condomínio Bem Viver',
        address: 'Avenida Brasil, 1000, Campinas, SP',
        contactName: 'Sra. Mariana Souza',
        contactPhone: '(19) 91234-5678',
        contactEmail: 'mariana.s@email.com',
        franchiseId: 'franchise-1',
        poolDetails: 'Piscina de alvenaria 50,000L',
        technicianId: 'tech-carlos-01',
        createdAt: new Date().toISOString(),
    },
];

export const technicians: Technician[] = [
    {
        id: 'tech-bruno-01',
        userId: 'tech-bruno-01',
        franchiseId: 'franchise-1',
        firstName: 'Bruno',
        lastName: 'Alves',
        phone: '(19) 98888-1111',
        email: 'bruno.alves@poolbr.com',
        isActive: true,
        createdAt: new Date().toISOString(),
        locationLatitude: -22.9056,
        locationLongitude: -47.0608,
    },
    {
        id: 'tech-carlos-01',
        userId: 'tech-carlos-01',
        franchiseId: 'franchise-1',
        firstName: 'Carlos',
        lastName: 'Dias',
        phone: '(19) 97777-2222',
        email: 'carlos.dias@poolbr.com',
        isActive: true,
        createdAt: new Date().toISOString(),
        locationLatitude: -22.9329,
        locationLongitude: -47.0738,
    },
];

const today = new Date();
const getDay = (day: number, hour: number, minute: number) => {
    const date = new Date(today);
    date.setDate(day);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
}

export const appointments: Appointment[] = [
    {
        id: 'appt-1',
        clientId: 'client-silva-01',
        technicianId: 'tech-bruno-01',
        franchiseId: 'franchise-1',
        scheduledDateTime: getDay(today.getDate(), 9, 0),
        status: 'scheduled',
    },
    {
        id: 'appt-2',
        clientId: 'client-souza-02',
        technicianId: 'tech-bruno-01',
        franchiseId: 'franchise-1',
        scheduledDateTime: getDay(today.getDate(), 11, 0),
        status: 'scheduled',
    },
    {
        id: 'appt-3',
        clientId: 'client-souza-02', // Another client
        technicianId: 'tech-carlos-01',
        franchiseId: 'franchise-1',
        scheduledDateTime: getDay(today.getDate(), 14, 0),
        status: 'scheduled',
    },
     {
        id: 'appt-past-1',
        clientId: 'client-silva-01',
        technicianId: 'tech-bruno-01',
        franchiseId: 'franchise-1',
        scheduledDateTime: getDay(today.getDate() - 7, 9, 0),
        status: 'completed',
        serviceReportId: 'sr-1'
    },
];

export const serviceReports: ServiceReport[] = [
    {
        id: 'sr-1',
        franchiseId: 'franchise-1',
        appointmentId: 'appt-past-1',
        technicianId: 'tech-bruno-01',
        reportDateTime: getDay(today.getDate() - 7, 9, 30),
        chlorineLevel: 2.5,
        phLevel: 7.4,
        servicesPerformed: 'Aspiração, limpeza de bordas, aplicação de cloro.',
        photoUrls: ['https://images.unsplash.com/photo-1562016600-ece13e8ba570?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxzd2ltbWluZyUyMHBvb2x8ZW58MHx8fHwxNzYzOTMyMzc0fDA&ixlib=rb-4.1.0&q=80&w=1080'],
        notes: 'Piscina em ótimo estado.',
        createdAt: getDay(today.getDate() - 7, 9, 30),
    }
];
