
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Technician, Client, ContractType, DayOfWeek } from '@/lib/types';
import { PlusCircle, X } from 'lucide-react';
import { DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export interface NewClientFormData extends Omit<Client, 'id' | 'userId' | 'franchiseId' | 'createdAt'> {
    password?: string;
}

interface NewClientFormProps {
  technicians: Technician[];
  onSave: (data: NewClientFormData) => void;
  onCancel: () => void;
  client?: Client | null;
  isSaving: boolean;
}

const contractTypes: { value: ContractType, label: string }[] = [
    { value: 'mensal', label: 'Mensal' },
    { value: 'quinzenal', label: 'Quinzenal' },
    { value: 'avulso', label: 'Avulso' },
]

const daysOfWeek: { id: DayOfWeek, label: string }[] = [
    { id: 'domingo', label: 'Domingo' },
    { id: 'segunda', label: 'Segunda' },
    { id: 'terca', label: 'Terça' },
    { id: 'quarta', label: 'Quarta' },
    { id: 'quinta', label: 'Quinta' },
    { id: 'sexta', label: 'Sexta' },
    { id: 'sabado', label: 'Sábado' },
];

export function NewClientForm({ technicians, onSave, onCancel, client = null, isSaving }: NewClientFormProps) {
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [poolDetails, setPoolDetails] = useState('');
    const [technicianId, setTechnicianId] = useState<string | undefined>(undefined);
    const [address, setAddress] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [monthlyFee, setMonthlyFee] = useState<number | string>('');
    const [dueDay, setDueDay] = useState<number | undefined>(undefined);
    const [contractType, setContractType] = useState<ContractType | undefined>(undefined);
    const [serviceDays, setServiceDays] = useState<DayOfWeek[]>([]);


    const isEditing = !!client;
    
    useEffect(() => {
        if (client) {
            setName(client.name);
            setEmail(client.contactEmail || '');
            setPhone(client.contactPhone || '');
            setAddress(client.address || '');
            setPoolDetails(client.poolDetails || '');
            setTechnicianId(client.technicianId || undefined);
            setMonthlyFee(client.monthlyFee || '');
            setDueDay(client.dueDay || undefined);
            setContractType(client.contractType || undefined);
            setServiceDays(client.serviceDays || []);
        } else {
            setName('');
            setEmail('');
            setPhone('');
            setAddress('');
            setPoolDetails('');
            setTechnicianId(undefined);
            setPassword('');
            setConfirmPassword('');
            setMonthlyFee('');
            setDueDay(undefined);
            setContractType(undefined);
            setServiceDays([]);
        }
    }, [client]);
    
    const handleServiceDayChange = (day: DayOfWeek, checked: boolean) => {
        setServiceDays(prev => 
            checked ? [...prev, day] : prev.filter(d => d !== day)
        );
    }

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!isEditing && password !== confirmPassword) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'As senhas não coincidem.'
            });
            return;
        }

        const clientData: NewClientFormData = {
            name,
            contactEmail: email,
            contactName: name,
            contactPhone: phone,
            address: address,
            poolDetails: poolDetails,
            technicianId: technicianId || null,
            monthlyFee: Number(monthlyFee),
            dueDay: dueDay,
            contractType: contractType,
            serviceDays: serviceDays,
        };

        if (!isEditing) {
            clientData.password = password;
        }

        onSave(clientData);
    };

    return (
        <form onSubmit={handleSubmit} className="grid gap-4 pt-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="grid gap-2">
                <Label htmlFor="name">Nome do Cliente</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} required disabled={isSaving} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="email">Email de Contato</Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={isSaving || isEditing} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="phone">Telefone de Contato</Label>
                    <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} required disabled={isSaving} />
                </div>
            </div>

            <div className="grid gap-2">
                <Label>Endereço</Label>
                <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Endereço completo"
                    required
                    disabled={isSaving}
                />
            </div>
            
            <div className="grid gap-2">
                <Label htmlFor="poolDetails">Detalhes da Piscina</Label>
                <Input id="poolDetails" placeholder="Ex: 50,000L, fibra" value={poolDetails} onChange={e => setPoolDetails(e.target.value)} required disabled={isSaving}/>
            </div>
          
            <div className="grid gap-2">
                <Label htmlFor="technicianId">Técnico Responsável</Label>
                <Select value={technicianId} onValueChange={setTechnicianId} disabled={isSaving}>
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

            <fieldset className="border-t pt-4 space-y-4">
                <legend className="text-sm font-medium text-muted-foreground">Detalhes do Contrato</legend>
                <div className="grid grid-cols-2 gap-4">
                     <div className="grid gap-2">
                        <Label htmlFor="monthlyFee">Mensalidade (R$)</Label>
                        <Input id="monthlyFee" type="number" placeholder="Ex: 300" value={monthlyFee} onChange={e => setMonthlyFee(e.target.value)} disabled={isSaving} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="dueDay">Dia do Vencimento</Label>
                        <Select value={dueDay?.toString()} onValueChange={(val) => setDueDay(Number(val))} disabled={isSaving}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                    <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="contractType">Tipo de Contrato</Label>
                     <Select value={contractType} onValueChange={(val: ContractType) => setContractType(val)} disabled={isSaving}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            {contractTypes.map(type => (
                                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
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
                                    id={`day-${day.id}`} 
                                    checked={serviceDays.includes(day.id)}
                                    onCheckedChange={(checked) => handleServiceDayChange(day.id, !!checked)}
                                    disabled={isSaving}
                                />
                                <Label htmlFor={`day-${day.id}`} className="font-normal capitalize">{day.label}</Label>
                            </div>
                        ))}
                    </div>
                </div>
            </fieldset>

            {!isEditing && (
                <fieldset className="border-t pt-4 space-y-4">
                    <legend className="text-sm font-medium text-muted-foreground">Acesso ao Portal do Cliente</legend>
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
            )}
            
            <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar Cliente'}</Button>
            </DialogFooter>
        </form>
    );
}
