export type UserRole = 'master' | 'owner' | 'technician' | 'client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  franchiseId: string | null;
  avatarUrl: string;
}

export interface Franchise {
  id: string;
  name: string;
  ownerId: string;
  region: string;
}

export type ContractType = 'mensal' | 'quinzenal' | 'avulso';

export interface Client {
  id: string;
  name: string;
  address: string;
  franchiseId: string;
  assignedTechnicianId: string | null;
  contractType: ContractType;
  poolSize: number; // in liters
}

export interface Technician {
  id: string;
  name: string;
  franchiseId: string;
  currentLocation: { lat: number; lng: number };
  phone: string;
  avatarUrl: string;
}

export type AppointmentStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  clientId: string;
  technicianId: string;
  franchiseId: string;
  date: string; // ISO string
  status: AppointmentStatus;
  notes?: string;
}

export interface ServiceReport {
  id: string;
  appointmentId: string;
  chlorineLevel: number;
  phLevel: number;
  alkalinity: number;
  servicesPerformed: string[];
  photoUrl: string;
  analysis?: {
    analysisResult: string;
    issuesIdentified: string;
    complianceStatus: string;
  };
}
