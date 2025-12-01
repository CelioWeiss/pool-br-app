
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CameraOff, ScanLine, RefreshCw } from 'lucide-react';
import jsQR from 'jsqr';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { useRouter } from 'next/navigation';

export default function ScannerPage() {
    const { hasRole } = useAuth();
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [scannedData, setScannedData] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(true);
    const { toast } = useToast();
    const streamRef = useRef<MediaStream | null>(null);

    const getCameraPermission = useCallback(async () => {
        // Se já tiver uma stream, pare-a antes de pedir uma nova
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('A câmera não é suportada neste navegador.');
            }

            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: { ideal: "environment" } } 
            }).catch(async (err) => {
                console.warn("Falha ao acessar a câmera traseira, tentando a frontal...", err);
                return await navigator.mediaDevices.getUserMedia({ video: true });
            });
            
            streamRef.current = stream; // Armazena a stream na ref
            setHasCameraPermission(true);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Iniciar o vídeo manualmente é mais confiável em dispositivos móveis
                videoRef.current.play().catch(e => {
                    console.error("Video play failed:", e);
                    toast({
                        variant: 'destructive',
                        title: 'Erro ao iniciar câmera',
                        description: 'Não foi possível iniciar a visualização da câmera.',
                    });
                });
            }
        } catch (error) {
            console.error('Erro ao acessar a câmera:', error);
            setHasCameraPermission(false);
            toast({
                variant: 'destructive',
                title: 'Acesso à Câmera Negado',
                description: 'Por favor, habilite a permissão de câmera nas configurações do seu navegador e atualize a página.',
            });
        }
    }, [toast]);

    // Solicita permissão da câmera na montagem do componente
    useEffect(() => {
        getCameraPermission();

        // Cleanup: parar a stream de vídeo quando o componente desmonta
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [getCameraPermission]);

    // Lógica para escanear o frame do vídeo
    useEffect(() => {
        let animationFrameId: number;

        const tick = () => {
            if (!isScanning || !videoRef.current?.HAVE_ENOUGH_DATA || !canvasRef.current || !hasCameraPermission) {
                if (isScanning) {
                    animationFrameId = requestAnimationFrame(tick);
                }
                return;
            }
            
            const canvas = canvasRef.current;
            const video = videoRef.current;
            const context = canvas.getContext('2d');

            if (context) {
                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                try {
                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "dontInvert",
                    });

                    if (code?.data) {
                        setScannedData(code.data);
                        setIsScanning(false);
                        if (navigator.vibrate) {
                            navigator.vibrate(200);
                        }
                        // Após escanear, redireciona para a página de relatório
                        router.push(`/relatorio/${code.data}`);
                    }
                } catch (e) {
                    console.error("Erro no processamento do jsQR", e);
                }
            }
            
            if (isScanning) {
                animationFrameId = requestAnimationFrame(tick);
            }
        };
        
        animationFrameId = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [isScanning, hasCameraPermission, router]);
    
    if (!hasRole('technician')) {
        return <p>Acesso negado.</p>;
    }

    const handleRescan = () => {
        setScannedData(null);
        setIsScanning(true);
        // Garante que o vídeo volte a tocar
        getCameraPermission(); // Re-solicita para garantir que a stream está ativa
    };

    return (
        <div className="space-y-8">
             <div>
                <h1 className="text-3xl font-bold tracking-tight">Leitor de QR Code</h1>
                <p className="text-muted-foreground">Aponte a câmera para um QR Code para iniciar o atendimento.</p>
            </div>

            <Card className="max-w-xl mx-auto">
                <CardHeader>
                    <CardTitle>Scanner</CardTitle>
                    <CardDescription>
                        {scannedData ? 'QR Code lido! Redirecionando...' : 'Aguardando leitura do QR Code...'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
                        {hasCameraPermission === null && (
                            <div className="flex h-full w-full flex-col items-center justify-center">
                                <Spinner size="large" />
                                <p className="mt-4 text-muted-foreground">Solicitando acesso à câmera...</p>
                            </div>
                        )}
                        {hasCameraPermission === false && (
                             <div className="flex h-full w-full flex-col items-center justify-center text-center p-4">
                                <CameraOff className="h-16 w-16 text-destructive" />
                                <Alert variant="destructive" className="mt-4">
                                    <AlertTitle>Acesso à Câmera Necessário</AlertTitle>
                                    <AlertDescription>
                                        Para escanear QR Codes, você precisa permitir o acesso à câmera. Por favor, ative a permissão nas configurações do seu navegador e atualize a página.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}
                        {hasCameraPermission && (
                            <>
                                <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
                                <canvas ref={canvasRef} className="hidden" />
                                {isScanning && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="h-64 w-64 rounded-lg border-4 border-dashed border-primary" />
                                         <ScanLine className="absolute h-64 w-64 text-primary/50 animate-pulse"/>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    {scannedData && (
                        <div className="mt-6 space-y-4">
                            <Alert>
                                <AlertTitle>Redirecionando para Atendimento:</AlertTitle>
                                <AlertDescription className="break-all font-mono text-base">
                                    ID: {scannedData}
                                </AlertDescription>
                            </Alert>
                             <Button onClick={handleRescan} className="w-full">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Escanear Novamente
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    );
}
