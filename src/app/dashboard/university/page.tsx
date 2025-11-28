
"use client";

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import type { UniversityVideo } from '@/lib/types';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { NewVideoForm } from '@/components/dashboard/university/new-video-form';
import { VideoCard } from '@/components/dashboard/university/video-card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function UniversityPage() {
    const { hasRole } = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const videosCollection = useMemoFirebase(() => 
        firestore ? collection(firestore, 'universityVideos') : null
    , [firestore]);
    
    const { data: videos, isLoading } = useCollection<UniversityVideo>(videosCollection);

    const [isNewVideoDialogOpen, setIsNewVideoDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [videoToDelete, setVideoToDelete] = useState<UniversityVideo | null>(null);

    const isMaster = hasRole('master');

    const handleSaveVideo = async (data: { title: string; description: string; videoUrl: string; }) => {
        if (!firestore) return;
        setIsSaving(true);
        
        try {
            const youtubeVideoId = new URL(data.videoUrl).searchParams.get('v');
            if (!youtubeVideoId) throw new Error("URL do YouTube inválida.");

            const thumbnailUrl = `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`;
            
            await addDoc(collection(firestore, 'universityVideos'), {
                ...data,
                thumbnailUrl,
                createdAt: new Date().toISOString(),
            });

            toast({
                title: "Vídeo Adicionado!",
                description: "O vídeo foi publicado na Universidade Pool BR.",
            });
            setIsNewVideoDialogOpen(false);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Erro ao Salvar",
                description: error.message || "Não foi possível adicionar o vídeo.",
            });
        } finally {
            setIsSaving(false);
        }
    }
    
    const handleDeleteVideo = async () => {
        if (!videoToDelete || !firestore) return;
        try {
            await deleteDoc(doc(firestore, 'universityVideos', videoToDelete.id));
            toast({
                title: "Vídeo Removido!",
                description: "O vídeo foi excluído com sucesso.",
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Erro ao Excluir",
                description: "Não foi possível remover o vídeo.",
            });
        } finally {
            setVideoToDelete(null);
        }
    }

    const sortedVideos = videos?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <>
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Universidade Pool BR</h1>
                        <p className="text-muted-foreground">Cursos, treinamentos e dicas para o sucesso da sua franquia.</p>
                    </div>
                    {isMaster && (
                         <Dialog open={isNewVideoDialogOpen} onOpenChange={setIsNewVideoDialogOpen}>
                            <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Novo Vídeo
                            </Button>
                            </DialogTrigger>
                            <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Adicionar Novo Vídeo</DialogTitle>
                                <DialogDescription>
                                    Preencha os dados e cole a URL de um vídeo do YouTube.
                                </DialogDescription>
                            </DialogHeader>
                                <NewVideoForm onSave={handleSaveVideo} isSaving={isSaving} onCancel={() => setIsNewVideoDialogOpen(false)} />
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                {isLoading && (
                    <div className="flex justify-center items-center h-64">
                        <Spinner size="large" />
                    </div>
                )}
                
                {!isLoading && (!sortedVideos || sortedVideos.length === 0) && (
                    <div className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-lg border-2 border-dashed">
                        <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
                        <h2 className="text-2xl font-semibold tracking-tight">Nenhum Conteúdo Disponível</h2>
                        <p className="text-muted-foreground mt-2">Ainda não há vídeos na Universidade. {isMaster ? 'Adicione o primeiro!' : 'Volte em breve.'}</p>
                    </div>
                )}

                {!isLoading && sortedVideos && sortedVideos.length > 0 && (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {sortedVideos.map(video => (
                            <VideoCard 
                                key={video.id} 
                                video={video} 
                                isMaster={isMaster} 
                                onDelete={() => setVideoToDelete(video)} 
                            />
                        ))}
                    </div>
                )}
            </div>
            
            <AlertDialog open={!!videoToDelete} onOpenChange={(open) => !open && setVideoToDelete(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente o vídeo
                    <span className="font-bold"> "{videoToDelete?.title}"</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setVideoToDelete(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteVideo}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

    