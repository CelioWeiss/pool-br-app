
import type { Franchise, UserInfo, Client, Technician, Appointment, ServiceReport } from './types';

export const users: UserInfo[] = [
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

export const clients: Client[] = [];

export const technicians: Technician[] = [];

export const appointments: Appointment[] = [];

export const serviceReports: ServiceReport[] = [];
