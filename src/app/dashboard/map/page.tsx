
import { TechnicianMap } from '@/components/dashboard/map/technician-map';
import { technicians, appointments, clients } from '@/lib/data';

export default function MapPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="flex h-[80vh] items-center justify-center rounded-lg border bg-card text-center p-8">
        <div>
          <h2 className="text-2xl font-bold">Google Maps API Key Faltando</h2>
          <p className="mt-2 text-muted-foreground">
            Para exibir o mapa, por favor, configure a variável de ambiente <code className="font-mono bg-muted p-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
       <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Mapa de Técnicos</h1>
          <p className="text-muted-foreground">Acompanhe a localização dos técnicos em tempo real.</p>
        </div>
      <div className="h-[75vh] w-full overflow-hidden rounded-xl shadow-lg">
        <TechnicianMap apiKey={apiKey} technicians={technicians} appointments={appointments} clients={clients} />
      </div>
    </div>
  );
}
