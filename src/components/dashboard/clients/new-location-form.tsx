
"use client";

import { useState, useEffect } from 'react';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, addDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
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
import { Separator } from '@/components/ui/separator';

interface NewLocationFormProps {
    clientId: string;
    franchiseId: string;
    technicians: Technician[];
    onSave: () => void;
    onCancel: () => void;
    locationToEdit?: ServiceLocation | null;
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

export function NewLocationForm({ clientId, franchiseId, technicians, onSave, onCancel, locationToEdit = null }: NewLocationFormProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const isEditing = !!locationToEdit;

    const [address, setAddress] = useState('');
    const [selectedState, setSelectedState] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [poolDetails, setPoolDetails] = useState('');
    const [technicianId, setTechnicianId] = useState<string | null>(null);
    const [serviceDays, setServiceDays] = useState<DayOfWeek[]>([]);
    const [fee, setFee] = useState<number | ''>('');
    const [dueDay, setDueDay] = useState<number | ''>('');
    
    useEffect(() => {
        if (locationToEdit) {
            setAddress(locationToEdit.address || '');
            setSelectedState(locationToEdit.state || '');
            setSelectedCity(locationToEdit.city || '');
            setZipCode(locationToEdit.zipCode || '');
            setPoolDetails(locationToEdit.poolDetails || '');
            setTechnicianId(locationToEdit.technicianId || null);
            setServiceDays(locationToEdit.serviceDays || []);
            setFee(locationToEdit.fee || '');
            setDueDay(locationToEdit.dueDay || '');
        }
    }, [locationToEdit]);


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

        const locationData: Omit<ServiceLocation, 'id' | 'createdAt' | 'clientId' | 'franchiseId'> & { clientId: string, franchiseId: string } = {
            clientId,
            franchiseId,
            address,
            city: selectedCity,
            state: selectedState,
            zipCode,
            poolDetails,
            technicianId,
            serviceDays,
            fee: fee ? Number(fee) : undefined,
            dueDay: dueDay ? Number(dueDay) : undefined,
        };

        try {
            if (isEditing && locationToEdit.id) {
                 const locationRef = doc(firestore, `franchises/${franchiseId}/locations`, locationToEdit.id);
                 await updateDoc(locationRef, locationData);
                  toast({
                    title: "Local Atualizado!",
                    description: "O local de atendimento foi atualizado."
                });
            } else {
                const newLocationId = uuidv4();
                const locationRef = doc(firestore, `franchises/${franchiseId}/locations`, newLocationId);
                await setDoc(locationRef, { ...locationData, id: newLocationId, createdAt: new Date().toISOString() });
                 toast({
                    title: "Local Adicionado!",
                    description: "O novo local de atendimento foi salvo."
                });
            }

            onSave();
        } catch (error) {
            console.error("Error saving service location:", error);
             const permissionError = new FirestorePermissionError({
                path: `franchises/${franchiseId}/locations`,
                operation: isEditing ? 'update' : 'create',
                requestResourceData: locationData,
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({
                variant: "destructive",
                title: "Erro ao Salvar",
                description: "Não foi possível salvar o local."
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

            <Separator />
            
            <fieldset className="space-y-4">
                <legend className="text-sm font-medium text-muted-foreground">Dados Financeiros (para este local)</legend>
                <div className="grid grid-cols-2 gap-4">
                     <div className="grid gap-2">
                        <Label htmlFor="fee">Valor da Mensalidade (R$)</Label>
                        <Input id="fee" type="number" value={fee} onChange={e => setFee(Number(e.target.value))} disabled={isSaving}/>
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="dueDay">Dia do Vencimento</Label>
                        <Input id="dueDay" type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(Number(e.target.value))} disabled={isSaving}/>
                    </div>
                </div>
            </fieldset>
            
            <DialogFooter className="mt-4">
                 <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <><Spinner size="small" className="mr-2" /> Salvando...</> : isEditing ? "Salvar Alterações" : "Salvar Local"}
                </Button>
            </DialogFooter>
        </form>
    )
}
