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

    const handleDayChange = (dayId: string) => {
        setSelectedDays(prev => 
            prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
        );
    }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const clientData = {
        name: formData.get('name'),
        address: formData.get('address'),
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
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="name" className="text-right">
          Nome
        </Label>
        <Input id="name" name="name" className="col-span-3" required />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="address" className="text-right">
          Endereço
        </Label>
        <Textarea id="address" name="address" className="col-span-3" required />
      </div>
       <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="contractType" className="text-right">
            Contrato
        </Label>
        <Select name="contractType" required>
            <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
            </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="monthlyFee" className="text-right">
          Mensalidade
        </Label>
        <Input id="monthlyFee" name="monthlyFee" type="number" placeholder="R$" className="col-span-3" required />
      </div>
       <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="dueDate" className="text-right">
          Vencimento
        </Label>
        <Input id="dueDate" name="dueDate" type="number" placeholder="Dia do mês" min="1" max="31" className="col-span-3" required />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="technicianId" className="text-right">
          Técnico
        </Label>
         <Select name="technicianId">
            <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione um técnico" />
            </SelectTrigger>
            <SelectContent>
                {technicians.map(tech => (
                    <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                ))}
            </SelectContent>
        </Select>
      </div>
       <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">
                Dias de Visita
            </Label>
            <div className="col-span-3 grid grid-cols-2 gap-2">
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
      <div className="col-start-4 col-span-1">
        <Button type="submit">Salvar Cliente</Button>
      </div>
    </form>
  );
}
