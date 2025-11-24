"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from '@/components/ui/dialog';
import type { NewFranchiseData } from '@/lib/types';
import { users } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { states, cities } from '@/lib/brazil-locations';

interface NewFranchiseFormProps {
  onSave: (data: NewFranchiseData) => void;
  onCancel: () => void;
}

export function NewFranchiseForm({ onSave, onCancel }: NewFranchiseFormProps) {
    const [franchiseName, setFranchiseName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [selectedState, setSelectedState] = useState<string | undefined>(undefined);
    const [selectedCity, setSelectedCity] = useState<string | undefined>(undefined);

    const handleStateChange = (stateAbbr: string) => {
        setSelectedState(stateAbbr);
        setSelectedCity(undefined); // Reset city when state changes
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        // In a real app, you would create a new user or link an existing one.
        // For now, we'll create a placeholder user and use its ID.
        const ownerId = `user-owner-${Date.now()}`;
        const newOwner = {
            id: ownerId,
            name: ownerName,
            email: email,
            role: 'owner' as const,
            franchiseId: '', // Will be set later
            avatarUrl: ''
        };
        // This is a temporary solution for the demo. In a real app, you'd have a proper user management system.
        users.push(newOwner);

        const franchiseData: NewFranchiseData = {
            name: franchiseName,
            ownerId: ownerId,
            region: `${selectedCity}, ${selectedState}`,
        };
        onSave(franchiseData);
    };

    return (
        <form onSubmit={handleSubmit} className="grid gap-4 pt-4">
            <div className="grid gap-2">
                <Label htmlFor="franchiseName">Nome da Franquia</Label>
                <Input id="franchiseName" value={franchiseName} onChange={e => setFranchiseName(e.target.value)} placeholder="Ex: Pool BR - Campinas" required />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="ownerName">Nome do Responsável</Label>
                <Input id="ownerName" value={ownerName} onChange={e => setOwnerName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} required />
                </div>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="state">Estado</Label>
                    <Select value={selectedState} onValueChange={handleStateChange} required>
                        <SelectTrigger id="state">
                            <SelectValue placeholder="Selecione o estado" />
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
                    <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState} required>
                        <SelectTrigger id="city">
                            <SelectValue placeholder="Selecione a cidade" />
                        </SelectTrigger>
                        <SelectContent>
                            {selectedState && cities[selectedState]?.map(city => (
                                <SelectItem key={city} value={city}>{city}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            
            <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button type="submit">Salvar Franquia</Button>
            </DialogFooter>
        </form>
    );
}
