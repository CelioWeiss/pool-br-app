export type UserRole = 'master' | 'owner' | 'technician' | 'client';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  franchiseId: string | null;
  isActive: boolean;
  createdAt: string; // ISO string
}

export interface Franchise {
  id: string;
  name: string;
  ownerId: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: string; // ISO string
}

export type NewFranchiseData = Omit<Franchise, 'id'>

export type ContractType = 'mensal' | 'quinzenal' | 'avulso';
export type DayOfWeek = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo';


export interface Client {
  id: string;
  name: string;
  address: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  franchiseId: string;
  poolDetails: string;
  technicianId: string | null;
  createdAt: string; // ISO string
  locationLatitude?: number;
  locationLongitude?: number;
}

export type NewClientData = Omit<Client, 'id' | 'franchiseId'>;

export interface Technician {
  id: string;
  userId: string;
  franchiseId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  isActive: boolean;
  createdAt: string; // ISO string
  locationLatitude?: number;
  locationLongitude?: number;
}

export type AppointmentStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  clientId: string;
  technicianId: string;
  franchiseId: string;
ScheduledDateTime: string; // ISO string
  status: AppointmentStatus;
  serviceReportId?: string;
}

export interface ServiceReport {
  id: string;
  franchiseId: string;
  appointmentId: string;
  technicianId: string;
  reportDateTime: string; // ISO string
  chlorineLevel: number;
  phLevel: number;
  servicesPerformed: string;
  photoUrls: string[];
  notes: string;
  createdAt: string; // ISO string
}
