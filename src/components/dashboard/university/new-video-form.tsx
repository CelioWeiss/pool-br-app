
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';

interface NewVideoFormProps {
    onSave: (data: { title: string; description: string; videoUrl: string }) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
}

export function NewVideoForm({ onSave, onCancel, isSaving }: NewVideoFormProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const { toast } = useToast();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !videoUrl) {
            toast({
                variant: 'destructive',
                title: 'Campos Obrigatórios',
                description: 'Título e URL do vídeo são obrigatórios.'
            });
            return;
        }
        onSave({ title, description, videoUrl });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
                <Label htmlFor="title">Título do Vídeo</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={isSaving} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="videoUrl">URL do Vídeo (YouTube)</Label>
                <Input id="videoUrl" placeholder="https://www.youtube.com/watch?v=..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} required disabled={isSaving} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isSaving} />
            </div>
            <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <><Spinner size="small" className="mr-2"/> Salvando...</> : "Salvar Vídeo"}
                </Button>
            </DialogFooter>
        </form>
    );
}

    