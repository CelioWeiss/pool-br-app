
"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Client } from '@/lib/types';
import { DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User, UploadCloud } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export interface NewClientFormData extends Omit<Client, 'id' | 'userId' | 'franchiseId' | 'createdAt' | 'contractDetails'> {
    password?: string;
}

interface NewClientFormProps {
  onSave: (data: NewClientFormData, clientId?: string) => void;
  onCancel: () => void;
  client?: Client | null;
  isSaving: boolean;
}

export function NewClientForm({ onSave, onCancel, client = null, isSaving }: NewClientFormProps) {
    const { toast } = useToast();
    const avatarFileInputRef = useRef<HTMLInputElement>(null);
    const [name, setName] = useState('');
    const [contactName, setContactName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');


    const isEditing = !!client;
    const showPasswordFields = !isEditing || (isEditing && !client.userId);
    
    useEffect(() => {
        if (client) {
            setName(client.name);
            setContactName(client.contactName || '');
            setEmail(client.contactEmail || '');
            setPhone(client.contactPhone || '');
            setAvatarUrl(client.avatarUrl || '');
        } else {
            setName('');
            setContactName('');
            setEmail('');
            setPhone('');
            setPassword('');
            setConfirmPassword('');
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
            isActive: client?.isActive ?? true,
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
                        <AvatarImage src={avatarUrl || undefined} alt={name} />
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
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={isSaving} />
                </div>
            </div>

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
