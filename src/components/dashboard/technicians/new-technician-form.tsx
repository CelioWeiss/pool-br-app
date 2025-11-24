
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';

export interface NewTechnicianFormData {
    name: string;
    email: string;
    phone: string;
    password: string;
}

interface NewTechnicianFormProps {
  onSave: (data: NewTechnicianFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function NewTechnicianForm({ onSave, onCancel, isSaving }: NewTechnicianFormProps) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const { toast } = useToast();

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

        onSave({
            name,
            email,
            phone,
            password,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="grid gap-4 pt-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="grid gap-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} required disabled={isSaving}/>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={isSaving}/>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} required disabled={isSaving}/>
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
            
            <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <><Spinner size="small" className="mr-2" /> Salvando...</> : "Salvar Técnico"}
                </Button>
            </DialogFooter>
        </form>
    );
}

