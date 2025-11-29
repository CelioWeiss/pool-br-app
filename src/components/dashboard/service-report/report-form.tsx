
"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud, X, CheckCircle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import type { Client, Appointment, ServiceReport, ServiceLocation } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFirestore, FirestorePermissionError, errorEmitter, useDoc } from "@/firebase";
import { writeBatch, doc, collection } from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';


const waterParameters = [
  { name: "Cloro", key: "chlorine", min: 0, max: 5, step: 0.1, defaultValue: 2.5, unit: "ppm" },
  { name: "pH", key: "ph", min: 6, max: 9, step: 0.1, defaultValue: 7.4, unit: "" },
  { name: "Alcalinidade", key: "alkalinity", min: 0, max: 200, step: 10, defaultValue: 100, unit: "ppm" },
  { name: "Ác. Cianúrico (CYA)", key: "cya", min: 0, max: 100, step: 5, defaultValue: 30, unit: "ppm" },
  { name: "Dureza Cálcica", key: "calciumHardness", min: 0, max: 500, step: 10, defaultValue: 250, unit: "ppm" },
  { name: "ORP", key: "orp", min: 0, max: 1000, step: 10, defaultValue: 650, unit: "mV" },
  { name: "TDS", key: "tds", min: 0, max: 3000, step: 100, defaultValue: 1500, unit: "ppm" },
  { name: "Temperatura", key: "temperature", min: 0, max: 40, step: 1, defaultValue: 25, unit: "°C" },
];

const servicesPerformedItems = [
    { id: "asp_filtrando", label: "Aspiração filtrando" },
    { id: "asp_drenando", label: "Aspiração drenando" },
    { id: "escovacao", label: "Escovação" },
    { id: "peneiracao", label: "Peneiração" },
    { id: "limpeza_bordas", label: "Limpeza de bordas" },
    { id: "limpeza_pre_filtro", label: "Limpeza pré-filtro" },
    { id: "retrolavagem_filtro", label: "Retrolavagem do elemento filtrante" },
    { id: "lavagem_filtro_poliester", label: "Lavagem filtro poliéster (Sistema Dry Pump IGUI)" },
];

const missingProductsItems = [
    { id: "cloro_granulado", label: "Cloro Granulado 10kg" },
    { id: "barrilha_leve", label: "Barrilha leve (elevador de pH)" },
    { id: "bicarbonato_sodio", label: "Bicarbonato de sódio (elevador de alcalinidade)" },
    { id: "clarificante", label: "Clarificante" },
    { id: "algicida_manutencao", label: "Algicida manutenção" },
    { id: "algicida_choque", label: "Algicida choque" },
    { id: "oxidante", label: "Oxidante" },
    { id: "gel_clarificante", label: "Gel clarificante" },
    { id: "eliminador_oleosidade", label: "Eliminador de oleosidade" },
    { id: "acido_cloridrico", label: "Ácido clorídrico (redutor de pH)" },
    { id: "sal_nao_iodado", label: "Sal não iodado" },
];


export function ServiceReportForm({ appointment, client, location }: { appointment: Appointment; client: Client, location: ServiceLocation }) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();

  const [previews, setPreviews] = useState<(string | null)[]>([null, null, null, null]);
  const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  
  const [parameters, setParameters] = useState<Record<string, number>>(() =>
    waterParameters.reduce((acc, p) => ({ ...acc, [p.key]: p.defaultValue }), {})
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const reportDocRef = useMemo(() => {
    if (!firestore || !appointment.franchiseId || !appointment.serviceReportId) return null;
    return doc(firestore, `franchises/${appointment.franchiseId}/serviceReports`, appointment.serviceReportId);
  }, [firestore, appointment]);

  const { data: existingReport, isLoading: isLoadingReport } = useDoc<ServiceReport>(reportDocRef);

  useEffect(() => {
    if(existingReport) {
        // Populate form with existing report data
        const paramKeys = Object.keys(parameters);
        const existingParams: Record<string, number> = {};
        for(const key of paramKeys) {
            if(existingReport.hasOwnProperty(key)) {
                existingParams[key] = (existingReport as any)[key];
            }
        }
        setParameters(existingParams);
        
        // This is a simplified way to handle populating checkboxes and text areas.
        // For photos, we just show them if they exist.
        setPreviews([...(existingReport.photoUrls || []), null, null, null, null].slice(0, 4));
    }
  }, [existingReport, parameters]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          variant: "destructive",
          title: "Arquivo muito grande",
          description: "Por favor, selecione uma imagem com menos de 5MB."
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPreviews = [...previews];
        newPreviews[index] = reader.result as string;
        setPreviews(newPreviews);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearPreview = (index: number) => {
    const newPreviews = [...previews];
    newPreviews[index] = null;
    setPreviews(newPreviews);
    if(fileInputRefs[index].current) {
        fileInputRefs[index].current.value = "";
    }
  }
  
  const handleParameterChange = (key: string, value: number[]) => {
      setParameters(prev => ({ ...prev, [key]: value[0] }));
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || existingReport) return;
    
    setIsSaving(true);
    const { franchiseId, clientId, technicianId, locationId } = appointment;

    try {
        const batch = writeBatch(firestore);
        
        const newReportId = uuidv4();
        const reportRef = doc(firestore, `franchises/${franchiseId}/serviceReports`, newReportId);

        const formData = new FormData(e.currentTarget);
        const photoUrls = previews.filter((p): p is string => p !== null);

        const newReportData: Omit<ServiceReport, 'id'> = {
            franchiseId,
            appointmentId: appointment.id,
            technicianId,
            clientId,
            locationId,
            chlorine: parameters['chlorine'],
            ph: parameters['ph'],
            alkalinity: parameters['alkalinity'],
            cya: parameters['cya'],
            calciumHardness: parameters['calciumHardness'],
            orp: parameters['orp'],
            tds: parameters['tds'],
            temperature: parameters['temperature'],
            servicesPerformed: formData.getAll('servicesPerformed') as string[],
            missingProducts: formData.getAll('missingProducts') as string[],
            observations: formData.get("observations") as string,
            photoUrls: photoUrls,
            createdAt: new Date().toISOString(),
        };
        
        batch.set(reportRef, { ...newReportData, id: newReportId });

        const appointmentRef = doc(firestore, `franchises/${franchiseId}/appointments`, appointment.id);
        batch.update(appointmentRef, {
            serviceReportId: reportRef.id,
            status: 'completed',
        });

        await batch.commit();

        setIsSuccess(true);
        toast({
            title: "Relatório Finalizado!",
            description: "O relatório de serviço foi salvo e o cliente será notificado.",
        });
        
        // Wait 2 seconds before redirecting to give user feedback
        setTimeout(() => router.push('/dashboard/schedule'), 2000);

    } catch (err: any) {
        console.error("Error submitting report:", err);
        const permissionError = new FirestorePermissionError({
          path: `franchises/${franchiseId}/serviceReports`,
          operation: 'create',
          requestResourceData: {}, // simplified for brevity
        });
        errorEmitter.emit('permission-error', permissionError);

        toast({
            variant: "destructive",
            title: "Erro ao Finalizar",
            description: err.message || "Ocorreu um erro ao finalizar o relatório.",
        });
    } finally {
        setIsSaving(false);
    }
  };


  if (isSuccess || (existingReport && !isSaving)) {
    // If the form was just submitted successfully OR a report already exists, show view-only mode
    const reportData = existingReport || null;
    const isFormDisabled = true; // Always disable if we are in view mode

    return (
        <div className="space-y-6">
            <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>{isSuccess ? 'Relatório Enviado com Sucesso!' : 'Visualizando Relatório Finalizado'}</AlertTitle>
                <AlertDescription>
                    {isSuccess ? 'Você será redirecionado para a agenda.' : 'Este atendimento já foi finalizado. As informações abaixo são somente para visualização.'}
                     <Button onClick={() => router.push('/dashboard/schedule')} className="mt-4 w-full">Voltar para a Agenda</Button>
                </AlertDescription>
            </Alert>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div className="space-y-6">
                  <Card>
                      <CardHeader>
                          <CardTitle>Parâmetros da Água</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                          {waterParameters.map(param => (
                              <div key={param.key} className="flex justify-between items-center">
                                  <Label htmlFor={param.key}>{param.name}</Label>
                                  <span className="text-sm font-bold text-primary">{reportData?.[param.key as keyof ServiceReport] as string || 'N/A'} {param.unit}</span>
                              </div>
                          ))}
                      </CardContent>
                  </Card>
                   <Card>
                      <CardHeader>
                          <CardTitle>Fotos do Atendimento</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                        {(reportData?.photoUrls?.length || 0) > 0 ? reportData?.photoUrls.map((url, index) => (
                           <a key={index} href={url} target="_blank" rel="noopener noreferrer">
                                <Image src={url} alt={`Foto ${index + 1}`} width={300} height={400} className="rounded-md object-cover aspect-[3/4] w-full" />
                           </a>
                        )) : (
                            <p className="text-sm text-muted-foreground col-span-2 text-center">Nenhuma foto foi enviada.</p>
                        )}
                      </CardContent>
                  </Card>
              </div>
              <div className="space-y-6">
                  <Card>
                      <CardHeader>
                          <CardTitle>Serviços Realizados</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-2">
                          {servicesPerformedItems.map(item => (
                              <div key={item.id} className="flex items-center space-x-2">
                                  <Checkbox id={`service-${item.id}`} checked={reportData?.servicesPerformed?.includes(item.label)} disabled={isFormDisabled} />
                                  <Label htmlFor={`service-${item.id}`} className="font-normal text-sm">{item.label}</Label>
                              </div>
                          ))}
                      </CardContent>
                  </Card>
                  <Card>
                      <CardHeader>
                          <CardTitle>Produtos Faltantes</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-2">
                          {missingProductsItems.map(item => (
                              <div key={item.id} className="flex items-center space-x-2">
                                  <Checkbox id={`product-${item.id}`} checked={reportData?.missingProducts?.includes(item.label)} disabled={isFormDisabled} />
                                  <Label htmlFor={`product-${item.id}`} className="font-normal text-sm">{item.label}</Label>
                              </div>
                          ))}
                      </CardContent>
                  </Card>
                   <Card>
                      <CardHeader>
                          <CardTitle>Observações</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <Textarea value={reportData?.observations || 'Nenhuma observação.'} disabled={isFormDisabled} rows={4} />
                      </CardContent>
                  </Card>
              </div>
            </div>
        </div>
    );
  }

  if (isLoadingReport) {
      return (
          <div className="flex h-64 items-center justify-center">
              <Spinner />
              <p className="ml-4">Carregando relatório existente...</p>
          </div>
      )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Parâmetros da Água</CardTitle>
                    <CardDescription>Ajuste os sliders para os valores medidos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                    {waterParameters.map(param => (
                        <div key={param.key} className="grid gap-2">
                            <div className="flex justify-between">
                                <Label htmlFor={param.key}>{param.name}</Label>
                                <span className="text-sm font-medium text-muted-foreground">{parameters[param.key]} {param.unit}</span>
                            </div>
                            <Slider
                                name={param.key}
                                min={param.min}
                                max={param.max}
                                step={param.step}
                                value={[parameters[param.key]]}
                                onValueChange={(value) => handleParameterChange(param.key, value)}
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Upload de Fotos</CardTitle>
                    <CardDescription>Anexe até 4 fotos do serviço (máx 5MB cada).</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    {[0, 1, 2, 3].map(index => (
                        <div key={index} className="space-y-2">
                          <Label htmlFor={`photo-${index}`} className="sr-only">Foto {index + 1}</Label>
                          {previews[index] ? (
                            <div className="relative">
                                <Image src={previews[index] as string} alt={`Preview ${index+1}`} width={300} height={400} className="rounded-md object-cover aspect-[3/4] w-full" />
                                <Button type="button" size="icon" variant="destructive" className="absolute top-2 right-2 h-6 w-6" onClick={() => clearPreview(index)}>
                                    <X size={14}/>
                                </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center w-full">
                                <Label htmlFor={`photo-${index}`} className="flex flex-col items-center justify-center w-full aspect-[3/4] border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-accent">
                                    <div className="flex flex-col items-center justify-center text-center p-2">
                                        <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                                        <p className="text-xs text-muted-foreground">Clique para enviar</p>
                                    </div>
                                    <Input id={`photo-${index}`} name={`photo-${index}`} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleFileChange(e, index)} ref={fileInputRefs[index]} />
                                </Label>
                            </div> 
                          )}
                        </div>
                    ))}
                </CardContent>
            </Card>

        </div>

        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Serviços Realizados</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    {servicesPerformedItems.map(item => (
                        <div key={item.id} className="flex items-center space-x-2">
                            <Checkbox id={`service-${item.id}`} name="servicesPerformed" value={item.label} />
                            <Label htmlFor={`service-${item.id}`} className="font-normal text-sm">{item.label}</Label>
                        </div>
                    ))}
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Produtos Faltantes</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    {missingProductsItems.map(item => (
                        <div key={item.id} className="flex items-center space-x-2">
                             <Checkbox id={`product-${item.id}`} name="missingProducts" value={item.label} />
                            <Label htmlFor={`product-${item.id}`} className="font-normal text-sm">{item.label}</Label>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Observações</CardTitle>
                </CardHeader>
                <CardContent>
                     <Textarea
                        id="observations"
                        name="observations"
                        placeholder="Alguma observação importante sobre o serviço ou a piscina..."
                        rows={4}
                    />
                </CardContent>
            </Card>
            
            <Button type="submit" disabled={isSaving || !!existingReport} className="w-full" size="lg">
                {isSaving ? <><Spinner size="small" className="mr-2"/> Finalizando...</> : "Finalizar Relatório"}
            </Button>
        </div>
      </div>
    </form>
  );
}

    