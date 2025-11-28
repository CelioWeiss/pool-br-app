
"use client";

import { useState, useEffect, useRef } from 'react';
import type { ServiceLocation, Technician } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, QrCode as QrCodeIcon, Download, X } from 'lucide-react';
import QRCode from 'qrcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const LocationCard = ({ location, technicianName }: { location: ServiceLocation, technicianName: string }) => {
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
    const [isQrCodeDialogOpen, setIsQrCodeDialogOpen] = useState(false);
    const qrCodeCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if(location.id) {
            QRCode.toDataURL(location.id, { width: 300, margin: 2 })
                .then(url => {
                    setQrCodeDataUrl(url);
                })
                .catch(err => {
                    console.error(err);
                });
        }
    }, [location.id]);
    
    const downloadQRCode = () => {
      const link = document.createElement('a');
      link.href = qrCodeDataUrl;
      link.download = `qrcode-cliente-${location.clientId}-local-${location.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
        <>
            <div className="border p-4 rounded-lg space-y-3">
                <div>
                    <h4 className="font-semibold text-base flex items-center gap-2"><MapPin className="h-4 w-4"/> {location.address}</h4>
                    <p className="text-sm text-muted-foreground">{location.city}, {location.state}</p>
                </div>
                <p className="text-sm"><span className="font-medium text-muted-foreground">Detalhes:</span> {location.poolDetails}</p>
                <p className="text-sm"><span className="font-medium text-muted-foreground">Técnico:</span> {technicianName}</p>
                <p className="text-sm"><span className="font-medium text-muted-foreground">Dias de visita:</span> {location.serviceDays.join(', ')}</p>
                
                <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setIsQrCodeDialogOpen(true)}>
                        <QrCodeIcon className="mr-2 h-4 w-4"/>
                        Ver QR Code
                    </Button>
                </div>
            </div>

             <Dialog open={isQrCodeDialogOpen} onOpenChange={setIsQrCodeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>QR Code do Local</DialogTitle>
                        <DialogDescription>{location.address}</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center p-4">
                        {qrCodeDataUrl && (
                            <img src={qrCodeDataUrl} alt={`QR Code for ${location.address}`} className="w-64 h-64" />
                        )}
                        <Button onClick={downloadQRCode} className="mt-4">
                            <Download className="mr-2 h-4 w-4" />
                            Baixar QR Code
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}


export function ClientLocations({ locations, technicians }: { locations: ServiceLocation[], technicians: Technician[] }) {
    
    const techniciansMap = new Map(technicians.map(t => [t.id, `${t.firstName} ${t.lastName}`]));

    if (locations.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-4">Nenhum local de atendimento cadastrado.</p>
    }

    return (
        <div className="space-y-4">
            {locations.map(location => (
                <LocationCard 
                    key={location.id} 
                    location={location} 
                    technicianName={location.technicianId ? techniciansMap.get(location.technicianId) || 'Não atribuído' : 'Não atribuído'} 
                />
            ))}
        </div>
    );
}
