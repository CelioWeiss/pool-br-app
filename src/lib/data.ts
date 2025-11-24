import type { User, Franchise, Client, Technician, Appointment } from './types';
import { PlaceHolderImages } from './placeholder-images';

export const users: User[] = [
  { id: 'user-master-1', name: 'Master Admin', email: 'master@poolbr.com', role: 'master', franchiseId: null, avatarUrl: PlaceHolderImages.find(p => p.id === 'avatar1')?.imageUrl || '' },
  { id: 'user-owner-1', name: 'Ana Costa', email: 'ana.costa@franquia-sp.com', role: 'owner', franchiseId: 'franchise-sp', avatarUrl: PlaceHolderImages.find(p => p.id === 'avatar2')?.imageUrl || '' },
  { id: 'user-tech-1', name: 'Bruno Alves', email: 'bruno.alves@franquia-sp.com', role: 'technician', franchiseId: 'franchise-sp', avatarUrl: PlaceHolderImages.find(p => p.id === 'avatar3')?.imageUrl || '' },
  { id: 'user-tech-2', name: 'Carlos Dias', email: 'carlos.dias@franquia-sp.com', role: 'technician', franchiseId: 'franchise-sp', avatarUrl: PlaceHolderImages.find(p => p.id === 'avatar4')?.imageUrl || '' },
  { id: 'user-client-1', name: 'Família Silva', email: 'familia.silva@email.com', role: 'client', franchiseId: 'franchise-sp', avatarUrl: PlaceHolderImages.find(p => p.id === 'avatar5')?.imageUrl || '' },
];

export const franchises: Franchise[] = [
  { id: 'franchise-sp', name: 'Pool BR - São Paulo', ownerId: 'user-owner-1', region: 'São Paulo, SP' },
  { id: 'franchise-rj', name: 'Pool BR - Rio de Janeiro', ownerId: 'user-owner-2', region: 'Rio de Janeiro, RJ' },
  { id: 'franchise-mg', name: 'Pool BR - Belo Horizonte', ownerId: 'user-owner-3', region: 'Belo Horizonte, MG' },
];

export const clients: Client[] = [
  { id: 'client-1', name: 'Condomínio Plaza', address: 'Av. Paulista, 1000', franchiseId: 'franchise-sp', assignedTechnicianId: 'tech-1', contractStatus: 'active', poolSize: 50000 },
  { id: 'client-2', name: 'Residencial Morumbi', address: 'Rua dos Bobos, 0', franchiseId: 'franchise-sp', assignedTechnicianId: 'tech-1', contractStatus: 'active', poolSize: 25000 },
  { id: 'client-3', name: 'Clube Pinheiros', address: 'Av. Faria Lima, 2000', franchiseId: 'franchise-sp', assignedTechnicianId: 'tech-2', contractStatus: 'inactive', poolSize: 120000 },
  { id: 'client-4', name: 'Hotel Copacabana', address: 'Av. Atlântica, 1702', franchiseId: 'franchise-rj', assignedTechnicianId: null, contractStatus: 'pending', poolSize: 75000 },
];

export const technicians: Technician[] = [
  { id: 'tech-1', name: 'Bruno Alves', franchiseId: 'franchise-sp', currentLocation: { lat: -23.561_334, lng: -46.656_544 }, phone: '(11) 98765-4321', avatarUrl: PlaceHolderImages.find(p => p.id === 'avatar3')?.imageUrl || '' },
  { id: 'tech-2', name: 'Carlos Dias', franchiseId: 'franchise-sp', currentLocation: { lat: -23.55, lng: -46.633_333 }, phone: '(11) 91234-5678', avatarUrl: PlaceHolderImages.find(p => p.id === 'avatar4')?.imageUrl || '' },
  { id: 'tech-3', name: 'Daniela Rocha', franchiseId: 'franchise-rj', currentLocation: { lat: -22.969_778, lng: -43.186_822 }, phone: '(21) 99999-8888', avatarUrl: PlaceHolderImages.find(p => p.id === 'avatar6')?.imageUrl || '' },
];

export const appointments: Appointment[] = [
  { id: 'appt-1', clientId: 'client-1', technicianId: 'tech-1', franchiseId: 'franchise-sp', date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(), status: 'scheduled' },
  { id: 'appt-2', clientId: 'client-2', technicianId: 'tech-1', franchiseId: 'franchise-sp', date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(), status: 'scheduled' },
  { id: 'appt-3', clientId: 'client-3', technicianId: 'tech-2', franchiseId: 'franchise-sp', date: new Date().toISOString(), status: 'in_progress' },
  { id: 'appt-4', clientId: 'client-1', technicianId: 'tech-1', franchiseId: 'franchise-sp', date: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString(), status: 'completed' },
  { id: 'appt-5', clientId: 'client-2', technicianId: 'tech-1', franchiseId: 'franchise-sp', date: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString(), status: 'completed' },
];

// Helper to get today's appointments for a technician
export const getTechnicianSchedule = (technicianId: string) => {
  const today = new Date().toISOString().split('T')[0];
  return appointments.filter(a => a.technicianId === technicianId && a.date.startsWith(today));
};
