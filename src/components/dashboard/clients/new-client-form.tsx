
"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Client, ContractType } from '@/lib/types';
import { DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User, UploadCloud } from 'lucide-react';

export interface NewClientFormData extends Omit<Client, 'id' | 'userId' | 'franchiseId' | 'createdAt'> {
    password?: string;
}

interface NewClientFormProps {
  onSave: (data: NewClientFormData, clientId?: string) => void;
  onCancel: () => void;
  client?: Client | null;
  isSaving: boolean;
}

const contractTypes: { value: ContractType, label: string }[] = [
    { value: 'mensal', label: 'Mensal' },
    { value: 'quinzenal', label: 'Quinzenal' },
    { value: 'avulso', label: 'Avulso' },
]

export function NewClientForm({ onSave, onCancel, client = null, isSaving }: NewClientFormProps) {
    const { toast } = useToast();
    const avatarFileInputRef = useRef<HTMLInputElement>(null);
    const [name, setName] = useState('');
    const [contactName, setContactName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [monthlyFee, setMonthlyFee] = useState<number | string>('');
    const [dueDay, setDueDay] = useState<number | undefined>(undefined);
    const [contractType, setContractType] = useState<ContractType | undefined>(undefined);
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>('');


    const isEditing = !!client;
    const showPasswordFields = !isEditing || (isEditing && !client.userId);
    
    useEffect(() => {
        if (client) {
            setName(client.name);
            setContactName(client.contactName || '');
            setEmail(client.contactEmail || '');
            setPhone(client.contactPhone || '');
            setMonthlyFee(client.monthlyFee || '');
            setDueDay(client.dueDay || undefined);
            setContractType(client.contractType || undefined);
            setAvatarUrl(client.avatarUrl || '');
        } else {
            setName('');
            setContactName('');
            setEmail('');
            setPhone('');
            setPassword('');
            setConfirmPassword('');
            setMonthlyFee('');
            setDueDay(undefined);
            setContractType(undefined);
            setAvatarUrl('');
        }
    }, [client]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 1024 * 1024) { // 1MB limit
                toast({
                    variant: "destructive",
                    title: "Arquivo muito grande",
                    description: "Por favor, selecione uma imagem com menos de 1MB."
                });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };


    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (showPasswordFields && password !== confirmPassword) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'As senhas não coincidem.'
            });
            return;
        }

        const clientData: NewClientFormData = {
            name,
            contactName: contactName || name,
            contactPhone: phone,
            contactEmail: email,
            avatarUrl: avatarUrl,
            monthlyFee: Number(monthlyFee),
            dueDay: dueDay,
            contractType: contractType,
        };

        if (showPasswordFields) {
            clientData.password = password;
        }

        onSave(clientData, client?.id);
    };

    return (
        <form onSubmit={handleSubmit} className="grid gap-4 pt-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="grid gap-2 items-center grid-cols-3">
                <div className="flex flex-col items-center gap-2">
                     <Avatar className="h-20 w-20">
                        <AvatarImage src={avatarUrl} alt={name} />
                        <AvatarFallback><User className="h-10 w-10" /></AvatarFallback>
                    </Avatar>
                    <Button type="button" size="sm" variant="outline" onClick={() => avatarFileInputRef.current?.click()}>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Alterar
                    </Button>
                     <Input
                      id="avatarUrlInput"
                      ref={avatarFileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleFileChange}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nome do Cliente (Empresa ou Pessoa)</Label>
                        <Input id="name" value={name} onChange={e => setName(e.target.value)} required disabled={isSaving} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="contactName">Nome de Contato</Label>
                        <Input id="contactName" value={contactName} onChange={e => setContactName(e.target.value)} required disabled={isSaving} />
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="phone">Telefone de Contato</Label>
                    <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} required disabled={isSaving} />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="email">Email de Contato</Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={isSaving || (isEditing && !!client.userId) } />
                </div>
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
            </fieldset>

            {showPasswordFields && (
                <fieldset className="border-t pt-4 space-y-4">
                    <legend className="text-sm font-medium text-muted-foreground">{isEditing ? "Criar Acesso ao Portal" : "Acesso ao Portal do Cliente"}</legend>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required={showPasswordFields} disabled={isSaving}/>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required={showPasswordFields} disabled={isSaving}/>
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
