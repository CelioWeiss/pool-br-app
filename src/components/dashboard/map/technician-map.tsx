"use client";

import React from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, Polyline } from '@vis.gl/react-google-maps';
import { technicians, appointments, clients } from '@/lib/data';
import { Wrench } from 'lucide-react';

export function TechnicianMap({ apiKey }: { apiKey: string }) {
  const mapCenter = { lat: -23.55052, lng: -46.633308 }; // São Paulo center

  const technicianAppointments = (techId: string) => 
    appointments
      .filter(a => a.technicianId === techId && (a.status === 'scheduled' || a.status === 'in_progress'))
      .map(a => {
        const client = clients.find(c => c.id === a.clientId);
        if (!client) return null;
        // Simple string-to-coordinate conversion for demo purposes
        const [lat, lng] = client.address.includes('Paulista') ? [-23.561334, -46.656544] : [-23.60, -46.68];
        return { lat, lng };
      })
      .filter(Boolean) as { lat: number, lng: number }[];


  const techColors = ["#1A237E", "#5C6BC0", "#3F51B5"];

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        mapId="poolbr-map"
        defaultCenter={mapCenter}
        defaultZoom={11}
        gestureHandling={'greedy'}
        disableDefaultUI={true}
      >
        {technicians.map((tech, index) => {
          const route = [tech.currentLocation, ...technicianAppointments(tech.id)];
          return (
            <React.Fragment key={tech.id}>
              <AdvancedMarker position={tech.currentLocation} title={tech.name}>
                <div className="flex flex-col items-center">
                    <span className="text-xs font-bold bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full shadow mb-1">{tech.name}</span>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{backgroundColor: techColors[index % techColors.length]}}>
                        <Wrench className="w-4 h-4 text-white"/>
                    </div>
                </div>
              </AdvancedMarker>
              
              {route.slice(1).map((pos, i) => (
                 <AdvancedMarker key={`${tech.id}-stop-${i}`} position={pos} title={`Parada ${i+1}`}>
                    <Pin background={'#E3F2FD'} borderColor={techColors[index % techColors.length]} glyphColor={techColors[index % techColors.length]} />
                </AdvancedMarker>
              ))}

              <Polyline
                path={route}
                strokeColor={techColors[index % techColors.length]}
                strokeOpacity={0.8}
                strokeWeight={3}
              />
            </React.Fragment>
          );
        })}
      </Map>
    </APIProvider>
  );
}
