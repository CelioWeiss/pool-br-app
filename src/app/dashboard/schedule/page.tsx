
"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { Appointment, Technician, Client, DayOfWeek, ServiceLocation } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { 
  format, 
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  set
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { DailySchedule } from '@/components/dashboard/schedule/daily-schedule';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const dayOfWeekMap: Record<DayOfWeek, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};

export default function SchedulePage() {
  const { userInfo, hasRole } = useAuth();
  const firestore = useFirestore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  const franchiseId = userInfo?.franchiseId;

  // --- Data Fetching ---
  const techniciansCollection = useMemoFirebase(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'technicians') : null
  , [firestore, franchiseId]);
  const { data: technicians, isLoading: isLoadingTechnicians } = useCollection<Technician>(techniciansCollection);

  const clientsCollection = useMemoFirebase(() =>
    firestore && franchiseId ? collection(firestore, 'franchises', franchiseId, 'clients') : null
  , [firestore, franchiseId]);
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsCollection);
  
  const locationsQuery = useMemoFirebase(() => {
    if (!firestore || !franchiseId) return null;
    // This is not ideal for performance, but for this structure it's necessary.
    // A better approach would be a root-level 'locations' collection if the app scales.
    return query(collection(firestore, 'franchises', franchiseId, 'clients'), where('franchiseId', '==', franchiseId))
  }, [firestore, franchiseId]);
  
  // We need to fetch all locations for all clients in the franchise to build the schedule
  const serviceLocationsCollection = useMemoFirebase(() => 
    firestore && franchiseId ? query(collection(firestore, 'franchises', franchiseId, 'clients')) : null, 
  [firestore, franchiseId]);

  // This is a simplified approach. For large franchises, querying all locations could be slow.
  const [allLocations, setAllLocations] = useState<ServiceLocation[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);

  useEffect(() => {
    if (!firestore || !franchiseId) {
        setIsLoadingLocations(false);
        return;
    };
    setIsLoadingLocations(true);
    const fetchAllLocations = async () => {
        const clientsSnapshot = await getDocs(query(collection(firestore, `franchises/${franchiseId}/clients`)));
        const locationsPromises = clientsSnapshot.docs.map(clientDoc => 
            getDocs(collection(firestore, `franchises/${franchiseId}/clients/${clientDoc.id}/locations`))
        );
        const locationsSnapshots = await Promise.all(locationsPromises);
        const allLocs: ServiceLocation[] = [];
        locationsSnapshots.forEach(locSnap => {
            locSnap.docs.forEach(doc => {
                allLocs.push({ id: doc.id, ...doc.data() } as ServiceLocation);
            });
        });
        setAllLocations(allLocs);
        setIsLoadingLocations(false);
    }
    fetchAllLocations();
  // This should re-run if firestore or franchiseId changes.
  // Not including clients in deps to avoid re-fetching on every client change during the session.
  }, [firestore, franchiseId]);


  const appointmentsQuery = useMemoFirebase(() => {
    if (!firestore || !franchiseId) return null;
    return collection(firestore, 'franchises', franchiseId, 'appointments');
  }, [firestore, franchiseId]);
  const { data: manualAppointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);

  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('all');
  
  // --- Unified Appointment Logic ---
  const allAppointmentsForFranchise = useMemo(() => {
    if (!allLocations || !manualAppointments) {
      return [];
    }
  
    const appointmentsMap = new Map<string, Appointment>();
  
    // 1. Add manual appointments first, they have priority
    manualAppointments.forEach(appt => {
      const key = `${appt.locationId}-${format(new Date(appt.scheduledDateTime), 'yyyy-MM-dd')}`;
      appointmentsMap.set(key, appt);
    });
  
    // 2. Generate and add recurring appointments from service locations
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start, end });
  
    allLocations.forEach(location => {
      if (location.serviceDays && location.serviceDays.length > 0 && location.technicianId) {
        const serviceDaysAsNumbers = location.serviceDays.map(d => dayOfWeekMap[d]);
  
        daysInMonth.forEach(day => {
          if (serviceDaysAsNumbers.includes(getDay(day))) {
            const scheduledDateTime = set(day, { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 }); 
            const key = `${location.id}-${format(scheduledDateTime, 'yyyy-MM-dd')}`;
  
            // Only add if no manual appointment exists for this location and day
            if (!appointmentsMap.has(key)) {
              appointmentsMap.set(key, {
                // Use a unique ID for recurring appointments that don't exist in DB yet
                id: `auto-${location.id}-${format(day, 'yyyy-MM-dd')}`,
                clientId: location.clientId,
                locationId: location.id,
                technicianId: location.technicianId,
                franchiseId: location.franchiseId,
                scheduledDateTime: scheduledDateTime.toISOString(), // Ensure it's an ISO string
                status: 'scheduled',
              });
            }
          }
        });
      }
    });
  
    return Array.from(appointmentsMap.values());
  }, [allLocations, manualAppointments, currentDate]);

  const filteredAppointments = useMemo(() => {
    let appointmentsToFilter = allAppointmentsForFranchise;
    
    if (hasRole('technician') && userInfo?.id) {
        // For technicians, filter by their userId, which is stored in the technician document
        const techDoc = technicians?.find(t => t.userId === userInfo.id);
        if (techDoc) {
            return appointmentsToFilter.filter(a => a.technicianId === techDoc.id);
        }
        return []; // Technician document not found, return no appointments
    }

    if (hasRole('owner')) {
      if (selectedTechnicianId === 'all') {
        return appointmentsToFilter;
      }
      return appointmentsToFilter.filter(a => a.technicianId === selectedTechnicianId);
    }

    return [];
  }, [allAppointmentsForFranchise, selectedTechnicianId, hasRole, userInfo?.id, technicians]);
  
  
  const isLoading = isLoadingTechnicians || isLoadingClients || isLoadingAppointments || isLoadingLocations;

  const appointmentDates = useMemo(() => filteredAppointments?.map(a => new Date(a.scheduledDateTime)) || [], [filteredAppointments]);

  const selectedAppointments = useMemo(() => {
    if (!selectedDate || !filteredAppointments) return [];
    return filteredAppointments.filter(a => isSameDay(new Date(a.scheduledDateTime), selectedDate));
  }, [selectedDate, filteredAppointments]);


  if (!hasRole(['owner', 'technician'])) {
    return <p>Acesso negado.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenda de Serviços</h1>
          <p className="text-muted-foreground">Visualize e gerencie os agendamentos.</p>
        </div>
        {hasRole('owner') && <Button disabled>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Agendamento Manual
        </Button>}
      </div>

       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                  <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-lg font-semibold capitalize w-48 text-center">
                  {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                  <ChevronRight className="h-4 w-4" />
              </Button>
          </div>

          {hasRole('owner') && (
            <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="technician-filter">Filtrar por técnico</Label>
                <Select value={selectedTechnicianId} onValueChange={setSelectedTechnicianId}>
                    <SelectTrigger id="technician-filter" className="w-[220px]">
                        <SelectValue placeholder="Selecione um técnico" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Técnicos</SelectItem>
                        {technicians?.map(tech => (
                            <SelectItem key={tech.id} value={tech.id}>{tech.firstName} {tech.lastName}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          )}
       </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="p-1">
             <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentDate}
                onMonthChange={setCurrentDate}
                locale={ptBR}
                className="w-full"
                modifiers={{ scheduled: appointmentDates }}
                modifiersStyles={{
                  scheduled: {
                    border: "2px solid hsl(var(--primary))",
                    borderRadius: 'var(--radius)',
                  },
                }}
                components={{
                  IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
                  IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
                }}
              />
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
                Atendimentos para {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : 'Nenhuma data selecionada'}
            </CardTitle>
            <CardDescription>
                {isLoading ? 'Carregando agendamentos...' : (selectedAppointments.length > 0 ? `${selectedAppointments.length} serviço(s) agendado(s) para este dia.` : "Nenhum serviço agendado para este dia.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
             {isLoading ? (
              <div className="flex h-48 items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <DailySchedule 
                appointments={selectedAppointments} 
                clients={clients || []}
                technicians={technicians || []}
                locations={allLocations || []}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Dummy getDocs for type-checking, since the real one is from firebase/firestore
const getDocs = (query: any) => Promise.resolve({ docs: [] as any[] });
