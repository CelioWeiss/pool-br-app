
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import type { Client, Quote } from '@/lib/types';
import { PlusCircle, X, Trash2 } from 'lucide-react';
import { DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export interface NewQuoteFormData extends Omit<Quote, 'id' | 'franchiseId' | 'totalValue' | 'status' | 'createdAt'> {}

interface NewQuoteFormProps {
  clients: Client[];
  onSave: (data: NewQuoteFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
}

const standardServices = [
    "Limpeza de piscina mensal",
    "Limpeza avulsa",
    "Recuperação de água verde",
    "Remoção e instalação de motor",
    "Instalação de capa",
    "Manutenção Hidráulica",
];

const abntNote = "Importante: Nossos serviços de tratamento de água seguem rigorosamente as normas técnicas da ABNT, incluindo NBR 10818, 10339 e outras legislações pertinentes para garantir a máxima qualidade e segurança.";
const cleaningDetailsNote = "O serviço de limpeza inclui: Limpeza Física (aspiração, peneiração, escovação, limpeza de bordas), leituras dos parâmetros e correção se necessário conforme as normas vigentes, limpeza de pré-filtro, retrolavagem ou limpeza do filtro de poliéster.";

export function NewQuoteForm({ clients, onSave, onCancel, isSaving }: NewQuoteFormProps) {
    const { toast } = useToast();
    const [clientType, setClientType] = useState<'existing' | 'new'>('existing');
    const [selectedClientId, setSelectedClientId] = useState<string | undefined>();
    
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');

    const [items, setItems] = useState<{ service: string; price: number }[]>([{ service: '', price: 0 }]);
    const [customService, setCustomService] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (clientType === 'existing' && selectedClientId) {
            const client = clients.find(c => c.id === selectedClientId);
            if (client) {
                setClientName(client.name);
                setClientEmail(client.contactEmail || '');
                setClientPhone(client.contactPhone || '');
            }
        } else {
            setClientName('');
            setClientEmail('');
            setClientPhone('');
        }
    }, [clientType, selectedClientId, clients]);

    useEffect(() => {
        const hasSpecialService = items.some(item => 
            item.service.includes("Limpeza") || item.service.includes("Recuperação de água")
        );
        const hasCleaningService = items.some(item =>
            item.service === "Limpeza de piscina mensal" || item.service === "Limpeza avulsa"
        );

        let combinedNotes = [];
        if (hasSpecialService) combinedNotes.push(abntNote);
        if (hasCleaningService) combinedNotes.push(cleaningDetailsNote);

        setNotes(combinedNotes.join('\n\n'));
    }, [items]);


    const handleAddItem = () => {
        setItems([...items, { service: '', price: 0 }]);
    };
    
    const handleAddCustomService = () => {
        if (customService.trim()) {
            setItems([...items, { service: customService, price: 0 }]);
            setCustomService('');
        }
    };

    const handleItemChange = (index: number, field: 'service' | 'price', value: string | number) => {
        const newItems = [...items];
        if (field === 'price') {
            newItems[index][field] = Number(value) || 0;
        } else {
            newItems[index][field] = value as string;
        }
        setItems(newItems);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const totalValue = useMemo(() => items.reduce((sum, item) => sum + item.price, 0), [items]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!clientName) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'O nome do cliente é obrigatório.'
            });
            return;
        }
        if (items.length === 0 || items.every(i => !i.service || i.price <= 0)) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Adicione pelo menos um item válido ao orçamento.'
            });
            return;
        }

        const quoteData: NewQuoteFormData = {
            clientId: clientType === 'existing' ? selectedClientId : undefined,
            clientName,
            clientEmail,
            clientPhone,
            items: items.filter(i => i.service && i.price > 0),
            notes,
        };

        onSave(quoteData);
    };

    return (
        <form onSubmit={handleSubmit} className="grid gap-6 pt-4 max-h-[75vh] overflow-y-auto px-1">
            
            <fieldset className="space-y-4">
                <Label className="text-base font-medium">Dados do Cliente</Label>
                <RadioGroup value={clientType} onValueChange={(value: 'existing' | 'new') => setClientType(value)} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="existing" id="existing" />
                        <Label htmlFor="existing" className="font-normal">Cliente da Base</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="new" id="new" />
                        <Label htmlFor="new" className="font-normal">Novo Cliente</Label>
                    </div>
                </RadioGroup>

                {clientType === 'existing' ? (
                    <Select value={selectedClientId} onValueChange={setSelectedClientId} disabled={isSaving}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione um cliente da base" />
                        </SelectTrigger>
                        <SelectContent>
                            {clients.map(client => (
                                <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md bg-muted/50">
                        <div className="grid gap-2">
                            <Label htmlFor="new-client-name">Nome</Label>
                            <Input id="new-client-name" value={clientName} onChange={e => setClientName(e.target.value)} required disabled={isSaving} />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="new-client-email">Email</Label>
                            <Input id="new-client-email" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} disabled={isSaving} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="new-client-phone">Telefone</Label>
                            <Input id="new-client-phone" value={clientPhone} onChange={e => setClientPhone(e.target.value)} required disabled={isSaving} />
                        </div>
                    </div>
                )}
            </fieldset>

            <Separator />

            <fieldset className="space-y-4">
                 <Label className="text-base font-medium">Itens do Orçamento</Label>
                 <div className="space-y-4">
                    {items.map((item, index) => (
                        <div key={index} className="flex items-end gap-2">
                           <div className="flex-1 grid gap-2">
                             <Label htmlFor={`service-${index}`}>Serviço</Label>
                             <Select value={item.service} onValueChange={(value) => handleItemChange(index, 'service', value)}>
                                <SelectTrigger id={`service-${index}`}>
                                    <SelectValue placeholder="Selecione um serviço" />
                                </SelectTrigger>
                                <SelectContent>
                                    {standardServices.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    {/* Handle custom items added */}
                                    {items.filter(i => !standardServices.includes(i.service) && i.service).map(i => (
                                        <SelectItem key={i.service} value={i.service}>{i.service}</SelectItem>
                                    ))}
                                </SelectContent>
                             </Select>
                           </div>
                            <div className="grid gap-2 w-32">
                                <Label htmlFor={`price-${index}`}>Valor (R$)</Label>
                                <Input id={`price-${index}`} type="number" value={item.price} onChange={e => handleItemChange(index, 'price', e.target.value)} required />
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                 </div>

                <div className="flex items-end gap-2 pt-4 border-t">
                    <div className="flex-1 grid gap-2">
                        <Label htmlFor="custom-service">Adicionar outro serviço</Label>
                        <Input id="custom-service" placeholder="Digite o nome do serviço personalizado" value={customService} onChange={e => setCustomService(e.target.value)} />
                    </div>
                    <Button type="button" variant="secondary" onClick={handleAddCustomService}><PlusCircle className="mr-2 h-4 w-4"/> Adicionar</Button>
                </div>

            </fieldset>
            
            <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={8}/>
            </div>

            <Separator />
            
            <div className="flex justify-end items-center gap-4">
                <span className="text-lg font-semibold">Total do Orçamento:</span>
                <span className="text-2xl font-bold text-primary">
                    {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
            </div>
            
            <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar Orçamento'}</Button>
            </DialogFooter>
        </form>
    );
}
