"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { Technician, Client, NewClientData, DayOfWeek } from '@/lib/types';
import { PlusCircle, X } from 'lucide-react';
import { DialogFooter } from '@/components/ui/dialog';

interface NewClientFormProps {
  technicians: Technician[];
  onSave: (data: NewClientData) => void;
  onCancel: () => void;
  client?: Client | null;
}

const daysOfWeek: { id: DayOfWeek; label: string }[] = [
  { id: 'segunda', label: 'Segunda' },
  { id: 'terca', label: 'Terça' },
  { id: 'quarta', label: 'Quarta' },
  { id: 'quinta', label: 'Quinta' },
  { id: 'sexta', label: 'Sexta' },
  { id: 'sabado', label: 'Sábado' },
];

export function NewClientForm({ technicians, onSave, onCancel, client = null }: NewClientFormProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [contractType, setContractType] = useState<string | undefined>(undefined);
    const [monthlyFee, setMonthlyFee] = useState<string>('');
    const [dueDate, setDueDate] = useState<string>('');
    const [technicianId, setTechnicianId] = useState<string | undefined>(undefined);
    const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);
    const [addresses, setAddresses] = useState<string[]>(['']);
    
    useEffect(() => {
        if (client) {
            setName(client.name);
            setEmail(client.email || '');
            setPhone(client.phone || '');
            setAddresses(client.address ? [client.address] : ['']);
            setContractType(client.contractType);
            setMonthlyFee(client.poolSize?.toString() || ''); // Assuming monthly fee was stored in poolSize
            setDueDate(client.dueDate?.toString() || '');
            setTechnicianId(client.assignedTechnicianId || undefined);
            setSelectedDays(client.visitDays || []);
        }
    }, [client]);

    const handleDayChange = (dayId: DayOfWeek) => {
        setSelectedDays(prev => 
            prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
        );
    }
    
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
            email,
            phone,
            address: addresses.join(', '), // For simplicity, joining addresses. A better model would handle multiple addresses.
            contractType: contractType as any,
            poolSize: Number(monthlyFee), // Re-using poolSize for monthlyFee
            dueDate: Number(dueDate),
            assignedTechnicianId: technicianId || null,
            visitDays: selectedDays,
        };
        onSave(clientData);
    };

    return (
        <form onSubmit={handleSubmit} className="grid gap-4 pt-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="grid gap-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
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
                <Label htmlFor="contractType">Contrato</Label>
                <Select value={contractType} onValueChange={setContractType} required>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="quinzenal">Quinzenal</SelectItem>
                        <SelectItem value="avulso">Avulso</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                <Label htmlFor="monthlyFee">Mensalidade</Label>
                <Input id="monthlyFee" type="number" placeholder="R$" value={monthlyFee} onChange={e => setMonthlyFee(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                <Label htmlFor="dueDate">Vencimento</Label>
                <Input id="dueDate" type="number" placeholder="Dia do mês" min="1" max="31" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                </div>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="technicianId">Técnico</Label>
                <Select value={technicianId} onValueChange={setTechnicianId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione um técnico" />
                    </SelectTrigger>
                    <SelectContent>
                        {technicians.map(tech => (
                            <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2">
                    <Label>Dias de Visita</Label>
                    <div className="grid grid-cols-3 gap-2 rounded-md border p-4">
                        {daysOfWeek.map(day => (
                            <div key={day.id} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={day.id} 
                                    checked={selectedDays.includes(day.id)}
                                    onCheckedChange={() => handleDayChange(day.id)}
                                />
                                <label
                                    htmlFor={day.id}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    {day.label}
                                </label>
                            </div>
                        ))}
                    </div>
            </div>
            <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button type="submit">Salvar Cliente</Button>
            </DialogFooter>
        </form>
    );
}
