
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { states, cities } from '@/lib/brazil-locations';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';

export interface NewFranchiseFormData {
    franchiseName: string;
    ownerName: string;
    ownerEmail: string;
    ownerPhone: string;
    password: string;
    state: string;
    city: string;
}

interface NewFranchiseFormProps {
  onSave: (data: NewFranchiseFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function NewFranchiseForm({ onSave, onCancel, isSaving }: NewFranchiseFormProps) {
    const [franchiseName, setFranchiseName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [ownerPhone, setOwnerPhone] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [selectedState, setSelectedState] = useState<string | undefined>(undefined);
    const [selectedCity, setSelectedCity] = useState<string | undefined>(undefined);
    const { toast } = useToast();

    const handleStateChange = (stateAbbr: string) => {
        setSelectedState(stateAbbr);
        setSelectedCity(undefined); // Reset city when state changes
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        if (password !== confirmPassword) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'As senhas não coincidem.'
            });
            return;
        }

        if (!selectedCity || !selectedState) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Por favor, selecione estado e cidade.'
            })
            return;
        }

        onSave({
            franchiseName,
            ownerName,
            ownerEmail,
            ownerPhone,
            password,
            state: selectedState,
            city: selectedCity,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="grid gap-4 pt-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="grid gap-2">
                <Label htmlFor="franchiseName">Nome da Franquia</Label>
                <Input id="franchiseName" value={franchiseName} onChange={e => setFranchiseName(e.target.value)} placeholder="Ex: Pool BR - Campinas" required disabled={isSaving}/>
            </div>
            
            <fieldset className="border-t pt-4 space-y-4">
                <legend className="text-sm font-medium text-muted-foreground">Dados do Proprietário</legend>
                <div className="grid gap-2">
                    <Label htmlFor="ownerName">Nome Completo</Label>
                    <Input id="ownerName" value={ownerName} onChange={e => setOwnerName(e.target.value)} required disabled={isSaving}/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="ownerEmail">Email</Label>
                        <Input id="ownerEmail" type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} required disabled={isSaving}/>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="ownerPhone">Telefone</Label>
                        <Input id="ownerPhone" value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} required disabled={isSaving}/>
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="password">Senha</Label>
                        <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required disabled={isSaving}/>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                        <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required disabled={isSaving}/>
                    </div>
                </div>
            </fieldset>

             <fieldset className="border-t pt-4 space-y-4">
                <legend className="text-sm font-medium text-muted-foreground">Localização da Franquia</legend>
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
            </fieldset>
            
            <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <><Spinner size="small" className="mr-2" /> Salvando...</> : "Salvar Franquia"}
                </Button>
            </DialogFooter>
        </form>
    );
}
