
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
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw3fHxwcm9mZXNzaW9uYWwlMjBtYW58ZW58MHx8fHwxNzYzOTcwOTAwfDA&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: 'master-gestor-02',
    firstName: 'Master',
    lastName: 'Gestor',
    email: 'gestor@poolbr.com',
    role: 'master',
    franchiseId: null,
    isActive: true,
    createdAt: new Date().toISOString(),
    avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW58ZW58MHx8fHwxNzYzOTcwOTAwfDA&ixlib=rb-4.1.0&q=80&w=1080",
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
