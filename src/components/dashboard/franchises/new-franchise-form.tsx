"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from '@/components/ui/dialog';
import type { NewFranchiseData } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { states, cities } from '@/lib/brazil-locations';
import { useToast } from '@/hooks/use-toast';
import { setDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

interface NewFranchiseFormProps {
  onSave: (data: NewFranchiseData) => void;
  onCancel: () => void;
}

// THIS IS A TEMPORARY WORKAROUND FOR DEMO PURPOSES
// In a real app, user creation would be a separate, secure process.
async function createPlaceholderUser(firestore: any, ownerName: string, email: string, franchiseId: string) {
    const userId = `user-placeholder-${Date.now()}`;
    const userRef = doc(firestore, 'users', userId);
    const [firstName, lastName] = ownerName.split(' ');

    const newUser = {
        id: userId,
        franchiseId: franchiseId,
        firstName: firstName || '',
        lastName: lastName || '',
        email: email,
        role: 'owner',
        isActive: true,
        createdAt: new Date().toISOString(),
    };
    
    setDocumentNonBlocking(userRef, newUser, { merge: false });
    return userId;
}


export function NewFranchiseForm({ onSave, onCancel }: NewFranchiseFormProps) {
    const [franchiseName, setFranchiseName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [selectedState, setSelectedState] = useState<string | undefined>(undefined);
    const [selectedCity, setSelectedCity] = useState<string | undefined>(undefined);
    const { toast } = useToast();
    const firestore = useFirestore();


    const handleStateChange = (stateAbbr: string) => {
        setSelectedState(stateAbbr);
        setSelectedCity(undefined); // Reset city when state changes
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        if (!selectedCity || !selectedState) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Por favor, selecione estado e cidade.'
            })
            return;
        }

        // Placeholder for creating the user and getting the ID
        // In a real app, this would be a more complex flow, likely involving cloud functions
        // for secure user creation and role assignment.
        const tempFranchiseId = `franchise-placeholder-${Date.now()}`;
        const ownerId = await createPlaceholderUser(firestore, ownerName, email, tempFranchiseId);

        const franchiseData: NewFranchiseData = {
            name: franchiseName,
            address: `${selectedCity}, ${selectedState}`,
            ownerId: ownerId,
            contactEmail: email,
            contactPhone: phone,
            createdAt: new Date().toISOString(),
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
