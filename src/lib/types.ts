

export type UserRole = 'master' | 'owner' | 'technician' | 'client';

export interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  franchiseId: string | null;
  isActive: boolean;
  createdAt: string; // ISO string
  avatarUrl?: string;
}

export interface Franchise {
  id: string;
  name: string;
  ownerId: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: string; // ISO string
  logoUrl?: string;
  pixKey?: string;
}

export type NewFranchiseData = Omit<Franchise, 'id'>

export type ContractType = 'mensal' | 'quinzenal' | 'avulso';
export type DayOfWeek = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo';


export interface Client {
  id: string;
  userId: string; // Firebase Auth UID
  name: string;
  // address is deprecated, moved to ServiceLocation
  // address: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  franchiseId: string;
  avatarUrl?: string;
  // poolDetails is deprecated, moved to ServiceLocation
  // poolDetails: string;
  // technicianId is deprecated, moved to ServiceLocation
  // technicianId: string | null;
  createdAt: string; // ISO string
  // locationLatitude?: number;
  // locationLongitude?: number;
  monthlyFee?: number;
  dueDay?: number;
  contractType?: ContractType;
  // serviceDays is deprecated, moved to ServiceLocation
  // serviceDays?: DayOfWeek[];
}

export interface ServiceLocation {
  id: string;
  clientId: string;
  franchiseId: string;
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  poolDetails: string;
  technicianId: string | null;
  serviceDays: DayOfWeek[];
  createdAt: string; // ISO string
}

export interface NewClientData extends Omit<Client, 'id' | 'userId' | 'franchiseId' | 'createdAt'> {
    password?: string;
}

export interface Technician {
  id: string;
  userId?: string; // userId from auth, can be optional if created before user logs in
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
  locationId: string; // Added to specify which location
  technicianId: string;
  franchiseId: string;
  scheduledDateTime: string; // ISO string
  status: AppointmentStatus;
  serviceReportId?: string;
}

export interface ServiceReport {
  id: string;
  franchiseId: string;
  appointmentId: string;
  technicianId: string;
  clientId: string;
  locationId: string; // Added to specify which location
  chlorine: number;
  alkalinity: number;
  ph: number;
  cya: number;
  calciumHardness: number;
  orp: number;
  tds: number;
  temperature: number;
  servicesPerformed: string[];
  missingProducts: string[];
  observations: string;
  photoUrls: string[];
  createdAt: string; // ISO string
}

export interface Quote {
  id: string;
  franchiseId: string;
  clientId?: string | null; // Null if it's a new client
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  items: {
    service: string;
    price: number;
  }[];
  totalValue: number;
  notes?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string; // ISO string
}

export type VideoCategory = 'Institucional' | 'Treinamentos' | 'Técnico';

export interface UniversityVideo {
    id: string;
    title: string;
    description: string;
    videoUrl: string;
    thumbnailUrl: string;
    category: VideoCategory;
    createdAt: string; // ISO string
}
