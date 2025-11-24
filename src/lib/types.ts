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
export type DayOfWeek = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo';


export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  franchiseId: string;
  assignedTechnicianId: string | null;
  contractType: ContractType;
  poolSize: number; // in liters, but we're using it for monthly fee for now
  dueDate: number;
  visitDays: DayOfWeek[];
}

export type NewClientData = Omit<Client, 'id' | 'franchiseId'>

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
alcalinity: number;
  servicesPerformed: string[];
  photoUrl: string;
  analysis?: {
    analysisResult: string;
    issuesIdentified: string;
    complianceStatus: string;
  };
}
