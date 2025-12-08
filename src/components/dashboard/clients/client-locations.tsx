
"use client";

import { useState, useEffect, useRef } from 'react';
import type { ServiceLocation, Technician } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, QrCode as QrCodeIcon, Download, X, Edit } from 'lucide-react';
import QRCode from 'qrcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NewLocationForm } from './new-location-form';


const LocationCard = ({ location, technicians, onEdit }: { location: ServiceLocation, technicians: Technician[], onEdit: (location: ServiceLocation) => void }) => {
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
    const [isQrCodeDialogOpen, setIsQrCodeDialogOpen] = useState(false);

    const technicianName = location.technicianId 
        ? (technicians.find(t => t.id === location.technicianId) ? `${technicians.find(t => t.id === location.technicianId)?.firstName} ${technicians.find(t => t.id === location.technicianId)?.lastName}` : 'Não atribuído') 
        : 'Não atribuído';

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
                <p className="text-sm font-semibold"><span className="font-medium text-muted-foreground">Mensalidade:</span> {location.fee?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'N/A'}</p>

                
                <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setIsQrCodeDialogOpen(true)}>
                        <QrCodeIcon className="mr-2 h-4 w-4"/>
                        Ver QR Code
                    </Button>
                     <Button variant="secondary" size="sm" onClick={() => onEdit(location)}>
                        <Edit className="mr-2 h-4 w-4"/>
                        Editar
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
    
    const [editingLocation, setEditingLocation] = useState<ServiceLocation | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const handleEdit = (location: ServiceLocation) => {
        setEditingLocation(location);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setEditingLocation(null);
        setIsFormOpen(false);
    }
    
    if (locations.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-4">Nenhum local de atendimento cadastrado.</p>
    }

    return (
        <div className="space-y-4">
            {locations.map(location => (
                <LocationCard 
                    key={location.id} 
                    location={location} 
                    technicians={technicians}
                    onEdit={handleEdit}
                />
            ))}
             <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Local de Atendimento</DialogTitle>
                        <DialogDescription>Atualize os dados deste local.</DialogDescription>
                    </DialogHeader>
                    {editingLocation && (
                         <NewLocationForm 
                            clientId={editingLocation.clientId}
                            franchiseId={editingLocation.franchiseId}
                            technicians={technicians}
                            onSave={handleCloseForm}
                            locationToEdit={editingLocation}
                            onCancel={handleCloseForm}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
