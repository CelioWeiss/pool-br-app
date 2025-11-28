
"use client";

import { useState } from 'react';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, addDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DialogFooter } from '@/components/ui/dialog';
import type { ServiceLocation, Technician, DayOfWeek } from '@/lib/types';
import { states, cities } from '@/lib/brazil-locations';
import { Spinner } from '@/components/ui/spinner';
import { v4 as uuidv4 } from 'uuid';

interface NewLocationFormProps {
    clientId: string;
    franchiseId: string;
    technicians: Technician[];
    onSave: () => void;
}

const daysOfWeek: { id: DayOfWeek, label: string }[] = [
    { id: 'segunda', label: 'Segunda' },
    { id: 'terca', label: 'Terça' },
    { id: 'quarta', label: 'Quarta' },
    { id: 'quinta', label: 'Quinta' },
    { id: 'sexta', label: 'Sexta' },
    { id: 'sabado', label: 'Sábado' },
    { id: 'domingo', label: 'Domingo' },
];

export function NewLocationForm({ clientId, franchiseId, technicians, onSave }: NewLocationFormProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const [address, setAddress] = useState('');
    const [selectedState, setSelectedState] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [poolDetails, setPoolDetails] = useState('');
    const [technicianId, setTechnicianId] = useState<string | null>(null);
    const [serviceDays, setServiceDays] = useState<DayOfWeek[]>([]);
    
    const handleStateChange = (stateAbbr: string) => {
        setSelectedState(stateAbbr);
        setSelectedCity(''); // Reset city when state changes
    };

    const handleServiceDayChange = (day: DayOfWeek, checked: boolean) => {
        setServiceDays(prev => 
            checked ? [...prev, day] : prev.filter(d => d !== day)
        );
    }
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !address || !selectedCity || !selectedState) {
            toast({
                variant: 'destructive',
                title: "Campos obrigatórios",
                description: "Endereço, cidade e estado são obrigatórios."
            });
            return;
        }

        setIsSaving(true);

        const newLocationId = uuidv4();
        const locationData: ServiceLocation = {
            id: newLocationId,
            clientId,
            franchiseId,
            address,
            city: selectedCity,
            state: selectedState,
            zipCode,
            poolDetails,
            technicianId,
            serviceDays,
            createdAt: new Date().toISOString(),
        };

        try {
            const locationRef = doc(firestore, `franchises/${franchiseId}/locations`, newLocationId);
            await addDoc(collection(firestore, `franchises/${franchiseId}/locations`), locationData);

            toast({
                title: "Local Adicionado!",
                description: "O novo local de atendimento foi salvo."
            });
            onSave();
        } catch (error) {
            console.error("Error adding service location:", error);
             const permissionError = new FirestorePermissionError({
                path: `franchises/${franchiseId}/locations`,
                operation: 'create',
                requestResourceData: locationData,
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({
                variant: "destructive",
                title: "Erro ao Salvar",
                description: "Não foi possível adicionar o novo local."
            });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="grid gap-4 pt-4 max-h-[70vh] overflow-y-auto px-1">
             <div className="grid gap-2">
                <Label htmlFor="address">Endereço Completo</Label>
                <Input id="address" value={address} onChange={e => setAddress(e.target.value)} required disabled={isSaving} placeholder="Rua, Número, Bairro"/>
            </div>

            <div className="grid grid-cols-2 gap-4">
                 <div className="grid gap-2">
                    <Label htmlFor="state">Estado</Label>
                    <Select value={selectedState} onValueChange={handleStateChange} required disabled={isSaving}>
                        <SelectTrigger id="state">
                            <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                            {states.map(state => (
                                <SelectItem key={state.abbr} value={state.abbr}>{state.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState || isSaving} required>
                        <SelectTrigger id="city">
                            <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                            {selectedState && cities[selectedState]?.map(city => (
                                <SelectItem key={city} value={city}>{city}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="poolDetails">Detalhes da Piscina</Label>
                <Input id="poolDetails" placeholder="Ex: 50,000L, fibra" value={poolDetails} onChange={e => setPoolDetails(e.target.value)} required disabled={isSaving}/>
            </div>
          
            <div className="grid gap-2">
                <Label htmlFor="technicianId">Técnico Responsável</Label>
                <Select value={technicianId ?? ''} onValueChange={(val) => setTechnicianId(val === 'none' ? null : val)} disabled={isSaving}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione um técnico" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {technicians.map(tech => (
                            <SelectItem key={tech.id} value={tech.id}>{tech.firstName} {tech.lastName}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            <div className="grid gap-2">
                <Label>Dias de Atendimento</Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                    {daysOfWeek.map(day => (
                        <div key={day.id} className="flex items-center space-x-2">
                            <Checkbox 
                                id={`loc-day-${day.id}`} 
                                checked={serviceDays.includes(day.id)}
                                onCheckedChange={(checked) => handleServiceDayChange(day.id, !!checked)}
                                disabled={isSaving}
                            />
                            <Label htmlFor={`loc-day-${day.id}`} className="font-normal capitalize">{day.label}</Label>
                        </div>
                    ))}
                </div>
            </div>
            
            <DialogFooter className="mt-4">
                 <Button type="button" variant="outline" onClick={onSave} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <><Spinner size="small" className="mr-2" /> Salvando...</> : "Salvar Local"}
                </Button>
            </DialogFooter>
        </form>
    )
}

    