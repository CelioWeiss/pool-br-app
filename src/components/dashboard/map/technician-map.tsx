"use client";

import React, { useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { Wrench } from 'lucide-react';
import type { Technician, Appointment, Client } from '@/lib/types';


function RoutePolyline({ route }: { route: google.maps.LatLngLiteral[] }) {
    const map = useMap();
  
    useEffect(() => {
      if (!map || !route || route.length < 2) return;
  
      const polyline = new google.maps.Polyline({
        path: route,
        strokeColor: "#1A237E",
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map: map,
      });
  
      return () => {
        polyline.setMap(null);
      };
    }, [map, route]);
  
    return null;
}


export function TechnicianMap({ apiKey, technicians, appointments, clients }: { apiKey: string, technicians: Technician[], appointments: Appointment[], clients: Client[] }) {
  const mapCenter = { lat: -23.55052, lng: -46.633308 }; // São Paulo center

  const technicianAppointments = (techId: string) => 
    appointments
      .filter(a => a.technicianId === techId && (a.status === 'scheduled' || a.status === 'in_progress'))
      .map(a => {
        const client = clients.find(c => c.id === a.clientId);
        if (!client || !client.locationLatitude || !client.locationLongitude) return null;
        return { lat: client.locationLatitude, lng: client.locationLongitude };
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
          if (!tech.locationLatitude || !tech.locationLongitude) return null;

          const currentLocation = { lat: tech.locationLatitude, lng: tech.locationLongitude };
          const route = [currentLocation, ...technicianAppointments(tech.id)];
          
          return (
            <React.Fragment key={tech.id}>
              <AdvancedMarker position={currentLocation} title={`${tech.firstName} ${tech.lastName}`}>
                <div className="flex flex-col items-center">
                    <span className="text-xs font-bold bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full shadow mb-1">{tech.firstName}</span>
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

              <RoutePolyline route={route} />
            </React.Fragment>
          );
        })}
      </Map>
    </APIProvider>
  );
}
