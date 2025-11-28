
"use client";

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CameraOff, ScanLine, RefreshCw } from 'lucide-react';
import jsQR from 'jsqr';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';

export default function ScannerPage() {
    const { hasRole } = useAuth();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [scannedData, setScannedData] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const getCameraPermission = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                setHasCameraPermission(true);

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.error('Error accessing camera:', error);
                setHasCameraPermission(false);
                toast({
                    variant: 'destructive',
                    title: 'Acesso à Câmera Negado',
                    description: 'Por favor, habilite a permissão de câmera nas configurações do seu navegador.',
                });
            }
        };

        getCameraPermission();

        // Cleanup: stop video stream when component unmounts
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [toast]);

    useEffect(() => {
        let animationFrameId: number;

        const tick = () => {
            if (!isScanning || !videoRef.current || !canvasRef.current || !hasCameraPermission) {
                return;
            }

            if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                const canvas = canvasRef.current;
                const video = videoRef.current;
                const context = canvas.getContext('2d');

                if (context) {
                    canvas.height = video.videoHeight;
                    canvas.width = video.videoWidth;
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "dontInvert",
                    });

                    if (code) {
                        setScannedData(code.data);
                        setIsScanning(false);
                        // Optional: vibrate on successful scan
                        if (navigator.vibrate) {
                            navigator.vibrate(200);
                        }
                    }
                }
            }
            animationFrameId = requestAnimationFrame(tick);
        };
        
        if (isScanning && hasCameraPermission) {
            animationFrameId = requestAnimationFrame(tick);
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [isScanning, hasCameraPermission]);
    
    if (!hasRole('technician')) {
        return <p>Acesso negado.</p>;
    }

    const handleRescan = () => {
        setScannedData(null);
        setIsScanning(true);
    };

    return (
        <div className="space-y-8">
             <div>
                <h1 className="text-3xl font-bold tracking-tight">Leitor de QR Code</h1>
                <p className="text-muted-foreground">Aponte a câmera para um QR Code para escaneá-lo.</p>
            </div>

            <Card className="max-w-xl mx-auto">
                <CardHeader>
                    <CardTitle>Scanner</CardTitle>
                    <CardDescription>
                        {scannedData ? 'QR Code escaneado com sucesso!' : 'Aguardando leitura do QR Code...'}
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
                                <p className="mt-4 font-semibold">Acesso à câmera negado</p>
                                <p className="text-sm text-muted-foreground">
                                    É necessário permitir o acesso à câmera para escanear QR Codes.
                                    Por favor, habilite a permissão nas configurações do seu navegador e atualize a página.
                                </p>
                            </div>
                        )}
                        {hasCameraPermission && (
                            <>
                                <video ref={videoRef} className="h-full w-full object-cover" autoPlay playsInline muted />
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
                                <AlertTitle>Dado Escaneado:</AlertTitle>
                                <AlertDescription className="break-all font-mono text-base">
                                    {scannedData}
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

