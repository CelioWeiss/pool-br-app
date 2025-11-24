"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Technician, Client, NewClientData } from '@/lib/types';
import { PlusCircle, X } from 'lucide-react';
import { DialogFooter } from '@/components/ui/dialog';

interface NewClientFormProps {
  technicians: Technician[];
  onSave: (data: NewClientData) => void;
  onCancel: () => void;
  client?: Client | null;
}

export function NewClientForm({ technicians, onSave, onCancel, client = null }: NewClientFormProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [poolDetails, setPoolDetails] = useState('');
    const [technicianId, setTechnicianId] = useState<string | undefined>(undefined);
    const [addresses, setAddresses] = useState<string[]>(['']);
    
    useEffect(() => {
        if (client) {
            setName(client.name);
            setEmail(client.contactEmail || '');
            setPhone(client.contactPhone || '');
            setAddresses(client.address ? client.address.split('; ') : ['']);
            setPoolDetails(client.poolDetails || '');
            setTechnicianId(client.technicianId || undefined);
        } else {
            setName('');
            setEmail('');
            setPhone('');
            setAddresses(['']);
            setPoolDetails('');
            setTechnicianId(undefined);
        }
    }, [client]);

    const handleAddressChange = (index: number, value: string) => {
        const newAddresses = [...addresses];
        newAddresses[index] = value;
        setAddresses(newAddresses);
    };

    const addAddress = () => {
        setAddresses([...addresses, '']);
    };

    const removeAddress = (index: number) => {
        if (addresses.length > 1) {
            const newAddresses = addresses.filter((_, i) => i !== index);
            setAddresses(newAddresses);
        }
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const clientData: NewClientData = {
            name,
            contactEmail: email,
            contactName: name, // Assuming contact name is the client name for now
            contactPhone: phone,
            address: addresses.join('; '), // Use a separator for multiple addresses
            poolDetails: poolDetails,
            technicianId: technicianId || null,
            createdAt: new Date().toISOString(),
        };
        onSave(clientData);
    };

    return (
        <form onSubmit={handleSubmit} className="grid gap-4 pt-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="grid gap-2">
                <Label htmlFor="name">Nome do Cliente</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="email">Email de Contato</Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="phone">Telefone de Contato</Label>
                    <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} required />
                </div>
            </div>

            <div className="grid gap-2">
                <Label>Endereços</Label>
                {addresses.map((address, index) => (
                <div key={index} className="flex items-center gap-2">
                    <Input
                    value={address}
                    onChange={(e) => handleAddressChange(index, e.target.value)}
                    placeholder={`Endereço ${index + 1}`}
                    required
                    />
                    {addresses.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeAddress(index)}>
                        <X className="h-4 w-4" />
                    </Button>
                    )}
                </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addAddress} className="mt-2 w-fit">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Endereço
                </Button>
            </div>
            
            <div className="grid gap-2">
                <Label htmlFor="poolDetails">Detalhes da Piscina</Label>
                <Input id="poolDetails" placeholder="Ex: 50,000L, fibra" value={poolDetails} onChange={e => setPoolDetails(e.target.value)} required />
            </div>
          
            <div className="grid gap-2">
                <Label htmlFor="technicianId">Técnico Responsável</Label>
                <Select value={technicianId} onValueChange={setTechnicianId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione um técnico" />
                    </SelectTrigger>
                    <SelectContent>
                        {technicians.map(tech => (
                            <SelectItem key={tech.id} value={tech.id}>{tech.firstName} {tech.lastName}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button type="submit">Salvar Cliente</Button>
            </DialogFooter>
        </form>
    );
}
