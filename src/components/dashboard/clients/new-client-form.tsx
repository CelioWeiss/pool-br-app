"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { Technician } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, X } from 'lucide-react';

interface NewClientFormProps {
  technicians: Technician[];
  onClientCreated: () => void;
}

const daysOfWeek = [
  { id: 'segunda', label: 'Segunda-feira' },
  { id: 'terca', label: 'Terça-feira' },
  { id: 'quarta', label: 'Quarta-feira' },
  { id: 'quinta', label: 'Quinta-feira' },
  { id: 'sexta', label: 'Sexta-feira' },
  { id: 'sabado', label: 'Sábado' },
  { id: 'domingo', label: 'Domingo' },
];

export function NewClientForm({ technicians, onClientCreated }: NewClientFormProps) {
    const { toast } = useToast();
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [addresses, setAddresses] = useState<string[]>(['']);

    const handleDayChange = (dayId: string) => {
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
        const newAddresses = addresses.filter((_, i) => i !== index);
        setAddresses(newAddresses);
    };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const clientData = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        addresses: addresses.filter(addr => addr.trim() !== ''),
        contractType: formData.get('contractType'),
        monthlyFee: formData.get('monthlyFee'),
        dueDate: formData.get('dueDate'),
        technicianId: formData.get('technicianId'),
        visitDays: selectedDays,
    };
    console.log("Novo cliente:", clientData);
    toast({
        title: "Cliente Criado!",
        description: "O novo cliente foi adicionado com sucesso.",
    });
    onClientCreated();
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 py-4">
      <div className="grid gap-4">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required />
      </div>

      <div className="grid grid-cols-2 gap-4">
         <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
        </div>
        <div className="grid gap-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" required />
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
        <Button type="button" variant="outline" size="sm" onClick={addAddress} className="mt-2">
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Endereço
        </Button>
      </div>

       <div className="grid gap-4">
        <Label htmlFor="contractType">Contrato</Label>
        <Select name="contractType" required>
            <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
            </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="monthlyFee">Mensalidade</Label>
          <Input id="monthlyFee" name="monthlyFee" type="number" placeholder="R$" required />
        </div>
         <div className="grid gap-2">
          <Label htmlFor="dueDate">Vencimento</Label>
          <Input id="dueDate" name="dueDate" type="number" placeholder="Dia do mês" min="1" max="31" required />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="technicianId">Técnico</Label>
         <Select name="technicianId">
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
      <div className="flex justify-end">
        <Button type="submit">Salvar Cliente</Button>
      </div>
    </form>
  );
}
